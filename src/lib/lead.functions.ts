import { createServerFn } from "@tanstack/react-start";
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
  travellers: z.number().int().min(1).max(50).optional(),
  message: optionalText(5000),
});

const itinerarySchema = baseLeadSchema.extend({
  destinationSlug: z.string().trim().min(1).max(200),
});

const contactSchema = baseLeadSchema.extend({
  message: z.string().trim().min(10).max(5000),
});

const packageInquirySchema = contactSchema.extend({
  packageSlug: z.string().trim().min(1).max(200),
});

async function persistLead(
  input: Parameters<
    (typeof import("@/lib/lead.server"))["createPublicLead"]
  >[0],
) {
  const { createPublicLead, isPublicLeadInputError } =
    await import("@/lib/lead.server");
  try {
    const lead = await createPublicLead(input);
    return { ok: true as const, leadId: lead.id };
  } catch (error) {
    if (isPublicLeadInputError(error))
      return { ok: false as const, message: error.message };
    console.error("Unable to create public lead", {
      type: input.type,
      source: input.source,
      packageSlug: input.packageSlug,
      destinationSlug: input.destinationSlug,
      error,
    });
    return {
      ok: false as const,
      message:
        "We couldn't submit your request right now. Please try again shortly.",
    };
  }
}

export const submitItineraryRequestFn = createServerFn({ method: "POST" })
  .validator(itinerarySchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "itinerary_request",
      source: "website_itinerary",
    }),
  );

export const submitContactLeadFn = createServerFn({ method: "POST" })
  .validator(contactSchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "contact",
      source: "website_contact",
    }),
  );

export const submitPackageInquiryFn = createServerFn({ method: "POST" })
  .validator(packageInquirySchema)
  .handler(({ data }) =>
    persistLead({
      ...data,
      type: "package_inquiry",
      source: "website_package",
    }),
  );
