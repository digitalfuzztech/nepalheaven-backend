export type MailRouteKey =
  "general" | "journeys" | "bookings" | "registration" | "admin";

type MailRoute = {
  key: MailRouteKey;
  transport: "info" | "admin";
  address: string;
  fromName: string;
  replyTo: string;
  internalRecipient: string;
};

const canonicalAddresses = {
  info: "info@nepalheaven.com",
  admin: "admin@nepalheaven.com",
  journeys: "journeys@nepalheaven.com",
  bookings: "booking@nepalheaven.com",
  registration: "register@nepalheaven.com",
} as const;

function configuredAddress(
  key: string,
  fallback: (typeof canonicalAddresses)[keyof typeof canonicalAddresses],
) {
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return fallback;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new Error(`${key} must be a valid email address.`);
  return value;
}

export function getMailRouting(): Record<MailRouteKey, MailRoute> {
  const info = configuredAddress("MAIL_INFO_ADDRESS", canonicalAddresses.info);
  const admin = configuredAddress(
    "MAIL_ADMIN_ADDRESS",
    canonicalAddresses.admin,
  );
  const journeys = configuredAddress(
    "MAIL_JOURNEYS_ADDRESS",
    canonicalAddresses.journeys,
  );
  const bookings = process.env["MAIL_BOOKING_ADDRESS"]?.trim()
    ? configuredAddress("MAIL_BOOKING_ADDRESS", canonicalAddresses.bookings)
    : configuredAddress("MAIL_BOOKINGS_ADDRESS", canonicalAddresses.bookings);
  const registration = configuredAddress(
    "MAIL_REGISTER_ADDRESS",
    canonicalAddresses.registration,
  );
  return {
    general: {
      key: "general",
      transport: "info",
      address: info,
      fromName: "Nepal Heaven",
      replyTo: info,
      internalRecipient: info,
    },
    journeys: {
      key: "journeys",
      transport: "admin",
      address: journeys,
      fromName: "Nepal Heaven Journeys",
      replyTo: journeys,
      internalRecipient: journeys,
    },
    bookings: {
      key: "bookings",
      transport: "admin",
      address: bookings,
      fromName: "Nepal Heaven Bookings",
      replyTo: bookings,
      internalRecipient: bookings,
    },
    registration: {
      key: "registration",
      transport: "admin",
      address: registration,
      fromName: "Nepal Heaven Registration",
      replyTo: registration,
      internalRecipient: registration,
    },
    admin: {
      key: "admin",
      transport: "admin",
      address: admin,
      fromName: "Nepal Heaven Administration",
      replyTo: admin,
      internalRecipient: admin,
    },
  };
}

const templateRoutes: Record<string, MailRouteKey> = {
  newsletter_subscription_confirmation: "general",
  newsletter_admin_notification: "general",
  contact_customer_acknowledgment: "general",
  contact_admin_notification: "general",
  destination_customer_acknowledgment: "journeys",
  destination_admin_notification: "journeys",
  experience_customer_acknowledgment: "journeys",
  experience_admin_notification: "journeys",
  itinerary_customer_acknowledgment: "journeys",
  itinerary_admin_notification: "journeys",
  booking_customer_confirmation: "bookings",
  booking_admin_notification: "bookings",
  booking_cancellation_customer: "bookings",
  booking_cancellation_admin: "bookings",
  customer_email_verification: "registration",
  customer_email_verified: "registration",
  admin_new_traveller_registered: "admin",
  customer_password_reset: "registration",
  admin_password_reset: "admin",
};

export function getMailRouteForTemplate(templateKey: string) {
  const route = templateRoutes[templateKey];
  if (!route)
    throw new Error(`No canonical mail route for template: ${templateKey}`);
  return route;
}

export function getMailSenderName(templateKey: string, route: MailRoute) {
  return templateKey === "customer_password_reset"
    ? "Nepal Heaven Accounts"
    : route.fromName;
}

export function getSmtpCredentials(transport: "info" | "admin") {
  const routing = getMailRouting();
  if (transport === "info") {
    return {
      user:
        process.env["MAIL_INFO_USER"]?.trim() ||
        process.env["MAIL_USER"]?.trim() ||
        "",
      password:
        process.env["MAIL_INFO_PASSWORD"] || process.env["MAIL_PASSWORD"] || "",
    };
  }
  const legacyUser = process.env["MAIL_USER"]?.trim().toLowerCase() || "";
  const legacyIsAdmin = legacyUser === routing.admin.address;
  return {
    user:
      process.env["MAIL_ADMIN_USER"]?.trim() ||
      (legacyIsAdmin ? process.env["MAIL_USER"]?.trim() || "" : ""),
    password:
      process.env["MAIL_ADMIN_PASSWORD"] ||
      (legacyIsAdmin ? process.env["MAIL_PASSWORD"] || "" : ""),
  };
}

export function assertNoCustomerVisibleAdminAddress(input: {
  templateKey: string;
  fromAddress: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (getMailRouteForTemplate(input.templateKey) === "admin") return;
  const internalAddress = getMailRouting().admin.address.toLowerCase();
  const visible = [
    input.fromAddress,
    input.replyTo,
    input.subject,
    input.html,
    input.text,
  ]
    .join("\n")
    .toLowerCase();
  if (visible.includes(internalAddress))
    throw new Error(
      `Customer-visible email ${input.templateKey} contains the internal administrator address.`,
    );
}
