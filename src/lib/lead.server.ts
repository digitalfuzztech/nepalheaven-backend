import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { destinations } from "@/db/schema/destinations";
import { experienceCategories } from "@/db/schema/experiences";
import { leadActivities, leads } from "@/db/schema/leads";
import {
  leadInteractions,
  newsletterSubscribers,
} from "@/db/schema/communications";
import { packages } from "@/db/schema/packages";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import {
  leadSummaryVariables,
  sendAndRecordLeadEmail,
} from "@/lib/communication.server";
import { getLeadSourceLabel, getLeadTypeLabel } from "@/lib/lead-taxonomy";
import { getMailRouting } from "@/lib/mail-routing.server";

const SESSION_COOKIE = "nepalheaven_session";

type LeadType = typeof leads.$inferInsert.type;
export type CreateLeadInput = {
  type: LeadType;
  leadLevel: 1 | 2 | 3 | 4 | 5;
  name: string;
  email: string;
  phone?: string | undefined;
  travelDate?: string | undefined;
  preferredEndDate?: string | undefined;
  travellers?: number | undefined;
  interestedIn?: string | undefined;
  message?: string | undefined;
  source: string;
  marketingOptIn?: boolean | undefined;
  packageSlug?: string | undefined;
  destinationSlug?: string | undefined;
  experienceSlug?: string | undefined;
};

class PublicLeadInputError extends Error {}
function requireDb() {
  if (!db)
    throw new Error(
      "Lead storage is unavailable because the database is not configured.",
    );
  return db;
}
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function readSessionToken() {
  let cookie: string | undefined;
  try {
    cookie = getRequestHeader("cookie");
  } catch {
    return null;
  }
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator) === SESSION_COOKIE)
      return part.slice(separator + 1);
  }
  return null;
}
type LeadTransaction = Parameters<
  Parameters<NonNullable<typeof db>["transaction"]>[0]
>[0];

async function authenticatedCustomerId(transaction: LeadTransaction) {
  const token = readSessionToken();
  if (!token) return null;
  const [row] = await transaction
    .select({ userId: users.id, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row?.role === "customer" ? row.userId : null;
}
function subscriberSource(
  source: string,
): typeof newsletterSubscribers.$inferInsert.source {
  if (
    ["homepage", "footer", "contact", "destination", "experience"].includes(
      source,
    )
  )
    return source as typeof newsletterSubscribers.$inferInsert.source;
  return "other";
}

export async function createPublicLead(input: CreateLeadInput) {
  const database = requireDb();
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const result = await database.transaction(async (transaction) => {
    const userId = await authenticatedCustomerId(transaction);
    let packageId: string | null = null,
      packageTitle: string | null = null;
    let destinationId: string | null = null,
      destinationName: string | null = null;
    let experienceId: string | null = null,
      experienceName: string | null = null;
    if (input.packageSlug) {
      const [row] = await transaction
        .select({ id: packages.id, title: packages.title })
        .from(packages)
        .where(
          and(eq(packages.slug, input.packageSlug), eq(packages.status, true)),
        )
        .limit(1);
      if (!row)
        throw new PublicLeadInputError(
          "The selected package is no longer available.",
        );
      packageId = row.id;
      packageTitle = row.title;
    }
    if (input.destinationSlug) {
      const [row] = await transaction
        .select({ id: destinations.id, name: destinations.name })
        .from(destinations)
        .where(
          and(
            eq(destinations.slug, input.destinationSlug),
            eq(destinations.status, true),
          ),
        )
        .limit(1);
      if (!row)
        throw new PublicLeadInputError(
          "The selected destination is no longer available.",
        );
      destinationId = row.id;
      destinationName = row.name;
    }
    if (input.experienceSlug) {
      const [row] = await transaction
        .select({
          id: experienceCategories.id,
          name: experienceCategories.name,
        })
        .from(experienceCategories)
        .where(
          and(
            eq(experienceCategories.slug, input.experienceSlug),
            eq(experienceCategories.status, true),
          ),
        )
        .limit(1);
      if (!row)
        throw new PublicLeadInputError(
          "The selected experience is no longer available.",
        );
      experienceId = row.id;
      experienceName = row.name;
    }
    const identity = userId
      ? or(eq(leads.userId, userId), eq(leads.email, email))
      : eq(leads.email, email);
    const [existing] = await transaction
      .select()
      .from(leads)
      .where(identity)
      .limit(1);
    const leadId = existing?.id ?? randomUUID();
    const isNewsletter = input.type === "newsletter_subscriber";
    const update = {
      userId: userId ?? existing?.userId ?? null,
      packageId: packageId ?? existing?.packageId ?? null,
      destinationId: destinationId ?? existing?.destinationId ?? null,
      experienceId: experienceId ?? existing?.experienceId ?? null,
      type: isNewsletter && existing ? existing.type : input.type,
      leadLevel:
        isNewsletter && existing?.leadLevel
          ? existing.leadLevel
          : input.leadLevel,
      name: isNewsletter && existing ? existing.name : input.name.trim(),
      email,
      phone: input.phone?.trim() || existing?.phone || null,
      travelDate: input.travelDate || null,
      preferredStartDate: input.travelDate || null,
      preferredEndDate: input.preferredEndDate || null,
      travellers: input.travellers ?? null,
      interestedIn:
        input.interestedIn ||
        packageTitle ||
        destinationName ||
        experienceName ||
        null,
      message: input.message?.trim() || null,
      source: isNewsletter && existing ? existing.source : input.source,
      marketingOptIn: input.marketingOptIn
        ? true
        : (existing?.marketingOptIn ?? false),
      marketingConsentSource: input.marketingOptIn
        ? input.source
        : (existing?.marketingConsentSource ?? null),
      marketingOptedInAt: input.marketingOptIn
        ? now
        : (existing?.marketingOptedInAt ?? null),
      marketingOptOutAt: input.marketingOptIn
        ? null
        : (existing?.marketingOptOutAt ?? null),
      status: existing?.status ?? ("new" as const),
      updatedAt: now,
    };
    if (existing)
      await transaction.update(leads).set(update).where(eq(leads.id, leadId));
    else await transaction.insert(leads).values({ id: leadId, ...update });

    let unsubscribeToken: string | null = null;
    let alreadySubscribed = false;
    let subscriptionEvent: "none" | "new" | "existing" | "reactivated" = "none";
    if (input.marketingOptIn) {
      const [subscriber] = await transaction
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email))
        .limit(1);
      alreadySubscribed = subscriber?.status === "active";
      subscriptionEvent = alreadySubscribed
        ? "existing"
        : subscriber
          ? "reactivated"
          : "new";
      if (!alreadySubscribed) {
        unsubscribeToken = randomBytes(32).toString("base64url");
        const values = {
          email,
          userId,
          status: "active" as const,
          source: subscriberSource(input.source),
          unsubscribeTokenHash: hashToken(unsubscribeToken),
          consentedAt: now,
          unsubscribedAt: null,
          updatedAt: now,
        };
        if (subscriber)
          await transaction
            .update(newsletterSubscribers)
            .set(values)
            .where(eq(newsletterSubscribers.id, subscriber.id));
        else
          await transaction
            .insert(newsletterSubscribers)
            .values({ id: randomUUID(), ...values });
      }
    }
    const metadata = {
      source: input.source,
      leadType: input.type,
      leadLevel: input.leadLevel,
      leadTypeLabel: getLeadTypeLabel(input.leadLevel),
      sourceLabel: getLeadSourceLabel(input.source),
      packageId,
      packageTitle,
      destinationId,
      destinationName,
      experienceId,
      experienceName,
      travelDate: input.travelDate ?? null,
      preferredEndDate: input.preferredEndDate ?? null,
      travellers: input.travellers ?? null,
      interestedIn: input.interestedIn ?? null,
      marketingOptIn: Boolean(input.marketingOptIn),
    };
    await transaction.insert(leadInteractions).values({
      id: randomUUID(),
      leadId,
      channel: "web",
      direction: "inbound",
      interactionType:
        input.type === "newsletter_subscriber"
          ? "newsletter_subscription"
          : input.type,
      body:
        input.message?.trim() ||
        `Newsletter subscription from ${input.source}.`,
      fromAddress: email,
      deliveryStatus: "received",
      metadata: JSON.stringify(metadata),
    });
    await transaction.insert(leadActivities).values({
      leadId,
      userId,
      type: existing ? "lead_interaction_added" : "lead_created",
      description: "Public website interaction persisted.",
      metadata: JSON.stringify(metadata),
    });
    return {
      leadId,
      userId,
      email,
      fullName: update.name,
      packageId,
      packageTitle,
      destinationId,
      destinationName,
      experienceId,
      experienceName,
      alreadySubscribed,
      unsubscribeToken,
      subscriptionEvent,
      subscribedAt: now,
    };
  });
  await sendLeadEmails(input, result);
  return {
    id: result.leadId,
    userId: result.userId,
    packageId: result.packageId,
    alreadySubscribed: result.alreadySubscribed,
    unsubscribeToken: result.unsubscribeToken,
  };
}

async function sendLeadEmails(
  input: CreateLeadInput,
  result: Awaited<ReturnType<typeof persistedShape>>,
) {
  const { getAppUrl } = await import("@/lib/app-url.server");
  const siteUrl = getAppUrl();
  const summary = leadSummaryVariables({
    leadId: result.leadId,
    leadLevel: input.leadLevel,
    source: input.source,
    fullName: result.fullName,
    email: result.email,
    phone: input.phone ?? null,
    travellers: input.travellers ?? null,
    interestedIn:
      input.interestedIn ||
      result.packageTitle ||
      result.destinationName ||
      result.experienceName,
    preferredDate: input.travelDate ?? null,
    message: input.message ?? null,
    destinationName: result.destinationName,
    experienceName: result.experienceName,
  });
  const variables = {
    ...summary,
    fullName: result.fullName,
    email: result.email,
    phone: input.phone || "Not provided",
    travellers: input.travellers ?? "Not provided",
    interestedIn:
      input.interestedIn ||
      result.packageTitle ||
      result.destinationName ||
      result.experienceName ||
      "Not specified",
    preferredDate: input.travelDate || "dates to be confirmed",
    preferredDates: input.travelDate || "Not specified",
    destinationName: result.destinationName || "Nepal",
    experienceName: result.experienceName || "Nepal",
    message: input.message || "",
    reference: result.leadId,
    siteUrl,
    unsubscribeUrl: result.unsubscribeToken
      ? `${siteUrl}/unsubscribe?token=${encodeURIComponent(result.unsubscribeToken)}`
      : "",
    subscriptionSource: getLeadSourceLabel(input.source),
    subscribedAt: result.subscribedAt.toISOString(),
    emailLeadEvent:
      result.subscriptionEvent === "reactivated" ? "Reactivated" : "New",
  };
  const mailRouting = getMailRouting();
  if (input.type === "newsletter_subscriber") {
    if (!result.alreadySubscribed) {
      await Promise.all([
        sendAndRecordLeadEmail({
          leadId: result.leadId,
          interactionType: "newsletter_subscription",
          templateKey: "newsletter_subscription_confirmation",
          to: result.email,
          variables,
        }),
        sendAndRecordLeadEmail({
          leadId: result.leadId,
          interactionType: "admin_notification",
          templateKey: "newsletter_admin_notification",
          to: mailRouting.general.internalRecipient,
          variables,
          replyTo: result.email,
        }),
      ]);
    }
    return;
  }
  const prefix =
    input.type === "destination_inquiry"
      ? "destination"
      : input.type === "experience_inquiry"
        ? "experience"
        : input.type === "itinerary_request"
          ? "itinerary"
          : "contact";
  const internalRecipient =
    prefix === "destination" ||
    prefix === "experience" ||
    prefix === "itinerary"
      ? mailRouting.journeys.internalRecipient
      : mailRouting.general.internalRecipient;
  await Promise.all([
    sendAndRecordLeadEmail({
      leadId: result.leadId,
      interactionType: "auto_acknowledgment",
      templateKey: `${prefix}_customer_acknowledgment`,
      to: result.email,
      variables,
    }),
    sendAndRecordLeadEmail({
      leadId: result.leadId,
      interactionType: "admin_notification",
      templateKey: `${prefix}_admin_notification`,
      to: internalRecipient,
      variables,
      replyTo: result.email,
    }),
  ]);
}
function persistedShape() {
  return null as unknown as {
    leadId: string;
    userId: string | null;
    email: string;
    fullName: string;
    packageId: string | null;
    packageTitle: string | null;
    destinationId: string | null;
    destinationName: string | null;
    experienceId: string | null;
    experienceName: string | null;
    alreadySubscribed: boolean;
    unsubscribeToken: string | null;
    subscriptionEvent: "none" | "new" | "existing" | "reactivated";
    subscribedAt: Date;
  };
}

export async function unsubscribeByToken(token: string) {
  const database = requireDb();
  const now = new Date();
  const [subscriber] = await database
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeTokenHash, hashToken(token)))
    .limit(1);
  if (!subscriber) return false;
  await database.transaction(async (transaction) => {
    await transaction
      .update(newsletterSubscribers)
      .set({ status: "unsubscribed", unsubscribedAt: now, updatedAt: now })
      .where(eq(newsletterSubscribers.id, subscriber.id));
    await transaction
      .update(leads)
      .set({ marketingOptIn: false, marketingOptOutAt: now, updatedAt: now })
      .where(eq(leads.email, subscriber.email));
  });
  return true;
}
export function isPublicLeadInputError(
  error: unknown,
): error is PublicLeadInputError {
  return error instanceof PublicLeadInputError;
}
