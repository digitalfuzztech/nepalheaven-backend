import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { emailTemplates } from "../src/db/schema/communications.ts";
import { initialEmailTemplates } from "../src/lib/email-template-seeds.ts";

if (!db) throw new Error("DATABASE_URL is required to seed email templates.");
for (const template of initialEmailTemplates) {
  await db
    .insert(emailTemplates)
    .values({
      id: randomUUID(),
      key: template.key,
      name: template.name,
      subjectTemplate: template.subject,
      htmlTemplate: template.html,
      textTemplate: template.text,
      status: "active",
    })
    .onDuplicateKeyUpdate({
      set: {
        id: sql`${emailTemplates.id}`,
      },
    });
}

// Phase 3.6B changed successful verification to create the customer session
// immediately. Upgrade only the exact former project default; an operator-edited
// template must remain untouched.
const legacyVerifiedHtml =
  '<h1>Your email is verified</h1><p>Hi {{customerName}},</p><p>Your email has been successfully verified and your Nepal Heaven account is ready.</p><p>You can now explore destinations, packages and experiences, manage bookings and plan your Nepal journey.</p><p><a href="{{loginUrl}}" style="display:inline-block;background:#173d32;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Sign In</a></p>';
const legacyVerifiedText =
  "Hi {{customerName}},\n\nYour email has been successfully verified and your Nepal Heaven account is ready.\n\nSign in: {{loginUrl}}";
const verifiedTemplate = initialEmailTemplates.find(
  (template) => template.key === "customer_email_verified",
);
if (verifiedTemplate) {
  await db
    .update(emailTemplates)
    .set({
      htmlTemplate: verifiedTemplate.html,
      textTemplate: verifiedTemplate.text,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailTemplates.key, verifiedTemplate.key),
        eq(emailTemplates.htmlTemplate, legacyVerifiedHtml),
        eq(emailTemplates.textTemplate, legacyVerifiedText),
      ),
    );
}
console.log(
  `Seeded ${initialEmailTemplates.length} email templates idempotently.`,
);
process.exit(0);
