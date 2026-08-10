import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { eq, and, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { sessions } from "@/db/schema/sessions";
import { passwordResetTokens } from "@/db/schema/password-reset-tokens";
import { isCountryCode } from "@/lib/countries";

const SESSION_COOKIE = "nepalheaven_session";
const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  expectedRole: z.enum(["admin", "customer"]).optional(),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  phone: z.string().trim().min(7).max(30).regex(/^\+?[0-9][0-9 ()-]{5,28}[0-9]$/),
  country: z.string().trim().max(100).optional(),
  nationality: z.string().trim().length(2).transform((value) => value.toUpperCase()).refine(isCountryCode),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day));
    return year! >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day && date <= new Date();
  }),
});

function requireDb() {
  if (!db) throw new Error("Database is not configured. Check DATABASE_URL in .env.");
  return db;
}


async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 })) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(stored: string, password: string) {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const derived = (await scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1 })) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  setResponseHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  setResponseHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  );
}

function readSessionToken() {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === SESSION_COOKIE) return part.slice(eq + 1);
  }
  return null;
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? undefined,
    country: user.country ?? undefined,
    nationality: user.nationality ?? undefined,
    dateOfBirth: user.dateOfBirth ?? undefined,
  };
}

async function revokeUserSessions(userId: string) {
  const database = requireDb();
  await database.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

async function createSession(userId: string) {
  const database = requireDb();
  const token = randomBytes(32).toString("base64url");
  await database.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
  });
  setSessionCookie(token);
  return token;
}

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const database = requireDb();
    const email = data.email.toLowerCase();
    const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) return { ok: false as const, message: "The email or password is incorrect." };

    const passwordMatches = await verifyPassword(user.passwordHash, data.password);
    if (!passwordMatches) return { ok: false as const, message: "The email or password is incorrect." };

    if (data.expectedRole && user.role !== data.expectedRole) {
      return {
        ok: false as const,
        message: data.expectedRole === "admin"
          ? "This account does not have administrator access."
          : "Administrator accounts must sign in through /admin.",
      };
    }

    await revokeUserSessions(user.id);
    await createSession(user.id);
    return { ok: true as const, user: publicUser(user) };
  });

export const registerFn = createServerFn({ method: "POST" })
  .validator(registerSchema)
  .handler(async ({ data }) => {
    const database = requireDb();
    const email = data.email.toLowerCase();
    const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return { ok: false as const, message: "An account with this email already exists." };

    const passwordHash = await hashPassword(data.password);
    const [created] = await database.insert(users).values({
      role: "customer",
      name: data.name,
      email,
      passwordHash,
      phone: data.phone.replace(/[ ()-]/g, ""),
      country: data.country || null,
      nationality: data.nationality,
      dateOfBirth: data.dateOfBirth,
    }).returning();

    await createSession(created.id);
    return { ok: true as const, user: publicUser(created) };
  });

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = readSessionToken();
  if (!token) return null;
  const database = requireDb();
  const tokenHash = hashToken(token);
  const now = new Date();
  const [row] = await database
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!row) {
    clearSessionCookie();
    return null;
  }

  return publicUser(row.user);
});

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = readSessionToken();
  if (token && db) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, hashToken(token)));
  }
  clearSessionCookie();
  return { ok: true };
});

export const updatePasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ currentPassword: z.string().optional(), newPassword: z.string().min(8).max(200) }))
  .handler(async ({ data }) => {
    const token = readSessionToken();
    if (!token) return { ok: false as const, message: "You are not signed in." };
    const database = requireDb();
    const [row] = await database.select({ user: users, session: sessions }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))).limit(1);
    if (!row) return { ok: false as const, message: "Your session has expired. Please sign in again." };
    if (data.currentPassword && !(await verifyPassword(row.user.passwordHash, data.currentPassword))) return { ok: false as const, message: "The current password is incorrect." };
    const passwordHash = await hashPassword(data.newPassword);
    await database.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.user.id));
    await revokeUserSessions(row.user.id);
    clearSessionCookie();
    return { ok: true as const, message: "Password updated. Please sign in again." };
  });


export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email() }))
  .handler(async ({ data }) => {
    const database = requireDb();
    const email = data.email.toLowerCase();
    const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return { ok: true as const, message: "If an account exists for this email, a reset link has been prepared." };

    await database.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    const token = randomBytes(32).toString("base64url");
    await database.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    // Email delivery is Phase 3. For local development only, expose the token
    // so the existing frontend reset screen remains testable.
    return {
      ok: true as const,
      message: "If an account exists for this email, a reset link has been prepared.",
      devResetToken: process.env.NODE_ENV === "production" ? undefined : token,
    };
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(20), password: z.string().min(8).max(200) }))
  .handler(async ({ data }) => {
    const database = requireDb();
    const tokenHash = hashToken(data.token);
    const [reset] = await database
      .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
      .limit(1);

    if (!reset) return { ok: false as const, message: "This password reset link is invalid or has expired." };

    const passwordHash = await hashPassword(data.password);
    await database.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, reset.userId));
    await database.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, reset.id));
    await revokeUserSessions(reset.userId);
    clearSessionCookie();
    return { ok: true as const, message: "Your password has been updated. You can now sign in." };
  });
