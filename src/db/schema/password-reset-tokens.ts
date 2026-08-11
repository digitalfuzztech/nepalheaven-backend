import { index, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { users } from "./users";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: momentColumn("expires_at").notNull(),
    usedAt: momentColumn("used_at"),
    createdAt: defaultMomentColumn("created_at").notNull(),
  },
  (table) => ({
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
    expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
);
