import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { emailVerificationChallenges } from "../src/db/schema/email-verification-challenges.ts";
import {
  emailTemplates,
  leadInteractions,
} from "../src/db/schema/communications.ts";
import { passwordResetTokens } from "../src/db/schema/password-reset-tokens.ts";
import { sessions } from "../src/db/schema/sessions.ts";
import { users } from "../src/db/schema/users.ts";
import { getBookingEmailUrls } from "../src/lib/booking-email.server.ts";
import {
  authenticateCredentials,
  hashPassword,
  hashToken,
  requestPasswordResetForRole,
  resetPasswordForRole,
  verifyPassword,
} from "../src/lib/auth.server.ts";
import {
  generateVerificationCode,
  hashVerificationCode,
  issueEmailVerification,
  verifyEmailCode,
} from "../src/lib/email-verification.server.ts";
import {
  registerCustomer,
  PublicRegistrationError,
} from "../src/lib/registration.server.ts";
import { safeReturnPath } from "../src/lib/safe-redirect.ts";
import { sendTemplatedEmail } from "../src/lib/email.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
process.env["MAIL_MODE"] = "log";
process.env["MAIL_FROM_ADDRESS"] ||= "phase36@nepalheaven.local";
process.env["MAIL_ADMIN_TO"] ||= "admin-phase36@nepalheaven.local";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Phase 3.6 verification failed: ${message}`);
}
const stamp = Date.now();
const password = "OldPhase36A1";
const newPassword = "NewPhase36B2";
const email = `phase36-${stamp}@example.com`;

const urls = getBookingEmailUrls("NH-2026-1234567890ABCDEF");
assert(
  urls.customerBookingUrl ===
    "http://localhost:8080/account/bookings/NH-2026-1234567890ABCDEF",
  "customer booking URL",
);
assert(
  urls.adminBookingUrl ===
    "http://localhost:8080/admin/crm/bookings/confirmed/NH-2026-1234567890ABCDEF",
  "admin booking URL",
);
assert(!JSON.stringify(urls).includes("5173"), "booking URLs contain 5173");
assert(
  safeReturnPath("/account/bookings/NH-1", "/account") ===
    "/account/bookings/NH-1",
  "valid return path rejected",
);
for (const unsafe of [
  "https://evil.example",
  "//evil.example",
  "javascript:alert(1)",
  "/\\evil",
  "/%5cevil",
  "%2F%2Fevil.example",
])
  assert(
    safeReturnPath(unsafe, "/account") === "/account",
    `unsafe redirect accepted: ${unsafe}`,
  );

const [templateCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(emailTemplates);
assert(Number(templateCount?.count) === 19, "expected 19 templates");

const form = new FormData();
for (const [key, value] of Object.entries({
  name: "Phase 36 Traveller",
  email,
  phone: "+9779800000036",
  nationality: "NP",
  dateOfBirth: "1990-01-01",
  password,
}))
  form.set(key, value);
const registration = await registerCustomer(form);
assert(registration.pendingVerification, "registration did not remain pending");
const token = new URL(
  registration.verificationPath,
  "http://localhost",
).searchParams.get("token");
assert(token, "registration did not return opaque verification path");
const [pendingUser] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
assert(
  pendingUser && !pendingUser.emailVerifiedAt,
  "pending user was prematurely verified",
);
const preLogin = await authenticateCredentials(email, password, "customer");
assert(
  !preLogin.ok && preLogin.requiresVerification,
  "unverified login was not rejected",
);

const verificationRender = await sendTemplatedEmail({
  templateKey: "customer_email_verification",
  to: email,
  variables: {
    customerName: "Phase 36 Traveller",
    verificationCode: "048231",
    verificationUrl: "http://localhost:8080/verify-email?token=opaque-test",
    expiryMinutes: 15,
  },
});
assert(
  verificationRender.text.includes("048231"),
  "verification email lacks six-digit code",
);
assert(
  verificationRender.text.includes("/verify-email?token=opaque-test"),
  "verification email lacks challenge link",
);
assert(
  !verificationRender.text.includes("code=048231"),
  "verification code leaked into URL",
);
for (let index = 0; index < 100; index += 1)
  assert(
    /^\d{6}$/.test(generateVerificationCode()),
    "verification generator is not six digits",
  );

await db
  .update(emailVerificationChallenges)
  .set({ usedAt: new Date() })
  .where(
    and(
      eq(emailVerificationChallenges.userId, pendingUser.id),
      isNull(emailVerificationChallenges.usedAt),
    ),
  );
const controlledToken = randomBytes(32).toString("base64url");
const controlledChallengeId = randomUUID();
await db.insert(emailVerificationChallenges).values({
  id: controlledChallengeId,
  userId: pendingUser.id,
  tokenHash: hashToken(controlledToken),
  codeHash: hashVerificationCode("482731"),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
});
const wrong = await verifyEmailCode(controlledToken, "111111");
assert(!wrong.ok, "wrong verification code accepted");
const [afterWrong] = await db
  .select({ attempts: emailVerificationChallenges.attemptCount })
  .from(emailVerificationChallenges)
  .where(eq(emailVerificationChallenges.id, controlledChallengeId));
assert(afterWrong?.attempts === 1, "wrong attempt was not counted");
const verified = await verifyEmailCode(controlledToken, "482731");
assert(verified.ok, "correct verification code rejected");
const [verifiedUser] = await db
  .select()
  .from(users)
  .where(eq(users.id, pendingUser.id));
assert(verifiedUser?.emailVerifiedAt, "verified timestamp missing");
assert(
  !(await verifyEmailCode(controlledToken, "482731")).ok,
  "verification challenge reused",
);
assert(
  (await authenticateCredentials(email, password, "customer")).ok,
  "verified customer cannot authenticate",
);

let verifiedDuplicateRejected = false;
try {
  await registerCustomer(form);
} catch (error) {
  verifiedDuplicateRejected = error instanceof PublicRegistrationError;
}
assert(
  verifiedDuplicateRejected,
  "verified duplicate registration not rejected",
);

const pendingDuplicateEmail = `phase36-pending-${stamp}@example.com`;
const pendingId = randomUUID();
await db.insert(users).values({
  id: pendingId,
  role: "customer",
  name: "Pending Duplicate",
  email: pendingDuplicateEmail,
  passwordHash: await hashPassword(password),
  phone: "+9779800000136",
  country: "Nepal",
  nationality: "NP",
  dateOfBirth: "1991-01-01",
});
const pendingForm = new FormData();
for (const [key, value] of Object.entries({
  name: "Pending Duplicate",
  email: pendingDuplicateEmail,
  phone: "+9779800000136",
  nationality: "NP",
  dateOfBirth: "1991-01-01",
  password,
}))
  pendingForm.set(key, value);
const pendingAgain = await registerCustomer(pendingForm);
assert(
  pendingAgain.pendingVerification,
  "pending duplicate did not continue verification",
);
const [pendingCount] = await db
  .select({ count: sql<number>`count(*)` })
  .from(users)
  .where(eq(users.email, pendingDuplicateEmail));
assert(
  Number(pendingCount?.count) === 1,
  "pending duplicate created another user",
);

const expiredToken = randomBytes(32).toString("base64url");
await db.insert(emailVerificationChallenges).values({
  id: randomUUID(),
  userId: pendingId,
  tokenHash: hashToken(expiredToken),
  codeHash: hashVerificationCode("123456"),
  expiresAt: new Date(Date.now() - 1000),
});
assert(
  !(await verifyEmailCode(expiredToken, "123456")).ok,
  "expired verification accepted",
);
const cooldown = await issueEmailVerification(pendingId);
assert(!cooldown.sent, "verification cooldown was not respected");
await db
  .update(emailVerificationChallenges)
  .set({
    createdAt: new Date(Date.now() - 61_000),
    expiresAt: new Date(Date.now() + 14 * 60_000 - 1_000),
  })
  .where(eq(emailVerificationChallenges.userId, pendingId));
const resent = await issueEmailVerification(pendingId);
assert(
  resent.sent && resent.verificationPath.includes("token="),
  "verification resend failed",
);

const sessionId = randomUUID();
await db.insert(sessions).values({
  id: sessionId,
  userId: pendingUser.id,
  tokenHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
});
const resetToken = randomBytes(32).toString("base64url");
await db.insert(passwordResetTokens).values({
  id: randomUUID(),
  userId: pendingUser.id,
  tokenHash: hashToken(resetToken),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
});
assert(
  (await resetPasswordForRole(resetToken, newPassword, "customer")).ok,
  "customer reset failed",
);
const [resetCustomer] = await db
  .select()
  .from(users)
  .where(eq(users.id, pendingUser.id));
assert(
  resetCustomer &&
    !(await verifyPassword(resetCustomer.passwordHash, password)),
  "old customer password still works",
);
assert(
  await verifyPassword(resetCustomer.passwordHash, newPassword),
  "new customer password fails",
);
assert(
  !(await resetPasswordForRole(resetToken, newPassword, "customer")).ok,
  "customer reset token reused",
);
const [revokedSession] = await db
  .select()
  .from(sessions)
  .where(eq(sessions.id, sessionId));
assert(revokedSession?.revokedAt, "customer sessions not revoked");
await requestPasswordResetForRole(email, "customer");

const [admin] = await db
  .select()
  .from(users)
  .where(eq(users.role, "admin"))
  .limit(1);
assert(admin, "platform admin missing");
const adminTokensBefore = await db
  .select({ count: sql<number>`count(*)` })
  .from(passwordResetTokens)
  .where(eq(passwordResetTokens.userId, admin.id));
await requestPasswordResetForRole(email, "admin");
const adminTokensAfterCustomer = await db
  .select({ count: sql<number>`count(*)` })
  .from(passwordResetTokens)
  .where(eq(passwordResetTokens.userId, admin.id));
assert(
  Number(adminTokensBefore[0]?.count) ===
    Number(adminTokensAfterCustomer[0]?.count),
  "customer email triggered admin reset",
);
await requestPasswordResetForRole(
  admin.email,
  "admin",
  "/admin/crm/bookings/confirmed/NH-2026-1234567890ABCDEF",
);

const testAdminEmail = `phase36-admin-${stamp}@example.com`;
const testAdminId = randomUUID();
await db.insert(users).values({
  id: testAdminId,
  role: "admin",
  name: "Phase 36 Admin",
  email: testAdminEmail,
  passwordHash: await hashPassword(password),
  emailVerifiedAt: new Date(),
});
const adminSessionId = randomUUID();
await db.insert(sessions).values({
  id: adminSessionId,
  userId: testAdminId,
  tokenHash: hashToken(randomBytes(32).toString("base64url")),
  expiresAt: new Date(Date.now() + 60_000),
});
const adminResetToken = randomBytes(32).toString("base64url");
await db.insert(passwordResetTokens).values({
  id: randomUUID(),
  userId: testAdminId,
  tokenHash: hashToken(adminResetToken),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
});
assert(
  (await resetPasswordForRole(adminResetToken, newPassword, "admin")).ok,
  "admin reset failed",
);
const [testAdmin] = await db
  .select()
  .from(users)
  .where(eq(users.id, testAdminId));
assert(
  testAdmin && (await verifyPassword(testAdmin.passwordHash, newPassword)),
  "new admin password fails",
);
assert(
  !(await resetPasswordForRole(adminResetToken, newPassword, "admin")).ok,
  "admin reset token reused",
);
assert(
  !(await authenticateCredentials(email, newPassword, "admin")).ok,
  "customer authenticated as admin",
);

const interactions = await db
  .select()
  .from(leadInteractions)
  .where(like(leadInteractions.metadata, `%"userId":"${pendingUser.id}"%`));
for (const key of [
  "customer_email_verification",
  "customer_email_verified",
  "admin_new_traveller_registered",
  "customer_password_reset",
])
  assert(
    interactions.some((item) => item.templateKey === key),
    `missing interaction ${key}`,
  );
const sensitive = interactions.filter((item) =>
  ["customer_email_verification", "customer_password_reset"].includes(
    item.templateKey || "",
  ),
);
assert(
  sensitive.every(
    (item) =>
      item.body.includes("intentionally not persisted") &&
      !item.metadata?.includes("token"),
  ),
  "sensitive token/code persisted in interaction",
);
const adminResetInteraction = await db
  .select()
  .from(leadInteractions)
  .where(
    and(
      eq(leadInteractions.templateKey, "admin_password_reset"),
      eq(leadInteractions.toAddress, admin.email),
    ),
  )
  .limit(1);
assert(
  adminResetInteraction.length === 1,
  "admin reset not addressed to actual admin account",
);

const bookingServerSource = readFileSync("src/lib/booking.server.ts", "utf8");
assert(
  bookingServerSource.includes("eq(bookings.userId, userId)"),
  "customer booking ownership constraint missing",
);
assert(
  bookingServerSource.includes('row.role !== "admin"'),
  "admin booking role constraint missing",
);

console.log(
  JSON.stringify(
    {
      appUrl: process.env["APP_URL"],
      urls,
      templates: Number(templateCount?.count),
      registration: {
        pending: true,
        unverifiedLoginRejected: true,
        duplicateProtected: true,
      },
      verification: {
        wrongAttemptCounted: true,
        correctCodeVerified: true,
        oneTime: true,
        expiredRejected: true,
        cooldown: true,
        resend: true,
      },
      passwordReset: {
        customerOneTime: true,
        adminOneTime: true,
        sessionsRevoked: true,
        adminRecipientResolvedFromDatabase: true,
      },
      authorization: {
        customerOwnershipConstraint: true,
        adminRoleConstraint: true,
      },
      sensitiveTrackingRedacted: true,
    },
    null,
    2,
  ),
);
process.exit(0);
