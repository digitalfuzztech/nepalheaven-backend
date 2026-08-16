import { randomUUID } from "node:crypto";
import { inArray, like } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import {
  emailTemplates,
  leadInteractions,
} from "../src/db/schema/communications.ts";
import { sendAndRecordAccountEmail } from "../src/lib/account-email.server.ts";
import { sendTemplatedEmail } from "../src/lib/email.server.ts";
import { getMailRouting } from "../src/lib/mail-routing.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
process.env["MAIL_MODE"] = "log";

const routing = getMailRouting();
const cases = [
  ["newsletter_subscription_confirmation", "general", "Nepal Heaven"],
  ["contact_customer_acknowledgment", "general", "Nepal Heaven"],
  ["destination_customer_acknowledgment", "journeys", "Nepal Heaven Journeys"],
  ["experience_customer_acknowledgment", "journeys", "Nepal Heaven Journeys"],
  ["itinerary_customer_acknowledgment", "journeys", "Nepal Heaven Journeys"],
  ["booking_customer_confirmation", "bookings", "Nepal Heaven Bookings"],
  ["customer_email_verification", "registration", "Nepal Heaven Registration"],
  ["customer_email_verified", "registration", "Nepal Heaven Registration"],
  ["customer_password_reset", "registration", "Nepal Heaven Accounts"],
] as const;

const customerKeys = cases.map(([key]) => key);
const templates = await db
  .select()
  .from(emailTemplates)
  .where(inArray(emailTemplates.key, customerKeys));
if (templates.length !== customerKeys.length)
  throw new Error(
    `Expected ${customerKeys.length} customer templates, found ${templates.length}.`,
  );

const internalAddress = routing.admin.address.toLowerCase();
for (const template of templates) {
  const stored = [
    template.subjectTemplate,
    template.htmlTemplate,
    template.textTemplate,
  ]
    .join("\n")
    .toLowerCase();
  if (stored.includes(internalAddress))
    throw new Error(`${template.key} contains the internal admin address.`);
}

const variables = {
  fullName: "Phase 3.7 Traveller",
  customerName: "Phase 3.7 Traveller",
  email: "phase37@example.com",
  verificationCode: "012345",
  verificationUrl: "https://nepalheaven.com/verify-email?token=opaque",
  resetUrl: "https://nepalheaven.com/reset-password?token=opaque",
  accountUrl: "https://nepalheaven.com/account",
  bookingUrl: "https://nepalheaven.com/account/bookings/NH-PHASE37",
  unsubscribeUrl: "https://nepalheaven.com/unsubscribe?token=opaque",
  expiryMinutes: 15,
};

const results = [];
for (const [templateKey, routeKey, expectedName] of cases) {
  const sent = await sendTemplatedEmail({
    templateKey,
    to: "phase37@example.com",
    variables,
  });
  const route = routing[routeKey];
  if (sent.route !== routeKey) throw new Error(`${templateKey}: wrong route.`);
  if (sent.fromAddress !== route.address)
    throw new Error(`${templateKey}: wrong From address.`);
  if (sent.replyTo !== route.replyTo)
    throw new Error(`${templateKey}: wrong Reply-To address.`);
  if (sent.from !== `${expectedName} <${route.address}>`)
    throw new Error(`${templateKey}: wrong visible sender name.`);
  const rendered = [sent.from, sent.replyTo, sent.subject, sent.html, sent.text]
    .join("\n")
    .toLowerCase();
  if (rendered.includes(internalAddress))
    throw new Error(`${templateKey}: rendered output exposed admin address.`);
  results.push({
    templateKey,
    route: sent.route,
    from: sent.from,
    replyTo: sent.replyTo,
  });
}

const auditRunId = `phase37-routing-audit-${randomUUID()}`;
const trackingCases = [
  ["contact_customer_acknowledgment", "general", "phase37@example.com"],
  ["destination_customer_acknowledgment", "journeys", "phase37@example.com"],
  ["booking_customer_confirmation", "bookings", "phase37@example.com"],
  ["customer_email_verification", "registration", "phase37@example.com"],
  ["admin_new_traveller_registered", "admin", routing.admin.internalRecipient],
] as const;
for (const [templateKey, , to] of trackingCases) {
  await sendAndRecordAccountEmail({
    userId: auditRunId,
    interactionType: "phase37_routing_audit",
    templateKey,
    to,
    variables,
  });
}
const tracked = await db
  .select({
    templateKey: leadInteractions.templateKey,
    fromAddress: leadInteractions.fromAddress,
    toAddress: leadInteractions.toAddress,
    metadata: leadInteractions.metadata,
  })
  .from(leadInteractions)
  .where(like(leadInteractions.metadata, `%${auditRunId}%`));
if (tracked.length !== trackingCases.length)
  throw new Error(`Expected ${trackingCases.length} tracking rows.`);
for (const [templateKey, routeKey, to] of trackingCases) {
  const record = tracked.find((row) => row.templateKey === templateKey);
  const route = routing[routeKey];
  if (record?.fromAddress !== route.address || record.toAddress !== to)
    throw new Error(`${templateKey}: tracked From/To address is incorrect.`);
  const metadata = JSON.parse(record.metadata || "{}") as Record<
    string,
    unknown
  >;
  if (metadata["mailRoute"] !== routeKey)
    throw new Error(`${templateKey}: tracked mail route is incorrect.`);
  if (metadata["replyTo"] !== route.replyTo)
    throw new Error(`${templateKey}: tracked Reply-To is incorrect.`);
}

console.log(
  JSON.stringify(
    {
      customerFacingTemplates: results,
      customerVisibleAdminOccurrences: 0,
      internalAdminRecipient: routing.admin.internalRecipient,
      communicationTrackingRows: tracked,
    },
    null,
    2,
  ),
);
process.exit(0);
