import postgres from "postgres";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing. Configure .env first.");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL || "admin@nepalheaven.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error("ADMIN_PASSWORD is missing. Set it in .env before seeding the admin account.");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });
const salt = randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
const hash = `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;

const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
if (existing.length) {
  await sql`
    UPDATE users
    SET role = 'admin', password_hash = ${hash}, name = 'Nepal Heaven Admin', updated_at = NOW()
    WHERE email = ${email}
  `;
  console.log(`Admin account updated: ${email}`);
} else {
  await sql`
    INSERT INTO users (role, name, email, password_hash)
    VALUES ('admin', 'Nepal Heaven Admin', ${email}, ${hash})
  `;
  console.log(`Admin account created: ${email}`);
}

await sql.end();
