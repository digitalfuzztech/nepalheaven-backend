import { createHash, randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { isCountryCode } from "@/lib/countries";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

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
  country: z.string().trim().max(100).optional(),
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

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(token: string) {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  setResponseHeader(
    "Set-Cookie",
    `nepalheaven_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
}

export async function registerCustomer(formData: FormData) {
  if (!db) throw new Error("Database is not configured.");
  const parsed = registrationSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    phone: text(formData, "phone"),
    country: text(formData, "country") || undefined,
    nationality: text(formData, "nationality"),
    dateOfBirth: text(formData, "dateOfBirth"),
  });
  if (!parsed.success)
    throw new PublicRegistrationError(
      parsed.error.issues[0]?.message ?? "Review your registration details.",
    );
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing)
    throw new PublicRegistrationError(
      "An account with this email already exists.",
    );

  const sessionToken = randomBytes(32).toString("base64url");
  const result = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(users)
      .values({
        role: "customer",
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
          phone: parsed.data.phone.replace(/[ ()-]/g, ""),
        country: parsed.data.country || null,
        nationality: parsed.data.nationality,
        dateOfBirth: parsed.data.dateOfBirth,
      })
      .returning();
    if (!created) throw new Error("User insert did not return a row.");
    await transaction.insert(sessions).values({
      tokenHash: hashToken(sessionToken),
      userId: created.id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    });
    return {
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        phone: created.phone ?? undefined,
        country: created.country ?? undefined,
        nationality: created.nationality ?? undefined,
        dateOfBirth: created.dateOfBirth ?? undefined,
      },
    };
  });
  setSessionCookie(sessionToken);
  return result;
}
