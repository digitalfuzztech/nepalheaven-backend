import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && typeof window === "undefined") {
  // Keep frontend builds/imports safe; database operations must fail clearly at runtime.
  console.warn("DATABASE_URL is not configured. Database access is unavailable until .env is configured.");
}

const client = connectionString ? postgres(connectionString, { prepare: false }) : null;

export const db = client ? drizzle(client, { schema }) : null;
export { schema };
