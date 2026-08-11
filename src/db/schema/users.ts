import {
  date,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  defaultMomentColumn,
  momentColumn,
  uuidPrimaryColumn,
} from "./columns";

export const userRoleValues = ["admin", "customer"] as const;

export const users = mysqlTable("users", {
  id: uuidPrimaryColumn("id").primaryKey(),
  role: mysqlEnum("role", userRoleValues).notNull().default("customer"),
  name: text("name").notNull(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  country: text("country"),
  nationality: text("nationality"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  avatarUrl: text("avatar_url"),
  emailVerifiedAt: momentColumn("email_verified_at"),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});
