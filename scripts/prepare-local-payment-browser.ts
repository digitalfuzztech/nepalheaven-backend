import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { bookingIntents } from "../src/db/schema/bookings.ts";
import { packages, packageTiers } from "../src/db/schema/packages.ts";
import { users } from "../src/db/schema/users.ts";
import { hashPassword } from "../src/lib/auth.server.ts";
import {
  calculateCommercialAmounts,
  centsToMoney,
} from "../src/lib/booking-money.ts";
import { getBookingCommercialConfiguration } from "../src/lib/booking-settings.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
const option = process.argv[2] === "full" ? "full" : "minimum";
const email = "phase-local-payment@example.test";
const password = "PhaseLocalPaymentA1";
const now = new Date();
await db
  .insert(users)
  .values({
    id: randomUUID(),
    role: "customer",
    name: "Local Payment Browser Traveller",
    email,
    passwordHash: await hashPassword(password),
    phone: "+9779800000099",
    country: "Nepal",
    nationality: "Nepali",
    dateOfBirth: "1990-01-01",
    emailVerifiedAt: now,
  })
  .onDuplicateKeyUpdate({
    set: {
      passwordHash: await hashPassword(password),
      emailVerifiedAt: now,
      updatedAt: now,
    },
  });
const [customer] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
const [journey] = await db
  .select({
    packageId: packages.id,
    tierId: packageTiers.id,
    tierPrice: packageTiers.price,
    currency: packageTiers.currency,
  })
  .from(packages)
  .innerJoin(packageTiers, eq(packageTiers.packageId, packages.id))
  .where(eq(packages.status, true))
  .limit(1);
if (!customer || !journey) throw new Error("Payment fixtures unavailable.");
const config = await getBookingCommercialConfiguration();
const amounts = calculateCommercialAmounts(journey.tierPrice, 2, config);
const checkout = `CHK-${new Date().getUTCFullYear()}-${randomUUID()
  .replaceAll("-", "")
  .slice(0, 24)
  .toUpperCase()}`;
await db.insert(bookingIntents).values({
  id: randomUUID(),
  checkoutReference: checkout,
  userId: customer.id,
  packageId: journey.packageId,
  packageTierId: journey.tierId,
  departureDate: "2027-10-15",
  travellers: 2,
  primaryTravellerFirstName: "Local Payment",
  primaryTravellerLastName: "Traveller",
  primaryTravellerEmail: email,
  primaryTravellerPhone: "+9779800000099",
  primaryTravellerNationality: "Nepali",
  primaryTravellerDateOfBirth: "1990-01-01",
  notes: `LOCAL BROWSER ${option.toUpperCase()} PAYMENT TEST`,
  unitPriceSnapshot: centsToMoney(amounts.unitPriceCents),
  subtotal: centsToMoney(amounts.subtotalCents),
  vatEnabledSnapshot: config.vatEnabled,
  vatPercentageSnapshot: config.vatPercentage.toFixed(2),
  vatAmount: centsToMoney(amounts.vatAmountCents),
  grandTotal: centsToMoney(amounts.grandTotalCents),
  minimumDepositPercentageSnapshot: config.minimumDepositPercentage.toFixed(2),
  minimumDepositAmount: centsToMoney(amounts.minimumDepositCents),
  balanceDueDaysSnapshot: config.balanceDueDaysBeforeDeparture,
  cancellationFeePercentageSnapshot: "0.00",
  cancellationPolicySourceSnapshot: "local_browser_test",
  currency: journey.currency,
  selectedPaymentOption: option,
  status: "open",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
});
console.log(JSON.stringify({ checkout, email, password, option }));
process.exit(0);
