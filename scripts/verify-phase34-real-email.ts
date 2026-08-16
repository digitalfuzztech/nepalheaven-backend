import { eq } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { leadInteractions } from "../src/db/schema/communications.ts";
import { createPublicLead } from "../src/lib/lead.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
if (process.env["MAIL_MODE"] !== "smtp")
  throw new Error(
    "MAIL_MODE=smtp is required for this explicit real-email test.",
  );
const admin = process.env["MAIL_ADMIN_TO"]?.trim().toLowerCase();
if (!admin?.includes("@")) throw new Error("MAIL_ADMIN_TO is required.");
const [local, domain] = admin.split("@");
const email = `${local}+phase34-${Date.now()}@${domain}`;
const lead = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Phase 3.4 Email Lead Test",
  email,
  source: "homepage",
  marketingOptIn: true,
});
const interactions = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, lead.id));
const customer = interactions.find(
  (row) => row.templateKey === "newsletter_subscription_confirmation",
);
const notification = interactions.find(
  (row) => row.templateKey === "newsletter_admin_notification",
);
console.log(
  JSON.stringify(
    {
      leadId: lead.id,
      recipientDomain: domain,
      customerStatus: customer?.deliveryStatus,
      customerProviderMessageIdRecorded: Boolean(customer?.providerMessageId),
      adminStatus: notification?.deliveryStatus,
      adminProviderMessageIdRecorded: Boolean(notification?.providerMessageId),
      adminBodyUsesLeadType:
        notification?.body.includes("Lead Type: Email Lead") === true,
    },
    null,
    2,
  ),
);
process.exit(0);
