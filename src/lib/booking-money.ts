export type BookingCommercialConfiguration = {
  vatEnabled: boolean;
  vatPercentage: number;
  minimumDepositPercentage: number;
  balanceDueDaysBeforeDeparture: number;
};

export function moneyToCents(value: string | number) {
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized))
    throw new Error("Invalid monetary value.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  const cents = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(cents))
    throw new Error("Monetary value is too large.");
  return cents;
}

export function centsToMoney(cents: number) {
  if (!Number.isSafeInteger(cents)) throw new Error("Invalid monetary cents.");
  return (cents / 100).toFixed(2);
}

export function percentageToBasisPoints(value: string | number) {
  const numeric = Number(value);
  const basisPoints = Math.round(numeric * 100);
  if (!Number.isFinite(numeric) || basisPoints < 0 || basisPoints > 10_000)
    throw new Error("Percentage must be between 0 and 100.");
  return basisPoints;
}

function roundedPercentage(amountCents: number, basisPoints: number) {
  return Math.floor((amountCents * basisPoints + 5_000) / 10_000);
}

function minimumPercentage(amountCents: number, basisPoints: number) {
  return Math.ceil((amountCents * basisPoints) / 10_000);
}

export function calculateCommercialAmounts(
  unitPrice: string | number,
  travellers: number,
  configuration: BookingCommercialConfiguration,
) {
  if (!Number.isInteger(travellers) || travellers < 1 || travellers > 12)
    throw new Error("Traveller count must be between 1 and 12.");
  const unitPriceCents = moneyToCents(unitPrice);
  const subtotalCents = unitPriceCents * travellers;
  if (!Number.isSafeInteger(subtotalCents))
    throw new Error("Subtotal is too large.");
  const vatBasisPoints = percentageToBasisPoints(configuration.vatPercentage);
  const depositBasisPoints = percentageToBasisPoints(
    configuration.minimumDepositPercentage,
  );
  const vatAmountCents = configuration.vatEnabled
    ? roundedPercentage(subtotalCents, vatBasisPoints)
    : 0;
  const grandTotalCents = subtotalCents + vatAmountCents;
  const minimumDepositCents = minimumPercentage(
    grandTotalCents,
    depositBasisPoints,
  );
  return {
    unitPriceCents,
    subtotalCents,
    vatAmountCents,
    grandTotalCents,
    minimumDepositCents,
  };
}

export type CancellationFeeType = "fixed" | "percentage";

export function calculateCancellationFee(
  grandTotalCents: number,
  feeType: CancellationFeeType,
  feeValue: string | number,
) {
  if (!Number.isSafeInteger(grandTotalCents) || grandTotalCents < 0)
    throw new Error("Invalid booking grand total.");
  return feeType === "fixed"
    ? moneyToCents(feeValue)
    : roundedPercentage(grandTotalCents, percentageToBasisPoints(feeValue));
}

export function calculateRefund(
  netPaidCents: number,
  calculatedCancellationFeeCents: number,
) {
  if (
    !Number.isSafeInteger(netPaidCents) ||
    netPaidCents < 0 ||
    !Number.isSafeInteger(calculatedCancellationFeeCents) ||
    calculatedCancellationFeeCents < 0
  )
    throw new Error("Invalid cancellation amounts.");
  const cancellationFeeChargedCents = Math.min(
    calculatedCancellationFeeCents,
    netPaidCents,
  );
  return {
    cancellationFeeChargedCents,
    refundDueCents: Math.max(netPaidCents - cancellationFeeChargedCents, 0),
  };
}

export function calculateBalanceDueDate(
  departureDate: string,
  daysBeforeDeparture: number,
) {
  if (
    !Number.isInteger(daysBeforeDeparture) ||
    daysBeforeDeparture < 0 ||
    daysBeforeDeparture > 730
  )
    throw new Error("Balance due days must be between 0 and 730.");
  const date = new Date(`${departureDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid departure date.");
  date.setUTCDate(date.getUTCDate() - daysBeforeDeparture);
  return date.toISOString().slice(0, 10);
}
