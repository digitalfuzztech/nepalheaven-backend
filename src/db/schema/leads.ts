import { pgEnum, pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { packages } from "./packages";

export const leadTypeEnum = pgEnum("lead_type", ["itinerary_request", "brochure_request", "expert_request", "package_inquiry", "contact"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "proposal", "booked", "lost", "closed"]);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
  type: leadTypeEnum("type").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  travelDate: timestamp("travel_date", { withTimezone: false }),
  travellers: integer("travellers"),
  message: text("message"),
  status: leadStatusEnum("status").default("new").notNull(),
  source: text("source"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leadActivities = pgTable("lead_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
