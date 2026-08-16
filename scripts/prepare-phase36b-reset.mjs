import { createHash, randomBytes, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("A controlled customer email is required.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [[user]] = await connection.execute(
  "select id from users where email = ? and role = 'customer' and email_verified_at is not null limit 1",
  [email],
);
if (!user) throw new Error("A verified controlled customer was not found.");

await connection.execute(
  "update password_reset_tokens set used_at = utc_timestamp(3) where user_id = ? and used_at is null",
  [user.id],
);
const token = randomBytes(32).toString("base64url");
await connection.execute(
  "insert into password_reset_tokens (id, user_id, token_hash, expires_at, created_at) values (?, ?, ?, date_add(utc_timestamp(3), interval 30 minute), utc_timestamp(3))",
  [randomUUID(), user.id, createHash("sha256").update(token).digest("hex")],
);
console.log(`/reset-password?token=${encodeURIComponent(token)}`);
await connection.end();
