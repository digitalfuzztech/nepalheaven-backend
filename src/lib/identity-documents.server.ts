import { createHash } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { bookings } from "@/db/schema/bookings";
import {
  bookingIdentityDocuments,
  userIdentityDocuments,
} from "@/db/schema/identity-documents";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { readPrivateIdentityDocument } from "@/lib/private-document-storage.server";

class IdentityAuthorizationError extends Error {}

function sessionToken() {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) {
    const separator = part.indexOf("=");
    if (part.slice(0, separator) === "nepalheaven_session")
      return decodeURIComponent(part.slice(separator + 1));
  }
  return null;
}

async function requireActor() {
  if (!db) throw new Error("Database is not configured.");
  const token = sessionToken();
  if (!token) throw new IdentityAuthorizationError("Authentication required.");
  const [actor] = await db
    .select({ userId: users.id, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(
          sessions.tokenHash,
          createHash("sha256").update(token).digest("hex"),
        ),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!actor) throw new IdentityAuthorizationError("Authentication required.");
  return actor;
}

const metadataSelection = {
  id: userIdentityDocuments.id,
  documentType: userIdentityDocuments.documentType,
  originalFilename: userIdentityDocuments.originalFilename,
  mimeType: userIdentityDocuments.mimeType,
  fileSize: userIdentityDocuments.fileSize,
  verificationStatus: userIdentityDocuments.verificationStatus,
  createdAt: userIdentityDocuments.createdAt,
};

export async function getMyIdentityDocuments() {
  if (!db) throw new Error("Database is not configured.");
  const actor = await requireActor();
  if (actor.role !== "customer")
    throw new IdentityAuthorizationError("Customer access required.");
  const rows = await db
    .select(metadataSelection)
    .from(userIdentityDocuments)
    .where(eq(userIdentityDocuments.userId, actor.userId))
    .orderBy(desc(userIdentityDocuments.createdAt));
  return rows.map((row) => ({
    ...row,
    createdDate: row.createdAt.toISOString(),
    createdAt: undefined,
  }));
}

export async function downloadAuthorizedIdentityDocument(documentId: string) {
  if (!db) throw new Error("Database is not configured.");
  const actor = await requireActor();
  const ownership =
    actor.role === "admin"
      ? eq(userIdentityDocuments.id, documentId)
      : and(
          eq(userIdentityDocuments.id, documentId),
          eq(userIdentityDocuments.userId, actor.userId),
        );
  const [document] = await db
    .select({
      storageKey: userIdentityDocuments.storageKey,
      originalFilename: userIdentityDocuments.originalFilename,
      mimeType: userIdentityDocuments.mimeType,
    })
    .from(userIdentityDocuments)
    .where(ownership)
    .limit(1);
  if (!document)
    throw new IdentityAuthorizationError("Identity document not found.");
  const bytes = await readPrivateIdentityDocument(document.storageKey);
  return {
    filename: document.originalFilename,
    mimeType: document.mimeType,
    base64: bytes.toString("base64"),
  };
}

export async function downloadAuthorizedBookingIdentityDocument(
  documentId: string,
) {
  if (!db) throw new Error("Database is not configured.");
  const actor = await requireActor();
  const conditions =
    actor.role === "admin"
      ? eq(bookingIdentityDocuments.id, documentId)
      : and(
          eq(bookingIdentityDocuments.id, documentId),
          eq(bookingIdentityDocuments.userId, actor.userId),
          eq(bookings.userId, actor.userId),
          eq(bookingIdentityDocuments.verificationStatus, "verified"),
        );
  const [document] = await db
    .select({
      storageKey: bookingIdentityDocuments.storageKey,
      originalFilename: bookingIdentityDocuments.originalFilename,
      mimeType: bookingIdentityDocuments.mimeType,
    })
    .from(bookingIdentityDocuments)
    .innerJoin(bookings, eq(bookingIdentityDocuments.bookingId, bookings.id))
    .where(conditions)
    .limit(1);
  if (!document)
    throw new IdentityAuthorizationError("Identity document not found.");
  const bytes = await readPrivateIdentityDocument(document.storageKey);
  return {
    filename: document.originalFilename,
    mimeType: document.mimeType,
    base64: bytes.toString("base64"),
  };
}

export async function setBookingIdentityDocumentVerificationStatus(
  documentId: string,
  status: "verified" | "rejected",
) {
  if (!db) throw new Error("Database is not configured.");
  const actor = await requireActor();
  if (actor.role !== "admin")
    throw new IdentityAuthorizationError("Administrator access required.");
  const [existing] = await db
    .select({ id: bookingIdentityDocuments.id })
    .from(bookingIdentityDocuments)
    .where(eq(bookingIdentityDocuments.id, documentId))
    .limit(1);
  if (!existing)
    throw new IdentityAuthorizationError("Identity document not found.");
  await db
    .update(bookingIdentityDocuments)
    .set({ verificationStatus: status, updatedAt: new Date() })
    .where(eq(bookingIdentityDocuments.id, documentId));
  return { id: documentId, verificationStatus: status };
}

export function isIdentityAuthorizationError(
  error: unknown,
): error is IdentityAuthorizationError {
  return error instanceof IdentityAuthorizationError;
}
