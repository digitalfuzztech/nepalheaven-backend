import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [journal] = await connection.query(
  "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 2",
);
const [attributionColumns] = await connection.query(
  "SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='whatsapp_attributions' ORDER BY ORDINAL_POSITION",
);
const [interactionColumns] = await connection.query(
  "SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_interactions' AND COLUMN_NAME IN ('lead_id','acquisition_source','context_type','context_slug','automatic_lead') ORDER BY ORDINAL_POSITION",
);
const [templateCount] = await connection.query(
  "SELECT COUNT(*) AS count FROM email_templates",
);
console.log(
  JSON.stringify(
    { journal, attributionColumns, interactionColumns, templateCount },
    null,
    2,
  ),
);
await connection.end();
