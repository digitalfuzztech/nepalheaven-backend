import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import {
  deleteProfilePhoto,
  ProfilePhotoValidationError,
  readProfilePhoto,
  storeProfilePhoto,
} from "@/lib/profile-photo-storage.server";

const PREFIX = "private-avatar:";
export class ProfileAuthorizationError extends Error {}
export class PublicProfileError extends Error {}

function token() {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) {
    const index = part.indexOf("=");
    if (part.slice(0, index) === "nepalheaven_session")
      return decodeURIComponent(part.slice(index + 1));
  }
  return null;
}

async function customerId() {
  if (!db) throw new Error("Database is not configured.");
  const value = token();
  if (!value) throw new ProfileAuthorizationError("Authentication required.");
  const [actor] = await db
    .select({ id: users.id, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(
          sessions.tokenHash,
          createHash("sha256").update(value).digest("hex"),
        ),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!actor || actor.role !== "customer")
    throw new ProfileAuthorizationError("Customer access required.");
  return actor.id;
}

function privateKey(value: string | null) {
  return value?.startsWith(PREFIX) ? value.slice(PREFIX.length) : null;
}

function mimeFromKey(key: string) {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function getMyProfilePhoto() {
  if (!db) throw new Error("Database is not configured.");
  const id = await customerId();
  const [row] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  const key = privateKey(row?.avatarUrl ?? null);
  if (key) {
    const bytes = await readProfilePhoto(key);
    return {
      dataUrl: `data:${mimeFromKey(key)};base64,${bytes.toString("base64")}`,
    };
  }
  return row?.avatarUrl && /^https:\/\//i.test(row.avatarUrl)
    ? { dataUrl: row.avatarUrl }
    : { dataUrl: null };
}

export async function uploadMyProfilePhoto(file: File) {
  if (!db) throw new Error("Database is not configured.");
  let stored: Awaited<ReturnType<typeof storeProfilePhoto>>;
  try {
    stored = await storeProfilePhoto(file);
  } catch (error) {
    if (error instanceof ProfilePhotoValidationError)
      throw new PublicProfileError(error.message);
    throw error;
  }
  let oldKey: string | null = null;
  try {
    const id = await customerId();
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      oldKey = privateKey(current?.avatarUrl ?? null);
      await tx
        .update(users)
        .set({
          avatarUrl: `${PREFIX}${stored.storageKey}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    });
  } catch (error) {
    await deleteProfilePhoto(stored.storageKey);
    throw error;
  }
  if (oldKey) await deleteProfilePhoto(oldKey);
  return { ok: true as const };
}

export async function removeMyProfilePhoto() {
  if (!db) throw new Error("Database is not configured.");
  const id = await customerId();
  let oldKey: string | null = null;
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    oldKey = privateKey(current?.avatarUrl ?? null);
    await tx
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, id));
  });
  if (oldKey) await deleteProfilePhoto(oldKey);
  return { ok: true as const };
}

export function isProfileAuthorizationError(
  error: unknown,
): error is ProfileAuthorizationError {
  return error instanceof ProfileAuthorizationError;
}
export function isPublicProfileError(
  error: unknown,
): error is PublicProfileError {
  return error instanceof PublicProfileError;
}
