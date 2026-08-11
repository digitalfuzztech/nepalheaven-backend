import { index, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { users } from "./users";
import {
  defaultMomentColumn,
  momentColumn,
  uuidColumn,
  uuidPrimaryColumn,
} from "./columns";

export const sessions = mysqlTable(
  "sessions",
  {
    id: uuidPrimaryColumn("id").primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: momentColumn("expires_at").notNull(),
    createdAt: defaultMomentColumn("created_at").notNull(),
    revokedAt: momentColumn("revoked_at"),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
);
