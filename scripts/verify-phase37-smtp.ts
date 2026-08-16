import { sendTemplatedEmail } from "../src/lib/email.server.ts";
import { getMailRouting } from "../src/lib/mail-routing.server.ts";

if (process.env["MAIL_MODE"] !== "smtp")
  throw new Error("MAIL_MODE=smtp is required for the Phase 3.7 SMTP test.");

const routing = getMailRouting();
const recipient =
  process.env["MAIL_TEST_TO"]?.trim() || routing.general.internalRecipient;
const marker = `PHASE 3.7 ROUTING ${new Date().toISOString()}`;
const variables = {
  fullName: "Phase 3.7 SMTP Traveller",
  customerName: "Phase 3.7 SMTP Traveller",
  customerEmail: recipient,
  email: recipient,
  destinationName: "Everest Region",
  experienceName: "Adventure",
  interestedIn: marker,
  preferredDate: "Dates to be confirmed",
  verificationCode: "012345",
  verificationUrl: "https://nepalheaven.com/verify-email?token=phase37-opaque",
  accountUrl: "https://nepalheaven.com/account",
  resetUrl: "https://nepalheaven.com/reset-password?token=phase37-opaque",
  bookingReference: "NH-PHASE37",
  bookingUrl: "https://nepalheaven.com/account/bookings/NH-PHASE37",
  expiryMinutes: 15,
};

const cases = [
  ["contact_customer_acknowledgment", "info"],
  ["destination_customer_acknowledgment", "journeys"],
  ["experience_customer_acknowledgment", "journeys"],
  ["booking_customer_confirmation", "bookings"],
  ["customer_email_verification", "register"],
  ["customer_email_verified", "register"],
  ["customer_password_reset", "register"],
] as const;

const results = [];
for (const [templateKey, identity] of cases) {
  try {
    const sent = await sendTemplatedEmail({
      templateKey,
      to: recipient,
      variables,
    });
    results.push({
      identity,
      templateKey,
      status: sent.accepted ? "accepted" : "not_accepted",
      from: sent.from,
      replyTo: sent.replyTo,
      providerMessageId: sent.messageId,
    });
  } catch (error) {
    results.push({
      identity,
      templateKey,
      status: "failed",
      error:
        error instanceof Error
          ? error.message.replace(
              /(pass(word)?|credential)\s*[=:]\s*\S+/gi,
              "$1=[redacted]",
            )
          : "Unknown SMTP failure",
    });
  }
}

console.log(JSON.stringify({ recipient, results }, null, 2));
if (results.some((result) => result.status !== "accepted")) process.exit(1);
process.exit(0);
