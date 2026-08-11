import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is missing. Copy .env.example to .env and configure MySQL.",
  );
  process.exit(1);
}
if (!/^mysql:\/\//i.test(process.env.DATABASE_URL)) {
  console.error("DATABASE_URL must use the mysql:// scheme.");
  process.exit(1);
}
let connection;
try {
  connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    timezone: "Z",
  });
  const [[row]] = await connection.query(
    "SELECT DATABASE() AS database_name, VERSION() AS mysql_version",
  );
  console.log(
    `MySQL connection successful. Database: ${row.database_name}; Version: ${row.mysql_version}`,
  );
} catch (error) {
  console.error(`MySQL connection failed: ${error.code || error.message}`);
  process.exitCode = 1;
} finally {
  await connection?.end();
}
