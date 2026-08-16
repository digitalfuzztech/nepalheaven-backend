import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [columns] = await connection.query(`
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND (
      (table_name = 'packages' AND column_name IN (
        'cancellation_fee_type', 'cancellation_fee_value', 'cancellation_policy_text'
      ))
      OR
      (table_name = 'bookings' AND column_name IN (
        'cancellation_fee_type_snapshot', 'cancellation_fee_value_snapshot',
        'amount_paid_at_cancellation_snapshot', 'previously_refunded_amount_snapshot',
        'refund_processing_deadline'
      ))
    )
  ORDER BY table_name, column_name
`);
const [migrations] = await connection.query(
  "SELECT COUNT(*) migration_count, MAX(created_at) latest_created_at FROM __drizzle_migrations",
);
const [smtp] = await connection.query(
  `SELECT template_key, from_address, to_address, delivery_status, provider,
          provider_message_id IS NOT NULL AS has_message_id
   FROM lead_interactions
   WHERE metadata LIKE '%NH-2026-A82539888CE04952%'
   ORDER BY template_key`,
);
console.log(
  JSON.stringify({ columns, migrations: migrations[0], smtp }, null, 2),
);
await connection.end();
