import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationChallenges } from "@/db/schema/email-verification-challenges";
import { users } from "@/db/schema/users";
import { sendAndRecordAccountEmail } from "@/lib/account-email.server";
import { buildAppUrl } from "@/lib/app-url.server";
import { getMailRouting } from "@/lib/mail-routing.server";

const EXPIRY_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashVerificationCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(code, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function generateVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function codeMatches(stored: string, code: string) {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(code, salt, expected.length, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function issueEmailVerification(userId: string) {
  if (!db) throw new Error("Database is not configured.");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.role !== "customer" || user.emailVerifiedAt)
    return { verificationPath: "/verify-email", sent: false as const };
  const [latest] = await db
    .select()
    .from(emailVerificationChallenges)
    .where(
      and(
        eq(emailVerificationChallenges.userId, user.id),
        isNull(emailVerificationChallenges.usedAt),
      ),
    )
    .orderBy(desc(emailVerificationChallenges.expiresAt))
    .limit(1);
  if (
    latest &&
    Date.now() - (latest.expiresAt.getTime() - EXPIRY_MS) < RESEND_COOLDOWN_MS
  )
    return { verificationPath: "/verify-email", sent: false as const };

  const code = generateVerificationCode();
  const token = randomBytes(32).toString("base64url");
  const challengeId = randomUUID();
  await db.transaction(async (transaction) => {
    await transaction
      .update(emailVerificationChallenges)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerificationChallenges.userId, user.id),
          isNull(emailVerificationChallenges.usedAt),
        ),
      );
    await transaction.insert(emailVerificationChallenges).values({
      id: challengeId,
      userId: user.id,
      codeHash: hashVerificationCode(code),
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EXPIRY_MS),
      createdAt: new Date(),
    });
  });
  const verificationPath = `/verify-email?token=${encodeURIComponent(token)}`;
  const delivery = await sendAndRecordAccountEmail({
    userId: user.id,
    interactionType: "customer_email_verification",
    templateKey: "customer_email_verification",
    to: user.email,
    sensitiveBody: true,
    eventId: challengeId,
    variables: {
      customerName: user.name,
      verificationCode: code,
      verificationUrl: buildAppUrl(verificationPath),
      expiryMinutes: 15,
    },
  });
  return { verificationPath, sent: delivery.status !== "failed" };
}

export async function resendEmailVerification(input: {
  token?: string;
  email?: string;
}) {
  if (!db) throw new Error("Database is not configured.");
  let userId: string | undefined;
  if (input.token) {
    const [challenge] = await db
      .select({ userId: emailVerificationChallenges.userId })
      .from(emailVerificationChallenges)
      .where(eq(emailVerificationChallenges.tokenHash, hashToken(input.token)))
      .limit(1);
    userId = challenge?.userId;
  } else if (input.email) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email.trim().toLowerCase()))
      .limit(1);
    userId = user?.id;
  }
  if (!userId)
    return {
      ok: true as const,
      message:
        "If verification is still required, a new email will be sent when allowed.",
      verificationPath: "/verify-email",
    };
  const result = await issueEmailVerification(userId);
  return {
    ok: true as const,
    message: result.sent
      ? "A new verification code is being sent."
      : "Please wait before requesting another verification email.",
    verificationPath: result.verificationPath,
  };
}

export async function verifyEmailCode(
  token: string | undefined,
  code: string,
  email?: string,
) {
  if (!db) throw new Error("Database is not configured.");
  const verified = await db.transaction(async (transaction) => {
    const query = transaction
      .select({ challenge: emailVerificationChallenges, user: users })
      .from(emailVerificationChallenges)
      .innerJoin(users, eq(users.id, emailVerificationChallenges.userId))
      .where(
        token
          ? eq(emailVerificationChallenges.tokenHash, hashToken(token))
          : and(
              eq(users.email, email?.trim().toLowerCase() || ""),
              isNull(emailVerificationChallenges.usedAt),
            ),
      )
      .orderBy(desc(emailVerificationChallenges.expiresAt))
      .limit(1);
    const [row] = await query.for("update");
    if (
      !row ||
      row.challenge.usedAt ||
      row.user.role !== "customer" ||
      row.user.emailVerifiedAt
    )
      return {
        ok: false as const,
        message:
          "This verification challenge is invalid or has already been used.",
      };
    if (row.challenge.expiresAt <= new Date())
      return {
        ok: false as const,
        message:
          "This verification code has expired. Please request a new code.",
      };
    if (row.challenge.attemptCount >= MAX_ATTEMPTS)
      return {
        ok: false as const,
        message:
          "Too many incorrect attempts. Request a new verification code.",
      };
    if (!/^\d{6}$/.test(code) || !codeMatches(row.challenge.codeHash, code)) {
      const attempts = row.challenge.attemptCount + 1;
      await transaction
        .update(emailVerificationChallenges)
        .set({
          attemptCount: attempts,
          ...(attempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
        })
        .where(eq(emailVerificationChallenges.id, row.challenge.id));
      return {
        ok: false as const,
        message:
          attempts >= MAX_ATTEMPTS
            ? "Too many incorrect attempts. Request a new verification email."
            : "Incorrect verification code. Please check the code and try again.",
      };
    }
    const verifiedAt = new Date();
    await transaction
      .update(users)
      .set({ emailVerifiedAt: verifiedAt, updatedAt: verifiedAt })
      .where(and(eq(users.id, row.user.id), isNull(users.emailVerifiedAt)));
    await transaction
      .update(emailVerificationChallenges)
      .set({ usedAt: verifiedAt })
      .where(
        and(
          eq(emailVerificationChallenges.userId, row.user.id),
          isNull(emailVerificationChallenges.usedAt),
        ),
      );
    return { ok: true as const, user: row.user, verifiedAt };
  });
  if (!verified.ok) return verified;

  const common = {
    customerName: verified.user.name,
    customerEmail: verified.user.email,
    customerPhone: verified.user.phone || "Not provided",
    customerCountry: verified.user.country || "Not provided",
    customerNationality: verified.user.nationality || "Not provided",
    customerDateOfBirth: verified.user.dateOfBirth || "Not provided",
    customerReference: verified.user.id,
    verifiedAt: verified.verifiedAt.toISOString(),
    accountUrl: buildAppUrl("/account"),
  };
  await Promise.all([
    sendAndRecordAccountEmail({
      userId: verified.user.id,
      interactionType: "customer_email_verified",
      templateKey: "customer_email_verified",
      to: verified.user.email,
      variables: common,
    }),
    sendAndRecordAccountEmail({
      userId: verified.user.id,
      interactionType: "admin_new_traveller_registered",
      templateKey: "admin_new_traveller_registered",
      to: getMailRouting().admin.internalRecipient,
      replyTo: verified.user.email,
      variables: common,
    }),
  ]);
  return {
    ok: true as const,
    message: "Your email has been verified.",
    userId: verified.user.id,
  };
}
