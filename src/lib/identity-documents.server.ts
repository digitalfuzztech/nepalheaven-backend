import { createHash } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { userIdentityDocuments } from "@/db/schema/identity-documents";
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

export function isIdentityAuthorizationError(
  error: unknown,
): error is IdentityAuthorizationError {
  return error instanceof IdentityAuthorizationError;
}
