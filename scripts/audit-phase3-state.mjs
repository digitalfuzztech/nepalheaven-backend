import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [tables] = await connection.query(
  "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('email_templates','lead_interactions','newsletter_subscribers') ORDER BY TABLE_NAME",
);
const [columns] = await connection.query(
  "SELECT COLUMN_NAME,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leads' AND COLUMN_NAME IN ('lead_level','marketing_opt_in','destination_id','experience_id') ORDER BY COLUMN_NAME",
);
const [journal] = await connection.query(
  "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 5",
);
const [indexes] = await connection.query(
  "SELECT TABLE_NAME,INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS_LIST FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('leads','lead_interactions','newsletter_subscribers','email_templates') GROUP BY TABLE_NAME,INDEX_NAME ORDER BY TABLE_NAME,INDEX_NAME",
);
const [foreignKeys] = await connection.query(
  "SELECT TABLE_NAME,CONSTRAINT_NAME,REFERENCED_TABLE_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN ('leads','lead_interactions','newsletter_subscribers') ORDER BY TABLE_NAME,CONSTRAINT_NAME",
);
console.log(
  JSON.stringify({ tables, columns, indexes, foreignKeys, journal }, null, 2),
);
await connection.end();
