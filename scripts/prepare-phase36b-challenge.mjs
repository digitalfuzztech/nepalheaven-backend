import { createHash, randomBytes, randomUUID, scryptSync } from "node:crypto";
import mysql from "mysql2/promise";

const email = process.argv[2]?.trim().toLowerCase();
const code = process.argv[3] || "048231";
const mode = process.argv[4] || "active";
if (!email || !/^\d{6}$/.test(code))
  throw new Error("Email and a six-digit code are required.");
if (!new Set(["active", "expired"]).has(mode))
  throw new Error("Challenge mode must be active or expired.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [[user]] = await connection.execute(
  "select id from users where email = ? and role = 'customer' limit 1",
  [email],
);
if (!user) throw new Error("Controlled test customer was not found.");
await connection.execute(
  "update email_verification_challenges set used_at = now(3) where user_id = ? and used_at is null",
  [user.id],
);
const token = randomBytes(32).toString("base64url");
const salt = randomBytes(16).toString("hex");
const derived = scryptSync(code, salt, 32, { N: 16384, r: 8, p: 1 });
const timingSql =
  mode === "expired"
    ? "date_sub(utc_timestamp(3), interval 1 minute), date_sub(utc_timestamp(3), interval 16 minute)"
    : "date_add(utc_timestamp(3), interval 13 minute), date_sub(utc_timestamp(3), interval 2 minute)";
await connection.execute(
  `insert into email_verification_challenges (id, user_id, code_hash, token_hash, expires_at, created_at) values (?, ?, ?, ?, ${timingSql})`,
  [
    randomUUID(),
    user.id,
    `scrypt$${salt}$${derived.toString("hex")}`,
    createHash("sha256").update(token).digest("hex"),
  ],
);
console.log(
  `/verify-email?token=${encodeURIComponent(token)}&address=controlled-test`,
);
await connection.end();
