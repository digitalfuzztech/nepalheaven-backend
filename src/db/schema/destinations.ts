import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  int,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { defaultMomentColumn, uuidColumn, uuidPrimaryColumn } from "./columns";

export const destinations = mysqlTable("destinations", {
  id: uuidPrimaryColumn("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  shortDescription: text("short_description"),
  description: text("description"),
  heroImage: text("hero_image"),
  region: text("region"),
  category: text("category"),
  difficulty: text("difficulty"),
  duration: text("duration"),
  altitudeLabel: text("altitude_label"),
  minAltitude: int("min_altitude"),
  maxAltitude: int("max_altitude"),
  // Retained for backwards compatibility. Use altitudeLabel/minAltitude/maxAltitude for new content.
  elevation: int("elevation"),
  bestSeason: text("best_season"),
  cancellationFeePercentage: decimal("cancellation_fee_percentage", {
    precision: 5,
    scale: 2,
  }),
  sortOrder: int("sort_order").default(0).notNull(),
  status: boolean("status").default(true).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});

export const destinationHighlights = mysqlTable("destination_highlights", {
  id: uuidPrimaryColumn("id").primaryKey(),
  destinationId: uuidColumn("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const destinationTips = mysqlTable("destination_tips", {
  id: uuidPrimaryColumn("id").primaryKey(),
  destinationId: uuidColumn("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const destinationItineraries = mysqlTable("destination_itineraries", {
  id: uuidPrimaryColumn("id").primaryKey(),
  destinationId: uuidColumn("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  dayLabel: text("day_label").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const destinationInclusions = mysqlTable("destination_inclusions", {
  id: uuidPrimaryColumn("id").primaryKey(),
  destinationId: uuidColumn("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const destinationExclusions = mysqlTable("destination_exclusions", {
  id: uuidPrimaryColumn("id").primaryKey(),
  destinationId: uuidColumn("destination_id")
    .notNull()
    .references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const destinationsRelations = relations(destinations, ({ many }) => ({
  highlights: many(destinationHighlights),
  tips: many(destinationTips),
  itineraries: many(destinationItineraries),
  inclusions: many(destinationInclusions),
  exclusions: many(destinationExclusions),
}));

export const destinationHighlightsRelations = relations(
  destinationHighlights,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [destinationHighlights.destinationId],
      references: [destinations.id],
    }),
  }),
);

export const destinationTipsRelations = relations(
  destinationTips,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [destinationTips.destinationId],
      references: [destinations.id],
    }),
  }),
);

export const destinationItinerariesRelations = relations(
  destinationItineraries,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [destinationItineraries.destinationId],
      references: [destinations.id],
    }),
  }),
);

export const destinationInclusionsRelations = relations(
  destinationInclusions,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [destinationInclusions.destinationId],
      references: [destinations.id],
    }),
  }),
);

export const destinationExclusionsRelations = relations(
  destinationExclusions,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [destinationExclusions.destinationId],
      references: [destinations.id],
    }),
  }),
);
