import { and, eq, like } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import {
  emailTemplates,
  leadInteractions,
  newsletterSubscribers,
  whatsappAttributions,
} from "../src/db/schema/communications.ts";
import { destinations } from "../src/db/schema/destinations.ts";
import { experienceCategories } from "../src/db/schema/experiences.ts";
import { leads } from "../src/db/schema/leads.ts";
import { packages } from "../src/db/schema/packages.ts";
import { createPublicLead } from "../src/lib/lead.server.ts";
import { getLeadTypeLabel } from "../src/lib/lead-taxonomy.ts";
import {
  createWebsiteWhatsAppAttribution,
  processInboundWhatsAppMessage,
} from "../src/lib/whatsapp.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
process.env["MAIL_MODE"] = "log";
process.env["MAIL_FROM_ADDRESS"] = "phase34@nepalheaven.local";
process.env["MAIL_ADMIN_TO"] = "admin-phase34@nepalheaven.local";
const stamp = Date.now();
const testEmail = (name: string) => `phase34-${name}-${stamp}@example.com`;
const output: Record<string, unknown> = {};

output.taxonomy = [1, 2, 3, 4, 5].map((level) => ({
  level,
  label: getLeadTypeLabel(level),
}));

const homepage = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Phase 34 Homepage",
  email: testEmail("homepage"),
  source: "homepage",
  marketingOptIn: true,
});
const firstHomepageTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, homepage.id));
const duplicate = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Phase 34 Homepage",
  email: testEmail("homepage"),
  source: "homepage",
  marketingOptIn: true,
});
const duplicateTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, homepage.id));
const footer = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Phase 34 Footer",
  email: testEmail("footer"),
  source: "footer",
  marketingOptIn: true,
});
const [homepageLead] = await db
  .select()
  .from(leads)
  .where(eq(leads.id, homepage.id))
  .limit(1);
const [homepageSubscriber] = await db
  .select()
  .from(newsletterSubscribers)
  .where(eq(newsletterSubscribers.email, testEmail("homepage")))
  .limit(1);
const footerTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, footer.id));
output.emailLead = {
  level: homepageLead?.leadLevel,
  label: homepageLead ? getLeadTypeLabel(homepageLead.leadLevel) : null,
  subscriberActive: homepageSubscriber?.status === "active",
  consent: homepageLead?.marketingOptIn === true,
  subscriptionInteraction: firstHomepageTimeline.some(
    (row) =>
      row.interactionType === "newsletter_subscription" &&
      row.channel === "web",
  ),
  customerConfirmation: firstHomepageTimeline.some(
    (row) => row.templateKey === "newsletter_subscription_confirmation",
  ),
  adminNotification: firstHomepageTimeline.some(
    (row) =>
      row.templateKey === "newsletter_admin_notification" &&
      row.body.includes("Lead Type: Email Lead") &&
      row.body.includes("Source: Homepage Newsletter"),
  ),
  duplicateRecognized: duplicate.alreadySubscribed,
  duplicateAdminCountUnchanged:
    firstHomepageTimeline.filter(
      (row) => row.templateKey === "newsletter_admin_notification",
    ).length ===
    duplicateTimeline.filter(
      (row) => row.templateKey === "newsletter_admin_notification",
    ).length,
  footerAdminNotification: footerTimeline.some(
    (row) =>
      row.templateKey === "newsletter_admin_notification" &&
      row.body.includes("Source: Footer Newsletter"),
  ),
};

const contact = await createPublicLead({
  type: "contact",
  leadLevel: 2,
  name: "Phase 34 Contact",
  email: testEmail("contact"),
  phone: "+977 9800000001",
  travellers: 2,
  interestedIn: "Custom Nepal journey",
  travelDate: "2027-05-01",
  message: "PHASE 3.4 CONTACT REGRESSION",
  source: "contact",
});
const contactTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, contact.id));
const [destination] = await db
  .select({
    id: destinations.id,
    slug: destinations.slug,
    name: destinations.name,
  })
  .from(destinations)
  .where(
    and(eq(destinations.status, true), like(destinations.name, "%Everest%")),
  )
  .limit(1);
const [experience] = await db
  .select({
    id: experienceCategories.id,
    slug: experienceCategories.slug,
    name: experienceCategories.name,
  })
  .from(experienceCategories)
  .where(
    and(
      eq(experienceCategories.status, true),
      like(experienceCategories.name, "%Adventure%"),
    ),
  )
  .limit(1);
const [pkg] = await db
  .select({ id: packages.id, slug: packages.slug, title: packages.title })
  .from(packages)
  .where(
    and(eq(packages.status, true), like(packages.title, "%Everest Base Camp%")),
  )
  .limit(1);
if (!destination || !experience || !pkg)
  throw new Error(
    "Required published Everest/Adventure test content is missing.",
  );
const destinationLead = await createPublicLead({
  type: "destination_inquiry",
  leadLevel: 3,
  name: "Phase 34 Destination",
  email: testEmail("destination"),
  message: "PHASE 3.4 DESTINATION REGRESSION",
  source: "destination",
  destinationSlug: destination.slug,
});
const experienceLead = await createPublicLead({
  type: "experience_inquiry",
  leadLevel: 4,
  name: "Phase 34 Experience",
  email: testEmail("experience"),
  message: "PHASE 3.4 EXPERIENCE REGRESSION",
  source: "experience",
  experienceSlug: experience.slug,
});
const destinationTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, destinationLead.id));
const experienceTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, experienceLead.id));
output.emailRegression = {
  contactCustomer: contactTimeline.some(
    (row) => row.templateKey === "contact_customer_acknowledgment",
  ),
  contactAdmin: contactTimeline.some(
    (row) =>
      row.templateKey === "contact_admin_notification" &&
      row.body.includes("Lead Type: Contact Lead") &&
      row.body.includes("Source: Contact Page") &&
      !row.body.includes("Lead Level"),
  ),
  destinationCustomer: destinationTimeline.some(
    (row) => row.templateKey === "destination_customer_acknowledgment",
  ),
  destinationAdmin: destinationTimeline.some(
    (row) =>
      row.templateKey === "destination_admin_notification" &&
      row.body.includes("Lead Type: Destination Lead") &&
      row.body.includes(`Destination: ${destination.name}`),
  ),
  experienceCustomer: experienceTimeline.some(
    (row) => row.templateKey === "experience_customer_acknowledgment",
  ),
  experienceAdmin: experienceTimeline.some(
    (row) =>
      row.templateKey === "experience_admin_notification" &&
      row.body.includes("Lead Type: Experiences Lead") &&
      row.body.includes(`Experience: ${experience.name}`),
  ),
};

const leadsBeforeLinks = (await db.select({ id: leads.id }).from(leads)).length;
const homeLink = await createWebsiteWhatsAppAttribution({
  context: "homepage",
});
const destinationLink = await createWebsiteWhatsAppAttribution({
  context: "destination",
  slug: destination.slug,
});
const experienceLink = await createWebsiteWhatsAppAttribution({
  context: "experience",
  slug: experience.slug,
});
const packageLink = await createWebsiteWhatsAppAttribution({
  context: "package",
  slug: pkg.slug,
});
const leadsAfterLinks = (await db.select({ id: leads.id }).from(leads)).length;
let arbitraryRejected = false;
try {
  await createWebsiteWhatsAppAttribution({
    context: "destination",
    slug: "not-a-real-published-destination",
  });
} catch {
  arbitraryRejected = true;
}
const attributionRows = await db
  .select()
  .from(whatsappAttributions)
  .where(eq(whatsappAttributions.source, "website_whatsapp"));
const generated = [homeLink, destinationLink, experienceLink, packageLink];
output.whatsappLinks = {
  contexts: generated.map((entry) => ({
    name: entry.contextName,
    marker: entry.message.includes(`[NH-WEB:${entry.token}]`),
    recipient: new URL(entry.url).pathname.slice(1),
  })),
  uniqueTokens: new Set(generated.map((entry) => entry.token)).size === 4,
  tokenLength: generated.every((entry) => entry.token.length === 12),
  arbitrarySlugRejected: arbitraryRejected,
  noLeadOnLinkGeneration: leadsBeforeLinks === leadsAfterLinks,
  recordsPersisted: generated.every((entry) =>
    attributionRows.some((row) => row.id === entry.attributionId),
  ),
};

const attributedPhone = "+9779812345678";
const exactMessage = `Hi Nepal Heaven! I'm interested in Everest Region.\n[NH-WEB:${destinationLink.token}]`;
const matched = await processInboundWhatsAppMessage({
  senderPhone: attributedPhone,
  body: exactMessage,
  profileName: "Phase 34 WhatsApp",
});
const [matchedLead] = matched.leadId
  ? await db.select().from(leads).where(eq(leads.id, matched.leadId)).limit(1)
  : [];
const [matchedAttribution] = await db
  .select()
  .from(whatsappAttributions)
  .where(eq(whatsappAttributions.id, destinationLink.attributionId))
  .limit(1);
const matchedTimeline = matched.leadId
  ? await db
      .select()
      .from(leadInteractions)
      .where(eq(leadInteractions.leadId, matched.leadId))
  : [];
const direct = await processInboundWhatsAppMessage({
  senderPhone: "+9779812345679",
  body: "Hello, do you organize Mustang trips?",
});
const [directInteraction] = await db
  .select()
  .from(leadInteractions)
  .where(
    and(
      eq(leadInteractions.channel, "whatsapp"),
      eq(leadInteractions.fromAddress, "+9779812345679"),
    ),
  )
  .limit(1);
const leadCountBeforeSecond = (await db.select({ id: leads.id }).from(leads))
  .length;
const second = await processInboundWhatsAppMessage({
  senderPhone: attributedPhone,
  body: "Could you also share the best season?",
});
const leadCountAfterSecond = (await db.select({ id: leads.id }).from(leads))
  .length;
output.inboundMatcher = {
  attributedAutomaticLead: matched.automaticLead,
  level: matchedLead?.leadLevel,
  label: matchedLead ? getLeadTypeLabel(matchedLead.leadLevel) : null,
  source: matchedLead?.source,
  destinationRelationship: matchedLead?.destinationId === destination.id,
  exactMessageStored: matchedTimeline.some((row) => row.body === exactMessage),
  tokenMatched:
    matchedAttribution?.status === "matched" &&
    matchedAttribution.matchedLeadId === matched.leadId,
  directAutomaticLead: direct.automaticLead,
  directHasNoLead: direct.leadId === null && directInteraction?.leadId === null,
  directAcquisition: directInteraction?.acquisitionSource,
  secondMessageSameLead: second.leadId === matched.leadId,
  noDuplicateLead: leadCountBeforeSecond === leadCountAfterSecond,
};

const templates = await db
  .select({ key: emailTemplates.key })
  .from(emailTemplates);
output.templates = {
  count: templates.length,
  newsletterAdminPresent: templates.some(
    (row) => row.key === "newsletter_admin_notification",
  ),
};
console.log(JSON.stringify(output, null, 2));
process.exit(0);
