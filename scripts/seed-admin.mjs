import mysql from "mysql2/promise";
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Configure .env first.");
  process.exit(1);
}
if (!/^mysql:\/\//i.test(connectionString)) {
  console.error("DATABASE_URL must use the mysql:// scheme.");
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(
    "ADMIN_EMAIL is missing or invalid. Set it before seeding admin.",
  );
  process.exit(1);
}
const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error(
    "ADMIN_PASSWORD is missing. Set it in .env before seeding the admin account.",
  );
  process.exit(1);
}

const connection = await mysql.createConnection({
  uri: connectionString,
  timezone: "Z",
});
const salt = randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
const hash = `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;

const [existing] = await connection.execute(
  "SELECT id FROM users WHERE email = ? LIMIT 1",
  [email],
);
if (existing.length) {
  await connection.execute(
    "UPDATE users SET role = 'admin', password_hash = ?, name = 'Nepal Heaven Admin', email_verified_at = COALESCE(email_verified_at, NOW(3)), updated_at = NOW() WHERE email = ?",
    [hash, email],
  );
  console.log(`Admin account updated: ${email}`);
} else {
  await connection.execute(
    "INSERT INTO users (id, role, name, email, password_hash, email_verified_at) VALUES (?, 'admin', 'Nepal Heaven Admin', ?, ?, NOW(3))",
    [randomUUID(), email, hash],
  );
  console.log(`Admin account created: ${email}`);
}

await connection.end();
