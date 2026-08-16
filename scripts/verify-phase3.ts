import { and, eq, like } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { destinations } from "../src/db/schema/destinations.ts";
import { experienceCategories } from "../src/db/schema/experiences.ts";
import { leads } from "../src/db/schema/leads.ts";
import {
  emailTemplates,
  leadInteractions,
  newsletterSubscribers,
} from "../src/db/schema/communications.ts";
import {
  createPublicLead,
  unsubscribeByToken,
} from "../src/lib/lead.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
process.env["MAIL_MODE"] = "log";
process.env["MAIL_FROM_ADDRESS"] =
  process.env["MAIL_FROM_ADDRESS"] || "test@nepalheaven.local";
process.env["MAIL_ADMIN_TO"] =
  process.env["MAIL_ADMIN_TO"] || "admin-test@nepalheaven.local";
const stamp = Date.now();
const email = (name: string) => `phase3-${name}-${stamp}@example.com`;
const results: Record<string, unknown> = {};

const home = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Newsletter Test",
  email: email("home"),
  source: "homepage",
  marketingOptIn: true,
});
const homeDuplicate = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Newsletter Test",
  email: email("home"),
  source: "homepage",
  marketingOptIn: true,
});
if (!home.unsubscribeToken)
  throw new Error("Initial newsletter token missing.");
const unsubscribed = await unsubscribeByToken(home.unsubscribeToken);
const resubscribed = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Newsletter Test",
  email: email("home"),
  source: "homepage",
  marketingOptIn: true,
});
const footer = await createPublicLead({
  type: "newsletter_subscriber",
  leadLevel: 1,
  name: "Footer Test",
  email: email("footer"),
  source: "footer",
  marketingOptIn: true,
});
const [homeSubscriber] = await db
  .select()
  .from(newsletterSubscribers)
  .where(eq(newsletterSubscribers.email, email("home")))
  .limit(1);
const subscriberRows = await db
  .select({ id: newsletterSubscribers.id })
  .from(newsletterSubscribers)
  .where(eq(newsletterSubscribers.email, email("home")));
results.newsletter = {
  homeLead: home.id,
  duplicateRecognized: homeDuplicate.alreadySubscribed,
  oneSubscriber: subscriberRows.length === 1,
  unsubscribed,
  reactivated: homeSubscriber?.status === "active",
  newConsentTimestamp: Boolean(homeSubscriber?.consentedAt),
  footerLead: footer.id,
};

const contact = await createPublicLead({
  type: "contact",
  leadLevel: 2,
  name: "Phase Three Contact",
  email: email("contact"),
  phone: "+977 9800000000",
  travellers: 3,
  interestedIn: "Custom Nepal journey",
  travelDate: "2027-04-12",
  message: "PHASE 3 CONTACT EMAIL TEST",
  source: "contact",
  marketingOptIn: false,
});
const consent = await createPublicLead({
  type: "contact",
  leadLevel: 2,
  name: "Phase Three Consent",
  email: email("consent"),
  travellers: 2,
  interestedIn: "Everest planning",
  message: "PHASE 3 MARKETING CONSENT TEST",
  source: "contact",
  marketingOptIn: true,
});
const [contactRow] = await db
  .select()
  .from(leads)
  .where(eq(leads.id, contact.id))
  .limit(1);
const [consentRow] = await db
  .select()
  .from(leads)
  .where(eq(leads.id, consent.id))
  .limit(1);
const contactTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, contact.id));
results.contact = {
  level: contactRow?.leadLevel,
  exactMessage: contactRow?.message === "PHASE 3 CONTACT EMAIL TEST",
  structured:
    contactRow?.travellers === 3 &&
    contactRow?.interestedIn === "Custom Nepal journey",
  inbound: contactTimeline.some(
    (item) =>
      item.direction === "inbound" &&
      item.body === "PHASE 3 CONTACT EMAIL TEST",
  ),
  customerEmail: contactTimeline.some(
    (item) => item.templateKey === "contact_customer_acknowledgment",
  ),
  adminEmail: contactTimeline.some(
    (item) => item.templateKey === "contact_admin_notification",
  ),
  uncheckedConsent: contactRow?.marketingOptIn === false,
  checkedConsent:
    consentRow?.marketingOptIn === true &&
    Boolean(consentRow.marketingOptedInAt),
};

const [destination] = await db
  .select({
    slug: destinations.slug,
    id: destinations.id,
    name: destinations.name,
  })
  .from(destinations)
  .where(
    and(eq(destinations.status, true), like(destinations.name, "%Everest%")),
  )
  .limit(1);
const chosenDestination =
  destination ??
  (
    await db
      .select({
        slug: destinations.slug,
        id: destinations.id,
        name: destinations.name,
      })
      .from(destinations)
      .where(eq(destinations.status, true))
      .limit(1)
  )[0];
if (!chosenDestination)
  throw new Error("No published destination exists for testing.");
const destinationLead = await createPublicLead({
  type: "destination_inquiry",
  leadLevel: 3,
  name: "Phase Three Destination",
  email: email("destination"),
  travelDate: "2027-10-15",
  interestedIn: chosenDestination.name,
  message: "PHASE 3 DESTINATION EMAIL TEST",
  source: "destination",
  destinationSlug: chosenDestination.slug,
});
const [destinationRow] = await db
  .select()
  .from(leads)
  .where(eq(leads.id, destinationLead.id))
  .limit(1);
const destinationTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, destinationLead.id));
results.destination = {
  name: chosenDestination.name,
  level: destinationRow?.leadLevel,
  relationship: destinationRow?.destinationId === chosenDestination.id,
  exactMessage: destinationRow?.message === "PHASE 3 DESTINATION EMAIL TEST",
  templates: destinationTimeline
    .filter((item) => item.templateKey?.startsWith("destination_"))
    .map((item) => item.templateKey),
};

const [adventure] = await db
  .select({
    slug: experienceCategories.slug,
    id: experienceCategories.id,
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
const chosenExperience =
  adventure ??
  (
    await db
      .select({
        slug: experienceCategories.slug,
        id: experienceCategories.id,
        name: experienceCategories.name,
      })
      .from(experienceCategories)
      .where(eq(experienceCategories.status, true))
      .limit(1)
  )[0];
if (!chosenExperience)
  throw new Error("No published experience exists for testing.");
const experienceLead = await createPublicLead({
  type: "experience_inquiry",
  leadLevel: 4,
  name: "Phase Three Experience",
  email: email("experience"),
  travelDate: "2027-11-02",
  interestedIn: chosenExperience.name,
  message: "PHASE 3 EXPERIENCE EMAIL TEST",
  source: "experience",
  experienceSlug: chosenExperience.slug,
});
const [experienceRow] = await db
  .select()
  .from(leads)
  .where(eq(leads.id, experienceLead.id))
  .limit(1);
const experienceTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, experienceLead.id));
results.experience = {
  name: chosenExperience.name,
  level: experienceRow?.leadLevel,
  relationship: experienceRow?.experienceId === chosenExperience.id,
  exactMessage: experienceRow?.message === "PHASE 3 EXPERIENCE EMAIL TEST",
  templates: experienceTimeline
    .filter((item) => item.templateKey?.startsWith("experience_"))
    .map((item) => item.templateKey),
};

const itinerary = await createPublicLead({
  type: "itinerary_request",
  leadLevel: 3,
  name: "Phase Three Itinerary",
  email: email("itinerary"),
  travelDate: "2027-09-01",
  message: "PHASE 3 ITINERARY EMAIL TEST",
  source: "itinerary_request",
  destinationSlug: chosenDestination.slug,
});
const itineraryTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, itinerary.id));
results.itinerary = {
  lead: itinerary.id,
  interaction: itineraryTimeline.some((item) => item.direction === "inbound"),
  emails: itineraryTimeline.filter((item) => item.channel === "email").length,
};

process.env["MAIL_MODE"] = "smtp";
process.env["MAIL_HOST"] = "127.0.0.1";
process.env["MAIL_PORT"] = "1";
process.env["MAIL_SECURE"] = "false";
process.env["MAIL_USER"] = "invalid";
process.env["MAIL_PASSWORD"] = "invalid";
const failed = await createPublicLead({
  type: "contact",
  leadLevel: 2,
  name: "Phase Three Failure",
  email: email("failure"),
  message: "PHASE 3 SMTP FAILURE PERSISTENCE TEST",
  source: "contact",
});
const [failedLead] = await db
  .select()
  .from(leads)
  .where(eq(leads.id, failed.id))
  .limit(1);
const failedTimeline = await db
  .select()
  .from(leadInteractions)
  .where(eq(leadInteractions.leadId, failed.id));
results.smtpFailure = {
  leadPersisted: Boolean(failedLead),
  inboundPersisted: failedTimeline.some((item) => item.direction === "inbound"),
  failedEmails: failedTimeline.filter(
    (item) => item.deliveryStatus === "failed",
  ).length,
};

const templateRows = await db
  .select({ id: emailTemplates.id })
  .from(emailTemplates);
results.templates = { count: templateRows.length };
console.log(JSON.stringify(results, null, 2));
process.exit(0);
