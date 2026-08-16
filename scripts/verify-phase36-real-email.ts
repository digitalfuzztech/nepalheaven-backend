import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { emailVerificationChallenges } from "../src/db/schema/email-verification-challenges.ts";
import { leadInteractions } from "../src/db/schema/communications.ts";
import { passwordResetTokens } from "../src/db/schema/password-reset-tokens.ts";
import { users } from "../src/db/schema/users.ts";
import { sendAndRecordAccountEmail } from "../src/lib/account-email.server.ts";
import {
  hashPassword,
  requestPasswordResetForRole,
} from "../src/lib/auth.server.ts";
import { buildAppUrl } from "../src/lib/app-url.server.ts";
import {
  hashVerificationCode,
  verifyEmailCode,
} from "../src/lib/email-verification.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
if (process.env["MAIL_MODE"] !== "smtp")
  throw new Error(
    "MAIL_MODE=smtp is required for this explicit acceptance test.",
  );
const businessInbox = process.env["MAIL_ADMIN_TO"]?.trim().toLowerCase();
if (!businessInbox?.includes("@"))
  throw new Error("MAIL_ADMIN_TO is required.");

const [localPart, domain] = businessInbox.split("@");
const customerEmail = `${localPart}+phase36-${Date.now()}@${domain}`;
const userId = randomUUID();
const token = randomBytes(32).toString("base64url");
const code = "482731";
await db.insert(users).values({
  id: userId,
  email: customerEmail,
  passwordHash: await hashPassword("Phase36RealA1"),
  name: "Phase 3.6 SMTP Traveller",
  phone: "+9779800000000",
  country: "Nepal",
  nationality: "Nepali",
  role: "customer",
  emailVerifiedAt: null,
});
await db.insert(emailVerificationChallenges).values({
  id: randomUUID(),
  userId,
  codeHash: hashVerificationCode(code),
  tokenHash: createHash("sha256").update(token).digest("hex"),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
});
const verificationUrl = buildAppUrl(
  `/verify-email?token=${encodeURIComponent(token)}`,
);
await sendAndRecordAccountEmail({
  userId,
  interactionType: "customer_email_verification",
  templateKey: "customer_email_verification",
  to: customerEmail,
  sensitiveBody: true,
  variables: {
    customerName: "Phase 3.6 SMTP Traveller",
    verificationCode: code,
    verificationUrl,
    expiryMinutes: 15,
  },
});
const verified = await verifyEmailCode(token, code);
if (!verified.ok) throw new Error(`Verification failed: ${verified.message}`);
await requestPasswordResetForRole(customerEmail, "customer");

const [admin] = await db
  .select({ id: users.id, email: users.email })
  .from(users)
  .where(eq(users.role, "admin"))
  .limit(1);
if (!admin)
  throw new Error("No platform admin exists for the admin reset test.");
// A preceding deterministic log-mode run may have issued an active admin token.
// Retire it exactly as a fresh reset request does before this SMTP acceptance run.
await db
  .update(passwordResetTokens)
  .set({ usedAt: new Date() })
  .where(
    and(
      eq(passwordResetTokens.userId, admin.id),
      isNull(passwordResetTokens.usedAt),
    ),
  );
await requestPasswordResetForRole(admin.email, "admin");

const templateKeys = [
  "customer_email_verification",
  "customer_email_verified",
  "admin_new_traveller_registered",
  "customer_password_reset",
  "admin_password_reset",
];
const interactions = await db
  .select({
    templateKey: leadInteractions.templateKey,
    to: leadInteractions.toAddress,
    status: leadInteractions.deliveryStatus,
    messageId: leadInteractions.providerMessageId,
  })
  .from(leadInteractions)
  .where(
    and(
      inArray(leadInteractions.templateKey, templateKeys),
      inArray(leadInteractions.toAddress, [
        customerEmail,
        businessInbox,
        admin.email,
      ]),
    ),
  )
  .orderBy(desc(leadInteractions.createdAt));
const latest = new Map<string, (typeof interactions)[number]>();
for (const interaction of interactions)
  if (!latest.has(interaction.templateKey!))
    latest.set(interaction.templateKey!, interaction);
for (const key of templateKeys) {
  const interaction = latest.get(key);
  if (interaction?.status !== "sent" || !interaction.messageId)
    throw new Error(`${key} was not accepted by SMTP.`);
}
console.log(
  JSON.stringify(
    {
      customerRecipientDomain: domain,
      adminResetRecipient: admin.email,
      verificationUrlUsesAppUrl: verificationUrl.startsWith(
        `${process.env["APP_URL"]}/verify-email?token=`,
      ),
      acceptedTemplates: templateKeys,
      providerMessageIdsRecorded: true,
    },
    null,
    2,
  ),
);
process.exit(0);
