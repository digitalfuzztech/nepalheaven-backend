import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const connectionString = process.env["DATABASE_URL"];

if (connectionString && !/^mysql:\/\//i.test(connectionString)) {
  throw new Error("DATABASE_URL must use the mysql:// scheme.");
}

if (!connectionString && typeof window === "undefined") {
  // Keep frontend builds/imports safe; database operations must fail clearly at runtime.
  console.warn(
    "DATABASE_URL is not configured. Database access is unavailable until .env is configured.",
  );
}

const pool = connectionString
  ? createPool({
      uri: connectionString,
      connectionLimit: 10,
      timezone: "Z",
    })
  : null;

// Relational Query Builder v1 emits either LATERAL joins (default mode) or
// JSON_ARRAYAGG (PlanetScale mode). Neither is portable to MariaDB 10.4, so
// runtime reads use Drizzle's core query builder and the connection is kept
// deliberately schema-free to prevent accidental relational-query usage.
export const db = pool ? drizzle(pool) : null;
