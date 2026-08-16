import mysql from "mysql2/promise";

const references = process.argv.slice(2);
if (!references.length) throw new Error("Checkout references are required.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [bookings] = await connection.query(
  `select bi.checkout_reference as checkoutReference,
          bi.selected_payment_option as paymentOption,
          bi.status as intentStatus,
          b.id as bookingId,
          b.booking_reference as bookingReference,
          b.status as bookingStatus,
          b.amount_initially_paid as amountPaid,
          b.remaining_balance_snapshot as remainingBalance,
          p.status as paymentStatus,
          p.provider_transaction_id as paymentReference
     from booking_intents bi
     left join bookings b on b.checkout_intent_id = bi.id
     left join payments p on p.booking_id = b.id
    where bi.checkout_reference in (?)`,
  [references],
);
const bookingIds = bookings.map((row) => row.bookingId).filter(Boolean);
const [emails] = bookingIds.length
  ? await connection.query(
      `select template_key as templateKey,
              delivery_status as deliveryStatus,
              from_address as fromAddress,
              to_address as toAddress,
              provider_message_id is not null as hasProviderMessageId,
              json_extract(metadata, '$.attachments') as attachments
         from lead_interactions
        where json_unquote(json_extract(metadata, '$.bookingId')) in (?)
        order by created_at`,
      [bookingIds],
    )
  : [[]];
console.log(JSON.stringify({ bookings, emails }, null, 2));
await connection.end();
