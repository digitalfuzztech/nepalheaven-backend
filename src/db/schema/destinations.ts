import { relations } from "drizzle-orm";
import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description"),
  description: text("description"),
  heroImage: text("hero_image"),
  region: text("region"),
  category: text("category"),
  difficulty: text("difficulty"),
  duration: text("duration"),
  altitudeLabel: text("altitude_label"),
  minAltitude: integer("min_altitude"),
  maxAltitude: integer("max_altitude"),
  // Retained for backwards compatibility. Use altitudeLabel/minAltitude/maxAltitude for new content.
  elevation: integer("elevation"),
  bestSeason: text("best_season"),
  cancellationFeePercentage: numeric("cancellation_fee_percentage", {
    precision: 5,
    scale: 2,
  }),
  sortOrder: integer("sort_order").default(0).notNull(),
  status: boolean("status").default(true).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const destinationHighlights = pgTable("destination_highlights", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const destinationTips = pgTable("destination_tips", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const destinationItineraries = pgTable("destination_itineraries", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  dayLabel: text("day_label").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const destinationInclusions = pgTable("destination_inclusions", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const destinationExclusions = pgTable("destination_exclusions", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const destinationsRelations = relations(destinations, ({ many }) => ({
  highlights: many(destinationHighlights),
  tips: many(destinationTips),
  itineraries: many(destinationItineraries),
  inclusions: many(destinationInclusions),
  exclusions: many(destinationExclusions),
}));

export const destinationHighlightsRelations = relations(destinationHighlights, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationHighlights.destinationId],
    references: [destinations.id],
  }),
}));

export const destinationTipsRelations = relations(destinationTips, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationTips.destinationId],
    references: [destinations.id],
  }),
}));

export const destinationItinerariesRelations = relations(destinationItineraries, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationItineraries.destinationId],
    references: [destinations.id],
  }),
}));

export const destinationInclusionsRelations = relations(destinationInclusions, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationInclusions.destinationId],
    references: [destinations.id],
  }),
}));

export const destinationExclusionsRelations = relations(destinationExclusions, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationExclusions.destinationId],
    references: [destinations.id],
  }),
}));
