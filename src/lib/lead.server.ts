import { createHash, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { destinations } from "@/db/schema/destinations";
import { leadActivities, leads } from "@/db/schema/leads";
import { packages } from "@/db/schema/packages";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";

const SESSION_COOKIE = "nepalheaven_session";

type LeadType = typeof leads.$inferInsert.type;

export type CreateLeadInput = {
  type: LeadType;
  name: string;
  email: string;
  phone?: string | undefined;
  travelDate?: string | undefined;
  travellers?: number | undefined;
  message?: string | undefined;
  source: string;
  packageSlug?: string | undefined;
  destinationSlug?: string | undefined;
};

class PublicLeadInputError extends Error {}

function requireDb() {
  if (!db)
    throw new Error(
      "Lead storage is unavailable because the database is not configured.",
    );
  return db;
}

function readSessionToken() {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator) === SESSION_COOKIE)
      return part.slice(separator + 1);
  }
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getAuthenticatedCustomerId(
  transaction: Parameters<
    Parameters<NonNullable<typeof db>["transaction"]>[0]
  >[0],
) {
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

function parseTravelDate(value: string | undefined) {
  return value ?? null;
}

export async function createPublicLead(input: CreateLeadInput) {
  const database = requireDb();

  return database.transaction(async (transaction) => {
    const userId = await getAuthenticatedCustomerId(transaction);
    let packageId: string | null = null;
    let packageTitle: string | null = null;
    let destinationName: string | null = null;

    if (input.packageSlug) {
      const [packageRow] = await transaction
        .select({ id: packages.id, title: packages.title })
        .from(packages)
        .where(
          and(eq(packages.slug, input.packageSlug), eq(packages.status, true)),
        )
        .limit(1);
      if (!packageRow)
        throw new PublicLeadInputError(
          "The selected package is no longer available.",
        );
      packageId = packageRow.id;
      packageTitle = packageRow.title;
    }

    if (input.destinationSlug) {
      const [destination] = await transaction
        .select({ name: destinations.name })
        .from(destinations)
        .where(
          and(
            eq(destinations.slug, input.destinationSlug),
            eq(destinations.status, true),
          ),
        )
        .limit(1);
      if (!destination)
        throw new PublicLeadInputError(
          "The selected destination is no longer available.",
        );
      destinationName = destination.name;
    }

    const message = input.message?.trim() || null;

    const leadId = randomUUID();
    await transaction.insert(leads).values({
      id: leadId,
      userId,
      packageId,
      type: input.type,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      travelDate: parseTravelDate(input.travelDate),
      travellers: input.travellers ?? null,
      message,
      source: input.source,
      status: "new",
    });

    await transaction.insert(leadActivities).values({
      leadId,
      userId,
      type: "lead_created",
      description: "Lead created from the public website.",
      metadata: JSON.stringify({
        source: input.source,
        leadType: input.type,
        ...(input.packageSlug ? { packageSlug: input.packageSlug } : {}),
        ...(packageTitle ? { package: packageTitle } : {}),
        ...(input.destinationSlug
          ? { destinationSlug: input.destinationSlug }
          : {}),
        ...(destinationName ? { destination: destinationName } : {}),
      }),
    });

    return { id: leadId, userId, packageId };
  });
}

export function isPublicLeadInputError(
  error: unknown,
): error is PublicLeadInputError {
  return error instanceof PublicLeadInputError;
}
