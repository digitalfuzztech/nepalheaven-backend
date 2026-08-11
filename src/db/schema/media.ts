import { mysqlEnum, mysqlTable, text } from "drizzle-orm/mysql-core";
import { defaultMomentColumn, uuidPrimaryColumn } from "./columns";

export const mediaTypeValues = ["image", "video"] as const;

export const media = mysqlTable("media", {
  id: uuidPrimaryColumn("id").primaryKey(),
  type: mysqlEnum("type", mediaTypeValues).notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  altText: text("alt_text"),
  title: text("title"),
  caption: text("caption"),
  provider: text("provider"),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});
