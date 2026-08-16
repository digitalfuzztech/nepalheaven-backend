import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { destinations } from "./destinations";
import { defaultMomentColumn, uuidColumn, uuidPrimaryColumn } from "./columns";

export const packageDifficultyValues = [
  "easy",
  "moderate",
  "challenging",
  "extreme",
] as const;

export const cancellationFeeTypeValues = ["fixed", "percentage"] as const;

export const packages = mysqlTable("packages", {
  id: uuidPrimaryColumn("id").primaryKey(),
  destinationId: uuidColumn("destination_id").references(
    () => destinations.id,
    {
      onDelete: "set null",
    },
  ),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  destinationLabel: text("destination_label"),
  style: text("style"),
  shortDescription: text("short_description"),
  description: text("description"),
  days: int("days"),
  difficulty: mysqlEnum("difficulty", packageDifficultyValues),
  maxAltitude: int("max_altitude"),
  startingPrice: decimal("starting_price", { precision: 12, scale: 2 }),
  oldPrice: decimal("old_price", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD").notNull(),
  cancellationFeePercentage: decimal("cancellation_fee_percentage", {
    precision: 5,
    scale: 2,
  }),
  cancellationFeeType: mysqlEnum(
    "cancellation_fee_type",
    cancellationFeeTypeValues,
  ),
  cancellationFeeValue: decimal("cancellation_fee_value", {
    precision: 12,
    scale: 2,
  }),
  cancellationPolicyText: text("cancellation_policy_text"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: int("review_count").default(0).notNull(),
  heroImage: text("hero_image"),
  sortOrder: int("sort_order").default(0).notNull(),
  status: boolean("status").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: defaultMomentColumn("created_at").notNull(),
  updatedAt: defaultMomentColumn("updated_at").notNull(),
});

export const packageDestinations = mysqlTable(
  "package_destinations",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    packageId: uuidColumn("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    destinationId: uuidColumn("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    sortOrder: int("sort_order").default(0).notNull(),
  },
  (table) => [
    uniqueIndex("package_destinations_package_destination_unique").on(
      table.packageId,
      table.destinationId,
    ),
  ],
);

export const packageHighlights = mysqlTable("package_highlights", {
  id: uuidPrimaryColumn("id").primaryKey(),
  packageId: uuidColumn("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const packageTiers = mysqlTable("package_tiers", {
  id: uuidPrimaryColumn("id").primaryKey(),
  packageId: uuidColumn("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const packageItineraries = mysqlTable("package_itineraries", {
  id: uuidPrimaryColumn("id").primaryKey(),
  packageId: uuidColumn("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  // Kept for existing numeric itineraries. New content should use dayLabel.
  day: int("day"),
  dayLabel: text("day_label"),
  title: text("title").notNull(),
  description: text("description"),
  accommodation: text("accommodation"),
  meals: text("meals"),
  altitude: int("altitude"),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const packageInclusions = mysqlTable("package_inclusions", {
  id: uuidPrimaryColumn("id").primaryKey(),
  packageId: uuidColumn("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
});

export const packageExclusions = mysqlTable("package_exclusions", {
  id: uuidPrimaryColumn("id").primaryKey(),
  packageId: uuidColumn("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
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
