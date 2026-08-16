import { createPool, type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const connectionString = process.env["DATABASE_URL"];
const socketPath = process.env["DB_SOCKET_PATH"]?.trim();

if (connectionString && !/^mysql:\/\//i.test(connectionString)) {
  throw new Error("DATABASE_URL must use the mysql:// scheme.");
}

if (!connectionString && typeof window === "undefined") {
  // Keep frontend builds/imports safe; database operations must fail clearly at runtime.
  console.warn(
    "DATABASE_URL is not configured. Database access is unavailable until .env is configured.",
  );
}

function socketConnectionOptions(uri: string, path: string) {
  const parsed = new URL(uri);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return {
    socketPath: path,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    connectionLimit: 10,
    maxIdle: 4,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    timezone: "Z",
  };
}

const databaseGlobal = globalThis as typeof globalThis & {
  __nepalHeavenMysqlPool?: Pool;
  __nepalHeavenMysqlPoolKey?: string;
};
const poolKey = connectionString
  ? `${connectionString}\0${socketPath ?? "tcp"}`
  : null;
const pool = connectionString
  ? databaseGlobal.__nepalHeavenMysqlPool &&
    databaseGlobal.__nepalHeavenMysqlPoolKey === poolKey
    ? databaseGlobal.__nepalHeavenMysqlPool
    : createPool(
        socketPath
          ? socketConnectionOptions(connectionString, socketPath)
          : {
              uri: connectionString,
              connectionLimit: 10,
              maxIdle: 4,
              idleTimeout: 60_000,
              enableKeepAlive: true,
              timezone: "Z",
            },
      )
  : null;

if (pool && poolKey) {
  databaseGlobal.__nepalHeavenMysqlPool = pool;
  databaseGlobal.__nepalHeavenMysqlPoolKey = poolKey;
}

// Relational Query Builder v1 emits either LATERAL joins (default mode) or
// JSON_ARRAYAGG (PlanetScale mode). Neither is portable to MariaDB 10.4, so
// runtime reads use Drizzle's core query builder and the connection is kept
// deliberately schema-free to prevent accidental relational-query usage.
export const db = pool ? drizzle(pool) : null;
