import { check, mysqlEnum, mysqlTable, text, tinyint, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { blogPosts } from "./cms";
import { users } from "./users";
import { defaultMomentColumn, uuidColumn, uuidPrimaryColumn } from "./columns";

export const blogLikes = mysqlTable("blog_likes", {
  id: uuidPrimaryColumn("id").primaryKey(),
  blogPostId: uuidColumn("blog_post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  userId: uuidColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: defaultMomentColumn("created_at").notNull(),
}, (table) => [uniqueIndex("blog_likes_post_user_unique").on(table.blogPostId, table.userId)]);

export const blogRatings = mysqlTable("blog_ratings", {
  id: uuidPrimaryColumn("id").primaryKey(),
  blogPostId: uuidColumn("blog_post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  userId: uuidColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: tinyint("rating", { unsigned: true }).notNull(),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
}, (table) => [
  uniqueIndex("blog_ratings_post_user_unique").on(table.blogPostId, table.userId),
  check("blog_ratings_rating_check", sql`${table.rating} between 1 and 5`),
]);

export const blogCommentStatusValues = ["published", "pending", "hidden"] as const;
export const blogComments = mysqlTable("blog_comments", {
  id: uuidPrimaryColumn("id").primaryKey(),
  blogPostId: uuidColumn("blog_post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  userId: uuidColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: mysqlEnum("status", blogCommentStatusValues).default("published").notNull(),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});
