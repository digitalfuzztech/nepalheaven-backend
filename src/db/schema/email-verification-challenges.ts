import { index, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import { users } from "./users";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";

export const emailVerificationChallenges = mysqlTable(
  "email_verification_challenges",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: momentColumn("expires_at").notNull(),
    attemptCount: int("attempt_count").default(0).notNull(),
    usedAt: momentColumn("used_at"),
    createdAt: defaultMomentColumn("created_at").notNull(),
  },
  (table) => [
    index("email_verification_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("email_verification_expiry_idx").on(table.expiresAt),
  ],
);
