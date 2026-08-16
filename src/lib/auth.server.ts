import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { eq, and, gt, isNull } from "drizzle-orm";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { sessions } from "@/db/schema/sessions";
import { passwordResetTokens } from "@/db/schema/password-reset-tokens";
import { sendAndRecordAccountEmail } from "@/lib/account-email.server";
import { buildAppUrl } from "@/lib/app-url.server";
import { enforcePublicRateLimit } from "@/lib/public-rate-limit.server";
import { safeReturnPath } from "@/lib/safe-redirect";

const SESSION_COOKIE = "nepalheaven_session";
const SESSION_DAYS = 7;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  expectedRole: z.enum(["admin", "customer"]).optional(),
});

function requireDb() {
  if (!db)
    throw new Error("Database is not configured. Check DATABASE_URL in .env.");
  return db;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(stored: string, password: string) {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const derived = scryptSync(password, salt, expected.length, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return (
    expected.length === derived.length && timingSafeEqual(expected, derived)
  );
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(token: string) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  setResponseHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
}

function clearSessionCookie() {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
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

export async function revokeUserSessions(userId: string) {
  const database = requireDb();
  await database
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
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

export async function createVerifiedCustomerSession(userId: string) {
  const database = requireDb();
  const [user] = await database
    .select({
      id: users.id,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.role !== "customer" || !user.emailVerifiedAt)
    throw new Error(
      "A verified customer is required before creating a session.",
    );
  await revokeUserSessions(user.id);
  await createSession(user.id);
}

export async function authenticateCredentials(
  emailInput: string,
  password: string,
  expectedRole?: "admin" | "customer",
) {
  const database = requireDb();
  const email = emailInput.trim().toLowerCase();
  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user)
    return {
      ok: false as const,
      message: "The email or password is incorrect.",
    };

  const passwordMatches = await verifyPassword(user.passwordHash, password);
  if (!passwordMatches)
    return {
      ok: false as const,
      message: "The email or password is incorrect.",
    };

  if (expectedRole && user.role !== expectedRole) {
    return {
      ok: false as const,
      message:
        expectedRole === "admin"
          ? "This account does not have administrator access."
          : "Administrator accounts must sign in through /admin.",
    };
  }

  if (user.role === "customer" && !user.emailVerifiedAt) {
    const { issueEmailVerification } =
      await import("@/lib/email-verification.server");
    const challenge = await issueEmailVerification(user.id);
    return {
      ok: false as const,
      requiresVerification: true as const,
      verificationPath: challenge.verificationPath,
      verificationSent: challenge.sent,
      message: "Your email still needs to be verified.",
    };
  }

  return { ok: true as const, user };
}

export async function login(data: z.infer<typeof loginSchema>) {
  const result = await authenticateCredentials(
    data.email,
    data.password,
    data.expectedRole,
  );
  if (!result.ok) return result;
  await revokeUserSessions(result.user.id);
  await createSession(result.user.id);
  return { ok: true as const, user: publicUser(result.user) };
}

export async function getCurrentUser() {
  const token = readSessionToken();
  if (!token) return null;
  const database = requireDb();
  const tokenHash = hashToken(token);
  const now = new Date();
  const [row] = await database
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) {
    clearSessionCookie();
    return null;
  }

  if (row.user.role === "customer" && !row.user.emailVerifiedAt) {
    await database
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, row.session.id));
    clearSessionCookie();
    return null;
  }

  return publicUser(row.user);
}

export async function logout() {
  const token = readSessionToken();
  if (token && db) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)));
  }
  clearSessionCookie();
  return { ok: true };
}

export async function updatePassword(data: {
  currentPassword?: string;
  newPassword: string;
}) {
  const token = readSessionToken();
  if (!token) return { ok: false as const, message: "You are not signed in." };
  const database = requireDb();
  const [row] = await database
    .select({ user: users, session: sessions })
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
  if (!row)
    return {
      ok: false as const,
      message: "Your session has expired. Please sign in again.",
    };
  if (
    data.currentPassword &&
    !(await verifyPassword(row.user.passwordHash, data.currentPassword))
  )
    return {
      ok: false as const,
      message: "The current password is incorrect.",
    };
  const passwordHash = await hashPassword(data.newPassword);
  await database
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.user.id));
  await revokeUserSessions(row.user.id);
  clearSessionCookie();
  return {
    ok: true as const,
    message: "Password updated. Please sign in again.",
  };
}

const RESET_RESPONSE =
  "If an account exists for that email, we've sent password reset instructions.";

export async function requestPasswordResetForRole(
  emailInput: string,
  role: "customer" | "admin",
  redirect?: string,
) {
  const database = requireDb();
  const email = emailInput.toLowerCase();
  const [user] = await database
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.role, role)))
    .limit(1);
  if (!user)
    return role === "customer"
      ? {
          ok: true as const,
          status: "not_found" as const,
          message: "We couldn't find an account with this email.",
        }
      : { ok: true as const, message: RESET_RESPONSE };

  if (role === "customer" && !user.emailVerifiedAt) {
    const { issueEmailVerification } =
      await import("@/lib/email-verification.server");
    const challenge = await issueEmailVerification(user.id);
    return {
      ok: true as const,
      status: "verification_required" as const,
      message: "Your account is awaiting email verification.",
      verificationPath: challenge.verificationPath,
      sent: challenge.sent,
    };
  }

  const [recent] = await database
    .select({ expiresAt: passwordResetTokens.expiresAt })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (
    recent &&
    Date.now() - (recent.expiresAt.getTime() - 30 * 60 * 1000) < 60_000
  )
    return {
      ok: true as const,
      ...(role === "customer" ? { status: "sent" as const } : {}),
      message:
        role === "customer"
          ? "We've sent password reset instructions to your email."
          : RESET_RESPONSE,
    };

  await database
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt),
      ),
    );
  const token = randomBytes(32).toString("base64url");
  await database.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
  });
  const resetPath =
    role === "admin"
      ? `/admin/reset-password?token=${encodeURIComponent(token)}${redirect ? `&redirect=${encodeURIComponent(safeReturnPath(redirect, "/admin/dashboard"))}` : ""}`
      : `/reset-password?token=${encodeURIComponent(token)}`;
  await sendAndRecordAccountEmail({
    userId: user.id,
    interactionType: `${role}_password_reset`,
    templateKey:
      role === "admin" ? "admin_password_reset" : "customer_password_reset",
    to: user.email,
    sensitiveBody: true,
    variables: {
      customerName: user.name,
      resetUrl: buildAppUrl(resetPath),
      expiryMinutes: 30,
    },
  });
  return {
    ok: true as const,
    ...(role === "customer" ? { status: "sent" as const } : {}),
    message:
      role === "customer"
        ? "We've sent password reset instructions to your email."
        : RESET_RESPONSE,
  };
}

export async function requestCustomerPasswordReset(data: { email: string }) {
  if (
    !enforcePublicRateLimit(
      "customer-password-reset",
      data.email,
      5,
      15 * 60 * 1000,
    )
  )
    return { ok: true as const, message: RESET_RESPONSE };
  return requestPasswordResetForRole(data.email, "customer");
}

export async function requestAdminPasswordReset(data: {
  email: string;
  redirect?: string;
}) {
  if (
    !enforcePublicRateLimit(
      "admin-password-reset",
      data.email,
      5,
      15 * 60 * 1000,
    )
  )
    return { ok: true as const, message: RESET_RESPONSE };
  return requestPasswordResetForRole(data.email, "admin", data.redirect);
}

export async function resetPasswordForRole(
  token: string,
  password: string,
  role: "customer" | "admin",
) {
  const database = requireDb();
  return database.transaction(async (transaction) => {
    const [reset] = await transaction
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(users.id, passwordResetTokens.userId))
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(users.role, role),
        ),
      )
      .limit(1)
      .for("update");
    if (!reset)
      return {
        ok: false as const,
        message: "This password reset link is invalid or has expired.",
      };
    const passwordHash = await hashPassword(password);
    await transaction
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, reset.userId));
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, reset.id));
    await transaction
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(sessions.userId, reset.userId), isNull(sessions.revokedAt)),
      );
    return { ok: true as const };
  });
}

export async function resetCustomerPassword(data: {
  token: string;
  password: string;
}) {
  const result = await resetPasswordForRole(
    data.token,
    data.password,
    "customer",
  );
  if (!result.ok) return result;
  clearSessionCookie();
  return {
    ok: true as const,
    message: "Your password has been updated. You can now sign in.",
  };
}

export async function resetAdminPassword(data: {
  token: string;
  password: string;
}) {
  const result = await resetPasswordForRole(data.token, data.password, "admin");
  if (!result.ok) return result;
  clearSessionCookie();
  return {
    ok: true as const,
    message: "Your administrator password has been updated.",
  };
}
