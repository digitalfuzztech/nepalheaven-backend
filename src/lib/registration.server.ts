import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { countryName, isCountryCode } from "@/lib/countries";
import { issueEmailVerification } from "@/lib/email-verification.server";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8)
    .max(200)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid contact number.")
    .max(30)
    .regex(/^\+?[0-9][0-9 ()-]{5,28}[0-9]$/, "Enter a valid contact number."),
  nationality: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase())
    .refine(isCountryCode, "Select a valid nationality."),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.")
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year!, month! - 1, day));
      const today = new Date();
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month! - 1 &&
        date.getUTCDate() === day &&
        year! >= 1900 &&
        date <= today
      );
    }, "Enter a valid past date of birth."),
});

export class PublicRegistrationError extends Error {}

type RegistrationInput =
  | FormData
  | {
      name: string;
      email: string;
      phone: string;
      nationality: string;
      dateOfBirth: string;
      password: string;
    };

function text(input: RegistrationInput, key: string) {
  const value =
    input instanceof FormData
      ? input.get(key)
      : input[key as keyof Exclude<RegistrationInput, FormData>];
  return typeof value === "string" ? value : "";
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function registerCustomer(formData: RegistrationInput) {
  if (!db) throw new Error("Database is not configured.");
  const parsed = registrationSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    phone: text(formData, "phone"),
    nationality: text(formData, "nationality"),
    dateOfBirth: text(formData, "dateOfBirth"),
  });
  if (!parsed.success)
    throw new PublicRegistrationError(
      parsed.error.issues[0]?.message ?? "Review your registration details.",
    );
  const [existing] = await db
    .select({
      id: users.id,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing) {
    if (existing.role === "customer" && !existing.emailVerifiedAt) {
      const challenge = await issueEmailVerification(existing.id);
      return {
        pendingVerification: true as const,
        existingPending: true as const,
        verificationPath: challenge.verificationPath,
        sent: challenge.sent,
        message: challenge.sent
          ? "Your pending registration is ready. A verification code is being sent."
          : "Your account is awaiting verification. Please use the resend option if needed.",
      };
    }
    throw new PublicRegistrationError(
      "An account with this email already exists. Please sign in instead.",
    );
  }

  const country = countryName(parsed.data.nationality);
  if (!country)
    throw new PublicRegistrationError("Select a valid nationality.");

  const result = await db.transaction(async (transaction) => {
    const userId = randomUUID();
    await transaction.insert(users).values({
      id: userId,
      role: "customer",
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      phone: parsed.data.phone.replace(/[ ()-]/g, ""),
      country,
      nationality: parsed.data.nationality,
      dateOfBirth: parsed.data.dateOfBirth,
    });
    const [created] = await transaction
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!created) throw new Error("User insert could not be read back.");
    return {
      userId: created.id,
    };
  });
  const challenge = await issueEmailVerification(result.userId);
  return {
    pendingVerification: true as const,
    existingPending: false as const,
    verificationPath: challenge.verificationPath,
    sent: challenge.sent,
    message: challenge.sent
      ? "We're sending a six-digit verification code to your email."
      : "Your account is pending verification. You can request another email shortly.",
  };
}
