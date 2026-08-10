import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema/cms";
import type { BookingCommercialConfiguration } from "@/lib/booking-money";

const keys = {
  vatEnabled: "booking.vat_enabled",
  vatPercentage: "booking.vat_percentage",
  minimumDepositPercentage: "booking.minimum_advance_percentage",
  balanceDueDaysBeforeDeparture: "booking.balance_due_days_before_departure",
  defaultCancellationFeePercentage: "booking.default_cancellation_fee_percentage",
} as const;

function parseJson(value: string | null) {
  if (value === null) throw new Error("Booking configuration is missing.");
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("Booking configuration is malformed.");
  }
}

function numberSetting(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} is not configured correctly.`);
  return value;
}

export async function getBookingCommercialConfiguration(): Promise<
  BookingCommercialConfiguration & { defaultCancellationFeePercentage: number }
> {
  if (!db) throw new Error("Database is not configured.");
  const rows = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(inArray(siteSettings.key, Object.values(keys)));
  const values = new Map(rows.map((row) => [row.key, parseJson(row.value)]));
  const vatEnabled = values.get(keys.vatEnabled);
  if (typeof vatEnabled !== "boolean")
    throw new Error("VAT enabled setting is not configured correctly.");
  const vatPercentage = numberSetting(
    values.get(keys.vatPercentage),
    "VAT percentage",
    0,
    100,
  );
  const minimumDepositPercentage = numberSetting(
    values.get(keys.minimumDepositPercentage),
    "Minimum deposit percentage",
    0.01,
    100,
  );
  const balanceDueDaysBeforeDeparture = numberSetting(
    values.get(keys.balanceDueDaysBeforeDeparture),
    "Balance due days",
    0,
    730,
  );
  if (!Number.isInteger(balanceDueDaysBeforeDeparture))
    throw new Error("Balance due days must be a whole number.");
  const defaultCancellationFeePercentage = numberSetting(
    values.get(keys.defaultCancellationFeePercentage),
    "Default cancellation fee percentage",
    0,
    100,
  );
  return {
    vatEnabled,
    vatPercentage: vatEnabled ? vatPercentage : 0,
    minimumDepositPercentage,
    balanceDueDaysBeforeDeparture,
    defaultCancellationFeePercentage,
  };
}
