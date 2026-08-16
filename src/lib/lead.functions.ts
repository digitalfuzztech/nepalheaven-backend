import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid travel date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month! - 1 &&
      date.getUTCDate() === day
    );
  }, "Enter a valid travel date.")
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);
const baseLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: optionalText(50),
  travelDate: dateSchema,
  preferredEndDate: dateSchema,
  travellers: z.number().int().min(1).max(50).optional(),
  interestedIn: optionalText(250),
  message: optionalText(5000),
  marketingOptIn: z.boolean().optional().default(false),
});
const contactSchema = baseLeadSchema.extend({
  message: z.string().trim().min(10).max(5000),
});
const destinationSchema = contactSchema.extend({
  destinationSlug: z.string().trim().min(1).max(191),
});
const experienceSchema = contactSchema.extend({
  experienceSlug: z.string().trim().min(1).max(191),
});
const packageInquirySchema = contactSchema.extend({
  packageSlug: z.string().trim().min(1).max(191),
});
const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.enum(["homepage", "footer"]),
});

const attempts = new Map<string, number[]>();
function enforceRateLimit(
  scope: string,
  identity: string,
  limit = 5,
  windowMs = 10 * 60_000,
) {
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${scope}:${forwarded || getRequestHeader("x-real-ip") || "unknown"}:${identity.toLowerCase()}`;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(
    (time) => now - time < windowMs,
  );
  if (recent.length >= limit) return false;
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 2000)
    for (const [storedKey, values] of attempts)
      if (!values.some((time) => now - time < windowMs))
        attempts.delete(storedKey);
  return true;
}
async function persistLead(
  input: Parameters<
    (typeof import("@/lib/lead.server"))["createPublicLead"]
  >[0],
) {
  if (!enforceRateLimit(input.type, input.email))
    return {
      ok: false as const,
      message: "Please wait a moment before submitting again.",
    };
  const { createPublicLead, isPublicLeadInputError } =
    await import("@/lib/lead.server");
  try {
    const lead = await createPublicLead(input);
    return {
      ok: true as const,
      leadId: lead.id,
      ...(lead.alreadySubscribed
        ? { message: "You're already subscribed to Nepal Heaven updates." }
        : {}),
    };
  } catch (error) {
    if (isPublicLeadInputError(error))
      return { ok: false as const, message: error.message };
    console.error("Unable to create public lead", {
      type: input.type,
      source: input.source,
      error,
    });
    return {
      ok: false as const,
      message:
        "We couldn't submit your request right now. Please try again shortly.",
    };
  }
}

export const submitNewsletterFn = createServerFn({ method: "POST" })
  .validator(newsletterSchema)
  .handler(({ data }) =>
    persistLead({
      type: "newsletter_subscriber",
      leadLevel: 1,
      name: data.email.split("@")[0] || "Traveller",
      email: data.email,
      source: data.source,
      marketingOptIn: true,
    }),
  );
export const submitContactLeadFn = createServerFn({ method: "POST" })
  .validator(contactSchema)
  .handler(({ data }) =>
    persistLead({ ...data, type: "contact", leadLevel: 2, source: "contact" }),
  );
export const submitPackageInquiryFn = createServerFn({ method: "POST" })
  .validator(packageInquirySchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "package_inquiry",
      leadLevel: 2,
      source: "package_inquiry",
    }),
  );
export const submitDestinationInquiryFn = createServerFn({ method: "POST" })
  .validator(destinationSchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "destination_inquiry",
      leadLevel: 3,
      source: "destination",
    }),
  );
export const submitItineraryRequestFn = createServerFn({ method: "POST" })
  .validator(destinationSchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "itinerary_request",
      leadLevel: 3,
      source: "itinerary_request",
    }),
  );
export const submitExperienceInquiryFn = createServerFn({ method: "POST" })
  .validator(experienceSchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "experience_inquiry",
      leadLevel: 4,
      source: "experience",
    }),
  );
export const unsubscribeFn = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(32).max(200) }))
  .handler(async ({ data }) => {
    const { unsubscribeByToken } = await import("@/lib/lead.server");
    return { ok: await unsubscribeByToken(data.token) };
  });
