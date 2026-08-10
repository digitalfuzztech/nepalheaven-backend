import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { destinations } from "./destinations";

export const packageDifficultyEnum = pgEnum("package_difficulty", [
  "easy",
  "moderate",
  "challenging",
  "extreme",
]);

export const packages = pgTable("packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  destinationId: uuid("destination_id").references(() => destinations.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  destinationLabel: text("destination_label"),
  style: text("style"),
  shortDescription: text("short_description"),
  description: text("description"),
  days: integer("days"),
  difficulty: packageDifficultyEnum("difficulty"),
  maxAltitude: integer("max_altitude"),
  startingPrice: numeric("starting_price", { precision: 12, scale: 2 }),
  oldPrice: numeric("old_price", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD").notNull(),
  cancellationFeePercentage: numeric("cancellation_fee_percentage", {
    precision: 5,
    scale: 2,
  }),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0).notNull(),
  heroImage: text("hero_image"),
  sortOrder: integer("sort_order").default(0).notNull(),
  status: boolean("status").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const packageDestinations = pgTable(
  "package_destinations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("package_destinations_package_destination_unique").on(
      table.packageId,
      table.destinationId,
    ),
  ],
);

export const packageHighlights = pgTable("package_highlights", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const packageTiers = pgTable("package_tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const packageItineraries = pgTable("package_itineraries", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  // Kept for existing numeric itineraries. New content should use dayLabel.
  day: integer("day"),
  dayLabel: text("day_label"),
  title: text("title").notNull(),
  description: text("description"),
  accommodation: text("accommodation"),
  meals: text("meals"),
  altitude: integer("altitude"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const packageInclusions = pgTable("package_inclusions", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const packageExclusions = pgTable("package_exclusions", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const packagesRelations = relations(packages, ({ many, one }) => ({
  primaryDestination: one(destinations, {
    fields: [packages.destinationId],
    references: [destinations.id],
    relationName: "primaryDestination",
  }),
  destinations: many(packageDestinations),
  highlights: many(packageHighlights),
  tiers: many(packageTiers),
  itineraries: many(packageItineraries),
  inclusions: many(packageInclusions),
  exclusions: many(packageExclusions),
}));

export const packageDestinationsRelations = relations(
  packageDestinations,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageDestinations.packageId],
      references: [packages.id],
    }),
    destination: one(destinations, {
      fields: [packageDestinations.destinationId],
      references: [destinations.id],
    }),
  }),
);

export const packageHighlightsRelations = relations(
  packageHighlights,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageHighlights.packageId],
      references: [packages.id],
    }),
  }),
);

export const packageTiersRelations = relations(packageTiers, ({ one }) => ({
  package: one(packages, {
    fields: [packageTiers.packageId],
    references: [packages.id],
  }),
}));

export const packageItinerariesRelations = relations(
  packageItineraries,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageItineraries.packageId],
      references: [packages.id],
    }),
  }),
);

export const packageInclusionsRelations = relations(
  packageInclusions,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageInclusions.packageId],
      references: [packages.id],
    }),
  }),
);

export const packageExclusionsRelations = relations(
  packageExclusions,
  ({ one }) => ({
    package: one(packages, {
      fields: [packageExclusions.packageId],
      references: [packages.id],
    }),
  }),
);
