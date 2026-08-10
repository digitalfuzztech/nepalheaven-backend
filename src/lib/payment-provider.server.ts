import { randomBytes } from "node:crypto";

export type MockCardInput = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

export class PaymentProviderError extends Error {
  constructor(public readonly code: "UNAVAILABLE" | "INVALID_CARD" | "DECLINED", message: string) {
    super(message);
  }
}

function requireDevelopmentMockMode() {
  if (process.env["NODE_ENV"] === "production" || process.env["PAYMENT_MODE"] !== "mock")
    throw new PaymentProviderError("UNAVAILABLE", "Development mock payment is not available.");
}

function validateMockCard(input: MockCardInput) {
  const name = input.cardholderName.trim();
  const number = input.cardNumber.replace(/[ -]/g, "");
  if (name.length < 2 || name.length > 120 || !/^\d{12,19}$/.test(number) || !/^\d{3,4}$/.test(input.cvv))
    throw new PaymentProviderError("INVALID_CARD", "Enter valid development card details.");
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(input.expiry.trim());
  if (!match) throw new PaymentProviderError("INVALID_CARD", "Enter expiry as MM/YY.");
  const expiryEnd = new Date(Date.UTC(2000 + Number(match[2]), Number(match[1]), 1));
  if (expiryEnd <= new Date()) throw new PaymentProviderError("INVALID_CARD", "The development card is expired.");
  if (number === "4000000000000002")
    throw new PaymentProviderError("DECLINED", "The development test card was declined.");
}

export async function chargeDevelopmentMockCard(input: MockCardInput, amount: string, currency: string) {
  requireDevelopmentMockMode();
  validateMockCard(input);
  // Card fields deliberately cease to exist outside this call. They are never
  // returned, logged, persisted, or included in provider metadata.
  return {
    status: "succeeded" as const,
    amount,
    currency,
    provider: "dev_mock",
    providerTransactionId: `mock_pay_${randomBytes(12).toString("hex")}`,
    verifiedAt: new Date(),
    verificationContext: "development_mock_provider_verified_charge",
  };
}

export async function refundDevelopmentMockPayment(amount: string, currency: string) {
  requireDevelopmentMockMode();
  return {
    status: "succeeded" as const,
    amount,
    currency,
    provider: "dev_mock",
    providerTransactionId: `mock_ref_${randomBytes(12).toString("hex")}`,
    verifiedAt: new Date(),
  };
}
