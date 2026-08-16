import mysql from "mysql2/promise";

const prefix = process.argv[2] || "phase3rel-%";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [leadRows] = await connection.execute(
  `select l.id, l.email, l.lead_level as leadLevel, l.source, l.status,
          i.direction, i.interaction_type as interactionType,
          i.template_key as templateKey, i.delivery_status as deliveryStatus,
          i.from_address as fromAddress, i.to_address as toAddress,
          i.provider_message_id as providerMessageId,
          (i.provider_message_id is not null) as hasProviderMessageId,
          left(coalesce(i.failure_reason, ''), 300) as failureReason,
          i.created_at as createdAt
     from leads l
     left join lead_interactions i on i.lead_id = l.id
    where l.email like ?
    order by l.created_at desc, i.created_at asc`,
  [prefix],
);
const [accountRows] = await connection.execute(
  `select u.email, i.template_key as templateKey,
          i.delivery_status as deliveryStatus, i.from_address as fromAddress,
          i.to_address as toAddress,
          json_unquote(json_extract(i.metadata, '$.eventId')) as eventId,
          (i.provider_message_id is not null) as hasProviderMessageId,
          left(coalesce(i.failure_reason, ''), 300) as failureReason,
          i.created_at as createdAt
     from users u
     join lead_interactions i on i.metadata like concat('%', u.id, '%')
    where u.email like ?
    order by i.created_at asc`,
  [prefix],
);
const [[threads]] = await connection.query(
  "show status where Variable_name = 'Threads_connected'",
);
const keys = [
  "MAIL_MODE",
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_SECURE",
  "MAIL_INFO_ADDRESS",
  "MAIL_INFO_USER",
  "MAIL_INFO_PASSWORD",
  "MAIL_ADMIN_ADDRESS",
  "MAIL_ADMIN_USER",
  "MAIL_ADMIN_PASSWORD",
  "MAIL_JOURNEYS_ADDRESS",
  "MAIL_BOOKING_ADDRESS",
  "MAIL_BOOKINGS_ADDRESS",
  "MAIL_REGISTER_ADDRESS",
  "APP_URL",
];
const environment = Object.fromEntries(
  keys.map((key) => [key, process.env[key]?.trim() ? "present" : "missing"]),
);
console.log(
  JSON.stringify(
    {
      environment,
      leads: leadRows,
      accountEmails: accountRows,
      mysqlThreadsConnected: Number(threads.Value),
    },
    null,
    2,
  ),
);
await connection.end();
