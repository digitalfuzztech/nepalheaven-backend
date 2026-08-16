import {
  index,
  int,
  boolean,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";
import { users } from "./users";
import { leads } from "./leads";
import { destinations } from "./destinations";
import { experienceCategories } from "./experiences";
import { packages } from "./packages";

export const subscriberStatusValues = ["active", "unsubscribed"] as const;
export const subscriberSourceValues = [
  "homepage",
  "footer",
  "contact",
  "destination",
  "experience",
  "other",
] as const;

export const newsletterSubscribers = mysqlTable(
  "newsletter_subscribers",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    userId: uuidColumn("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: mysqlEnum("status", subscriberStatusValues)
      .default("active")
      .notNull(),
    source: mysqlEnum("source", subscriberSourceValues).notNull(),
    unsubscribeTokenHash: varchar("unsubscribe_token_hash", {
      length: 64,
    }).notNull(),
    consentedAt: defaultMomentColumn("consented_at").notNull(),
    unsubscribedAt: momentColumn("unsubscribed_at"),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_email_unique").on(table.email),
    uniqueIndex("newsletter_subscribers_token_unique").on(
      table.unsubscribeTokenHash,
    ),
  ],
);

export const interactionChannelValues = ["web", "email", "whatsapp"] as const;
export const interactionDirectionValues = [
  "inbound",
  "outbound",
  "system",
] as const;
export const deliveryStatusValues = [
  "pending",
  "sent",
  "delivered",
  "failed",
  "received",
] as const;

export const leadInteractions = mysqlTable(
  "lead_interactions",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    leadId: uuidColumn("lead_id").references(() => leads.id, {
      onDelete: "cascade",
    }),
    channel: mysqlEnum("channel", interactionChannelValues).notNull(),
    direction: mysqlEnum("direction", interactionDirectionValues).notNull(),
    interactionType: varchar("interaction_type", { length: 80 }).notNull(),
    templateKey: varchar("template_key", { length: 100 }),
    subject: text("subject"),
    body: text("body").notNull(),
    fromAddress: varchar("from_address", { length: 254 }),
    toAddress: varchar("to_address", { length: 254 }),
    provider: varchar("provider", { length: 80 }),
    providerMessageId: text("provider_message_id"),
    deliveryStatus: mysqlEnum(
      "delivery_status",
      deliveryStatusValues,
    ).notNull(),
    failureReason: text("failure_reason"),
    acquisitionSource: varchar("acquisition_source", { length: 80 }),
    contextType: varchar("context_type", { length: 40 }),
    contextSlug: varchar("context_slug", { length: 191 }),
    automaticLead: boolean("automatic_lead").default(false).notNull(),
    metadata: text("metadata"),
    sentAt: momentColumn("sent_at"),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
  },
  (table) => [
    index("lead_interactions_lead_created_idx").on(
      table.leadId,
      table.createdAt,
    ),
    index("lead_interactions_channel_status_idx").on(
      table.channel,
      table.deliveryStatus,
    ),
    index("lead_interactions_channel_from_idx").on(
      table.channel,
      table.fromAddress,
    ),
  ],
);

export const whatsappAttributionSourceValues = [
  "website_whatsapp",
  "meta_whatsapp_ad",
] as const;
export const whatsappContextTypeValues = [
  "homepage",
  "destination",
  "experience",
  "package",
  "other",
] as const;
export const whatsappAttributionStatusValues = [
  "pending",
  "matched",
  "expired",
] as const;

export const whatsappAttributions = mysqlTable(
  "whatsapp_attributions",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    source: mysqlEnum("source", whatsappAttributionSourceValues).notNull(),
    contextType: mysqlEnum("context_type", whatsappContextTypeValues),
    contextSlug: varchar("context_slug", { length: 191 }),
    destinationId: uuidColumn("destination_id").references(
      () => destinations.id,
      { onDelete: "set null" },
    ),
    experienceId: uuidColumn("experience_id").references(
      () => experienceCategories.id,
      { onDelete: "set null" },
    ),
    packageId: uuidColumn("package_id").references(() => packages.id, {
      onDelete: "set null",
    }),
    matchedLeadId: uuidColumn("matched_lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    status: mysqlEnum("status", whatsappAttributionStatusValues)
      .default("pending")
      .notNull(),
    createdAt: defaultMomentColumn("created_at").notNull(),
    matchedAt: momentColumn("matched_at"),
    expiresAt: momentColumn("expires_at"),
    metadata: text("metadata"),
  },
  (table) => [
    uniqueIndex("whatsapp_attributions_token_unique").on(table.tokenHash),
    index("whatsapp_attributions_status_expiry_idx").on(
      table.status,
      table.expiresAt,
    ),
  ],
);

export const templateStatusValues = ["active", "inactive"] as const;
export const emailTemplates = mysqlTable(
  "email_templates",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    key: varchar("key", { length: 100 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    subjectTemplate: text("subject_template").notNull(),
    htmlTemplate: text("html_template").notNull(),
    textTemplate: text("text_template").notNull(),
    status: mysqlEnum("status", templateStatusValues)
      .default("active")
      .notNull(),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
  },
  (table) => [uniqueIndex("email_templates_key_unique").on(table.key)],
);
