import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leadInteractions,
  whatsappAttributions,
} from "@/db/schema/communications";
import { destinations } from "@/db/schema/destinations";
import { experienceCategories } from "@/db/schema/experiences";
import { leadActivities, leads } from "@/db/schema/leads";
import { packages } from "@/db/schema/packages";
import { siteSettings } from "@/db/schema/cms";
import { getLeadTypeLabel } from "@/lib/lead-taxonomy";

export type WhatsAppContext =
  "homepage" | "destination" | "experience" | "package" | "other";

type VerifiedMetaReferral = {
  source: "meta_whatsapp_ad";
  metadata: Record<string, unknown>;
};

function requireDb() {
  if (!db) throw new Error("WhatsApp attribution requires the database.");
  return db;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15)
    throw new Error("WhatsApp phone number must use international format.");
  return `+${digits}`;
}

function phoneIdentityCondition(phone: string) {
  const digits = phone.slice(1);
  return or(
    eq(leads.phone, phone),
    eq(leads.phone, digits),
    sql`replace(replace(replace(replace(${leads.phone}, ' ', ''), '-', ''), '(', ''), ')', '') in (${phone}, ${digits})`,
  );
}

async function businessWhatsAppDigits() {
  let raw = process.env["WHATSAPP_PHONE_NUMBER"]?.trim();
  if (!raw) {
    const [setting] = await requireDb()
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, "company.profile"))
      .limit(1);
    try {
      const profile = JSON.parse(setting?.value || "{}") as Record<
        string,
        unknown
      >;
      raw = typeof profile["whatsapp"] === "string" ? profile["whatsapp"] : "";
    } catch {
      raw = "";
    }
  }
  return normalizeWhatsAppPhone(raw).slice(1);
}

async function resolveContext(context: WhatsAppContext, slug?: string) {
  const database = requireDb();
  if (context === "homepage" || context === "other") {
    if (slug) throw new Error("This WhatsApp context does not accept a slug.");
    return {
      contextName: "planning a trip to Nepal",
      destinationId: null,
      experienceId: null,
      packageId: null,
    };
  }
  if (!slug) throw new Error("A published content slug is required.");
  if (context === "destination") {
    const [row] = await database
      .select({ id: destinations.id, name: destinations.name })
      .from(destinations)
      .where(and(eq(destinations.slug, slug), eq(destinations.status, true)))
      .limit(1);
    if (!row) throw new Error("Published destination not found.");
    return {
      contextName: row.name,
      destinationId: row.id,
      experienceId: null,
      packageId: null,
    };
  }
  if (context === "experience") {
    const [row] = await database
      .select({ id: experienceCategories.id, name: experienceCategories.name })
      .from(experienceCategories)
      .where(
        and(
          eq(experienceCategories.slug, slug),
          eq(experienceCategories.status, true),
        ),
      )
      .limit(1);
    if (!row) throw new Error("Published experience not found.");
    return {
      contextName: row.name,
      destinationId: null,
      experienceId: row.id,
      packageId: null,
    };
  }
  const [row] = await database
    .select({ id: packages.id, title: packages.title })
    .from(packages)
    .where(and(eq(packages.slug, slug), eq(packages.status, true)))
    .limit(1);
  if (!row) throw new Error("Published package not found.");
  return {
    contextName: row.title,
    destinationId: null,
    experienceId: null,
    packageId: row.id,
  };
}

function naturalMessage(context: WhatsAppContext, name: string) {
  if (context === "destination")
    return `Hi Nepal Heaven! I'm interested in ${name}.`;
  if (context === "experience")
    return `Hi Nepal Heaven! I'm interested in ${name} experiences.`;
  if (context === "package")
    return `Hi Nepal Heaven! I'm interested in the ${name}.`;
  return "Hi Nepal Heaven! I'm interested in planning a trip to Nepal.";
}

export async function createWebsiteWhatsAppAttribution(input: {
  context: WhatsAppContext;
  slug?: string | undefined;
}) {
  const database = requireDb();
  const resolved = await resolveContext(input.context, input.slug);
  const token = randomBytes(9).toString("base64url");
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await database.insert(whatsappAttributions).values({
    id,
    tokenHash: hashToken(token),
    source: "website_whatsapp",
    contextType: input.context,
    contextSlug: input.slug ?? null,
    destinationId: resolved.destinationId,
    experienceId: resolved.experienceId,
    packageId: resolved.packageId,
    status: "pending",
    expiresAt,
    metadata: JSON.stringify({ contextName: resolved.contextName }),
  });
  const message = `${naturalMessage(input.context, resolved.contextName)}\n[NH-WEB:${token}]`;
  const recipient = await businessWhatsAppDigits();
  return {
    attributionId: id,
    token,
    contextName: resolved.contextName,
    message,
    url: `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`,
    expiresAt,
  };
}

function markerToken(message: string) {
  return message.match(/\[NH-WEB:([A-Za-z0-9_-]{12})\]/)?.[1] ?? null;
}

export async function processInboundWhatsAppMessage(
  input: { senderPhone: string; body: string; profileName?: string },
  verifiedMetaReferral?: VerifiedMetaReferral,
) {
  const database = requireDb();
  const phone = normalizeWhatsAppPhone(input.senderPhone);
  const body = input.body.trim();
  if (!body || body.length > 5000)
    throw new Error("WhatsApp message body is invalid.");
  const token = markerToken(body);
  const now = new Date();
  let attribution: typeof whatsappAttributions.$inferSelect | undefined;
  if (token) {
    [attribution] = await database
      .select()
      .from(whatsappAttributions)
      .where(
        and(
          eq(whatsappAttributions.tokenHash, hashToken(token)),
          eq(whatsappAttributions.status, "pending"),
          gt(whatsappAttributions.expiresAt, now),
        ),
      )
      .limit(1);
  }
  const verifiedSource = attribution?.source ?? verifiedMetaReferral?.source;
  if (verifiedSource) {
    return database.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(leads)
        .where(phoneIdentityCondition(phone))
        .limit(1);
      const leadId = existing?.id ?? randomUUID();
      const contextType = attribution?.contextType ?? "other";
      const contextSlug = attribution?.contextSlug ?? null;
      if (existing) {
        await transaction
          .update(leads)
          .set({
            type: "whatsapp_inquiry",
            leadLevel: 5,
            source: verifiedSource,
            phone,
            destinationId: attribution?.destinationId ?? existing.destinationId,
            experienceId: attribution?.experienceId ?? existing.experienceId,
            packageId: attribution?.packageId ?? existing.packageId,
            message: body,
            updatedAt: now,
          })
          .where(eq(leads.id, leadId));
      } else {
        await transaction.insert(leads).values({
          id: leadId,
          type: "whatsapp_inquiry",
          leadLevel: 5,
          source: verifiedSource,
          name: input.profileName?.trim().slice(0, 120) || "WhatsApp contact",
          email: null,
          phone,
          destinationId: attribution?.destinationId ?? null,
          experienceId: attribution?.experienceId ?? null,
          packageId: attribution?.packageId ?? null,
          message: body,
          status: "new",
        });
      }
      const metadata = {
        acquisitionSource: verifiedSource,
        leadTypeLabel: getLeadTypeLabel(5),
        attributionId: attribution?.id ?? null,
        verifiedMetaReferral: verifiedMetaReferral?.metadata ?? null,
      };
      await transaction.insert(leadInteractions).values({
        id: randomUUID(),
        leadId,
        channel: "whatsapp",
        direction: "inbound",
        interactionType: "whatsapp_message",
        body,
        fromAddress: phone,
        deliveryStatus: "received",
        acquisitionSource: verifiedSource,
        contextType,
        contextSlug,
        automaticLead: true,
        metadata: JSON.stringify(metadata),
      });
      await transaction.insert(leadActivities).values({
        leadId,
        type: existing ? "whatsapp_interaction_added" : "lead_created",
        description: "Verified attributed WhatsApp message received.",
        metadata: JSON.stringify(metadata),
      });
      if (attribution)
        await transaction
          .update(whatsappAttributions)
          .set({ status: "matched", matchedAt: now, matchedLeadId: leadId })
          .where(eq(whatsappAttributions.id, attribution.id));
      return {
        automaticLead: true as const,
        leadId,
        attributionId: attribution?.id ?? null,
      };
    });
  }

  const [knownWhatsAppLead] = await database
    .select({ id: leads.id, source: leads.source })
    .from(leads)
    .where(
      and(
        phoneIdentityCondition(phone),
        eq(leads.leadLevel, 5),
        eq(leads.type, "whatsapp_inquiry"),
      ),
    )
    .limit(1);
  const leadId = knownWhatsAppLead?.id ?? null;
  await database.insert(leadInteractions).values({
    id: randomUUID(),
    leadId,
    channel: "whatsapp",
    direction: "inbound",
    interactionType: "whatsapp_message",
    body,
    fromAddress: phone,
    deliveryStatus: "received",
    acquisitionSource: leadId ? knownWhatsAppLead?.source : "unclassified",
    automaticLead: false,
    metadata: JSON.stringify({
      acquisitionSource: leadId ? knownWhatsAppLead?.source : "unclassified",
      automaticLead: false,
    }),
  });
  return { automaticLead: false as const, leadId, attributionId: null };
}
