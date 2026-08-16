import mysql from "mysql2/promise";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Email argument is required.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [[user]] = await connection.execute(
  "select id, email, role, email_verified_at as emailVerifiedAt from users where email = ? limit 1",
  [email],
);
let challenges = [];
let interactions = [];
let sessions = [];
if (user) {
  [challenges] = await connection.execute(
    "select id, expires_at as expiresAt, attempt_count as attemptCount, used_at as usedAt, created_at as createdAt from email_verification_challenges where user_id = ? order by created_at desc",
    [user.id],
  );
  [interactions] = await connection.execute(
    "select template_key as templateKey, delivery_status as deliveryStatus, provider_message_id as providerMessageId, created_at as createdAt from lead_interactions where metadata like ? order by created_at desc",
    [`%${user.id}%`],
  );
  [sessions] = await connection.execute(
    "select id, expires_at as expiresAt, revoked_at as revokedAt from sessions where user_id = ? order by created_at desc",
    [user.id],
  );
}
const [[templateCount]] = await connection.execute(
  "select count(*) as total from email_templates",
);
const [[verifiedTemplate]] = await connection.execute(
  "select html_template as htmlTemplate, text_template as textTemplate from email_templates where `key` = 'customer_email_verified' limit 1",
);
console.log(
  JSON.stringify(
    {
      user: user || null,
      challenges,
      interactions,
      sessions,
      templateCount: Number(templateCount.total),
      verifiedTemplate: verifiedTemplate || null,
    },
    null,
    2,
  ),
);
await connection.end();
