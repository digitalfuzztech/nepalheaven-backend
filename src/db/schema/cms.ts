import { relations } from "drizzle-orm";
import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";

export const blogCategories = mysqlTable("blog_categories", {
  id: uuidPrimaryColumn("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
});

export const blogPosts = mysqlTable("blog_posts", {
  id: uuidPrimaryColumn("id").primaryKey(),
  categoryId: uuidColumn("category_id").references(() => blogCategories.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  coverImage: text("cover_image"),
  authorName: text("author_name"),
  authorRole: text("author_role"),
  readingTimeMinutes: int("reading_time_minutes"),
  status: text("status").default("draft").notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: momentColumn("published_at"),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});

export const testimonials = mysqlTable("testimonials", {
  id: uuidPrimaryColumn("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  content: text("content").notNull(),
  rating: text("rating"),
  tripName: text("trip_name"),
  avatarUrl: text("avatar_url"),
  sortOrder: int("sort_order").default(0).notNull(),
  status: text("status").default("published").notNull(),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});

export const blogCategoriesRelations = relations(
  blogCategories,
  ({ many }) => ({
    posts: many(blogPosts),
  }),
);

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
}));

export const faqs = mysqlTable("faqs", {
  id: uuidPrimaryColumn("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  sortOrder: text("sort_order").default("0").notNull(),
  status: text("status").default("published").notNull(),
});

export const siteSettings = mysqlTable("site_settings", {
  id: uuidPrimaryColumn("id").primaryKey(),
  key: varchar("key", { length: 191 }).notNull().unique(),
  value: text("value"),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});
