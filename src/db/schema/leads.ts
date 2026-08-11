import { date, int, mysqlEnum, mysqlTable, text } from "drizzle-orm/mysql-core";
import { users } from "./users";
import { packages } from "./packages";
import { defaultMomentColumn, uuidColumn, uuidPrimaryColumn } from "./columns";

export const leadTypeValues = [
  "itinerary_request",
  "brochure_request",
  "expert_request",
  "package_inquiry",
  "contact",
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

export const leads = mysqlTable("leads", {
  id: uuidPrimaryColumn("id").primaryKey(),
  userId: uuidColumn("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  packageId: uuidColumn("package_id").references(() => packages.id, {
    onDelete: "set null",
  }),
  type: mysqlEnum("type", leadTypeValues).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  travelDate: date("travel_date", { mode: "string" }),
  travellers: int("travellers"),
  message: text("message"),
  status: mysqlEnum("status", leadStatusValues).default("new").notNull(),
  source: text("source"),
  assignedTo: uuidColumn("assigned_to").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});

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
