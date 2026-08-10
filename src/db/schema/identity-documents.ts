import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { bookings } from "./bookings";

export const identityDocumentTypeEnum = pgEnum("identity_document_type", [
  "passport",
  "national_id",
]);
export const identityVerificationStatusEnum = pgEnum(
  "identity_verification_status",
  ["pending", "verified", "rejected"],
);

export const userIdentityDocuments = pgTable(
  "user_identity_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: identityDocumentTypeEnum("document_type").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    verificationStatus: identityVerificationStatusEnum("verification_status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("user_identity_documents_user_id_idx").on(table.userId)],
);

export const userIdentityDocumentsRelations = relations(
  userIdentityDocuments,
  ({ one }) => ({
    user: one(users, {
      fields: [userIdentityDocuments.userId],
      references: [users.id],
    }),
  }),
);

export const bookingIdentityDocuments = pgTable(
  "booking_identity_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: identityDocumentTypeEnum("document_type").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    verificationStatus: identityVerificationStatusEnum("verification_status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("booking_identity_documents_user_id_idx").on(table.userId)],
);

export const bookingIdentityDocumentsRelations = relations(
  bookingIdentityDocuments,
  ({ one }) => ({
    booking: one(bookings, {
      fields: [bookingIdentityDocuments.bookingId],
      references: [bookings.id],
    }),
    user: one(users, {
      fields: [bookingIdentityDocuments.userId],
      references: [users.id],
    }),
  }),
);
