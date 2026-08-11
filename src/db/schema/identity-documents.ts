import { relations } from "drizzle-orm";
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./users";
import { bookings } from "./bookings";
import { defaultMomentColumn, uuidColumn, uuidPrimaryColumn } from "./columns";

export const identityDocumentTypeValues = ["passport", "national_id"] as const;
export const identityVerificationStatusValues = [
  "pending",
  "verified",
  "rejected",
] as const;

export const userIdentityDocuments = mysqlTable(
  "user_identity_documents",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: mysqlEnum(
      "document_type",
      identityDocumentTypeValues,
    ).notNull(),
    storageKey: varchar("storage_key", { length: 191 }).notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: int("file_size").notNull(),
    verificationStatus: mysqlEnum(
      "verification_status",
      identityVerificationStatusValues,
    )
      .default("pending")
      .notNull(),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
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

export const bookingIdentityDocuments = mysqlTable(
  "booking_identity_documents",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    bookingId: uuidColumn("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: mysqlEnum(
      "document_type",
      identityDocumentTypeValues,
    ).notNull(),
    storageKey: varchar("storage_key", { length: 191 }).notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: int("file_size").notNull(),
    verificationStatus: mysqlEnum(
      "verification_status",
      identityVerificationStatusValues,
    )
      .default("pending")
      .notNull(),
    createdAt: defaultMomentColumn("created_at").notNull(),
    updatedAt: defaultMomentColumn("updated_at").notNull(),
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
