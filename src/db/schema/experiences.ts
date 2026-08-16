import { boolean, int, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { packages } from "./packages";
import { defaultMomentColumn, uuidColumn, uuidPrimaryColumn } from "./columns";

export const experienceCategories = mysqlTable("experience_categories", {
  id: uuidPrimaryColumn("id").primaryKey(), slug: varchar("slug", { length: 191 }).notNull().unique(), name: text("name").notNull(),
  shortDescription: text("short_description"), description: text("description"), heroImage: text("hero_image"), sortOrder: int("sort_order").default(0).notNull(),
  status: boolean("status").default(true).notNull(), seoTitle: text("seo_title"), seoDescription: text("seo_description"),
  createdAt: defaultMomentColumn("created_at").notNull(), updatedAt: defaultMomentColumn("updated_at").notNull(),
});
export const experienceHighlights = mysqlTable("experience_highlights", {
  id: uuidPrimaryColumn("id").primaryKey(), experienceId: uuidColumn("experience_id").notNull().references(() => experienceCategories.id, { onDelete: "cascade" }),
  item: text("item").notNull(), sortOrder: int("sort_order").default(0).notNull(),
});
export const experiencePackages = mysqlTable("experience_packages", {
  id: uuidPrimaryColumn("id").primaryKey(), experienceId: uuidColumn("experience_id").notNull().references(() => experienceCategories.id, { onDelete: "cascade" }),
  packageId: uuidColumn("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }), sortOrder: int("sort_order").default(0).notNull(),
}, (table) => [uniqueIndex("experience_packages_experience_package_unique").on(table.experienceId, table.packageId)]);
