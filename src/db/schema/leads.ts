import {
  boolean,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./users";
import { packages } from "./packages";
import { destinations } from "./destinations";
import { experienceCategories } from "./experiences";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";

export const leadTypeValues = [
  "itinerary_request",
  "brochure_request",
  "expert_request",
  "package_inquiry",
  "contact",
  "newsletter_subscriber",
  "destination_inquiry",
  "experience_inquiry",
  "whatsapp_inquiry",
] as const;
export const leadStatusValues = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "booked",
  "lost",
  "closed",
] as const;

export const leads = mysqlTable(
  "leads",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    userId: uuidColumn("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    packageId: uuidColumn("package_id").references(() => packages.id, {
      onDelete: "set null",
    }),
    destinationId: uuidColumn("destination_id").references(
      () => destinations.id,
      {
        onDelete: "set null",
      },
    ),
    experienceId: uuidColumn("experience_id").references(
      () => experienceCategories.id,
      {
        onDelete: "set null",
      },
    ),
    type: mysqlEnum("type", leadTypeValues).notNull(),
    name: text("name").notNull(),
    email: varchar("email", { length: 254 }),
    phone: text("phone"),
    leadLevel: int("lead_level").default(2).notNull(),
    travelDate: date("travel_date", { mode: "string" }),
    preferredStartDate: date("preferred_start_date", { mode: "string" }),
    preferredEndDate: date("preferred_end_date", { mode: "string" }),
    travellers: int("travellers"),
    interestedIn: text("interested_in"),
    message: text("message"),
    marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
    marketingConsentSource: text("marketing_consent_source"),
    marketingOptedInAt: momentColumn("marketing_opted_in_at"),
    marketingOptOutAt: momentColumn("marketing_opt_out_at"),
    status: mysqlEnum("status", leadStatusValues).default("new").notNull(),
    source: varchar("source", { length: 100 }),
    assignedTo: uuidColumn("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
  },
  (table) => [
    index("leads_email_idx").on(table.email),
    index("leads_user_id_idx").on(table.userId),
    index("leads_level_source_idx").on(table.leadLevel, table.source),
  ],
);

export const leadActivities = mysqlTable("lead_activities", {
  id: uuidPrimaryColumn("id").primaryKey(),
  leadId: uuidColumn("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  userId: uuidColumn("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: defaultMomentColumn("created_at").notNull(),
});
