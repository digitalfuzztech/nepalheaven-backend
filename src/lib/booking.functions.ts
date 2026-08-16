import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function nepalDateToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value["year"]}-${value["month"]}-${value["day"]}`;
}

const departureDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid departure date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month! - 1 &&
      date.getUTCDate() === day
    );
  }, "Enter a valid departure date.")
  .refine(
    (value) => value >= nepalDateToday(),
    "Departure date cannot be in the past.",
  );

const createCheckoutIntentSchema = z.object({
  packageSlug: z.string().trim().min(1).max(200),
  tierName: z.string().trim().min(1).max(120),
  departureDate: departureDateSchema,
  travellers: z.number().int().min(1).max(12),
  notes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((value) => value || undefined),
});

const referenceSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(/^NH-\d{4}-[A-F0-9]{16}$/),
});

const checkoutReferenceSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(/^CHK-\d{4}-[A-F0-9]{24}$/),
});

function publicFailure(error: unknown) {
  return import("@/lib/booking.server").then(({ isPublicBookingError }) => {
    if (isPublicBookingError(error))
      return { ok: false as const, code: error.code, message: error.message };
    console.error("Booking operation failed", error);
    return {
      ok: false as const,
      code: "INTERNAL_ERROR" as const,
      message:
        "We couldn't complete your booking right now. Please try again shortly.",
    };
  });
}

export const createCheckoutIntentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid checkout data.");
    return data;
  })
  .handler(async ({ data: formData }) => {
    const { createCheckoutIntent } = await import("@/lib/booking.server");
    try {
      const rawDocument = formData.get("identityDocument");
      const document =
        rawDocument instanceof File && rawDocument.size > 0
          ? rawDocument
          : undefined;
      const documentTypeValue = formData.get("documentType");
      const documentType =
        documentTypeValue === "passport" || documentTypeValue === "national_id"
          ? documentTypeValue
          : undefined;
      if (document && !documentType)
        return {
          ok: false as const,
          code: "VALIDATION_ERROR" as const,
          message: "Select Passport or National ID.",
        };
      const parsed = createCheckoutIntentSchema.safeParse({
        packageSlug: formData.get("packageSlug"),
        tierName: formData.get("tierName"),
        departureDate: formData.get("departureDate"),
        travellers: Number(formData.get("travellers")),
        notes: formData.get("notes") || undefined,
      });
      if (!parsed.success)
        return {
          ok: false as const,
          code: "VALIDATION_ERROR" as const,
          message:
            parsed.error.issues[0]?.message ?? "Review your checkout details.",
        };
      return {
        ok: true as const,
        checkout: await createCheckoutIntent({
          ...parsed.data,
          documentType,
          document,
        }),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getMyCheckoutIntentFn = createServerFn({ method: "GET" })
  .validator(checkoutReferenceSchema)
  .handler(async ({ data }) => {
    const { getMyCheckoutIntent } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        checkout: await getMyCheckoutIntent(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const selectCheckoutPaymentOptionFn = createServerFn({ method: "POST" })
  .validator(
    checkoutReferenceSchema.extend({
      option: z.enum(["minimum", "full"]),
    }),
  )
  .handler(async ({ data }) => {
    const { selectCheckoutPaymentOption } =
      await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        checkout: await selectCheckoutPaymentOption(
          data.reference,
          data.option,
        ),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const payCheckoutWithDevelopmentMockFn = createServerFn({
  method: "POST",
})
  .validator(
    checkoutReferenceSchema.extend({
      cardholderName: z.string().trim().min(2).max(120),
      cardNumber: z.string().trim().min(12).max(30),
      expiry: z
        .string()
        .trim()
        .regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
      cvv: z
        .string()
        .trim()
        .regex(/^\d{3,4}$/),
    }),
  )
  .handler(async ({ data }) => {
    const { payCheckoutWithDevelopmentMock } =
      await import("@/lib/booking.server");
    try {
      const booking = await payCheckoutWithDevelopmentMock(data.reference, {
        cardholderName: data.cardholderName,
        cardNumber: data.cardNumber,
        expiry: data.expiry,
        cvv: data.cvv,
      });
      return { ok: true as const, booking };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getBookingSummaryFn = createServerFn({ method: "GET" })
  .validator(referenceSchema)
  .handler(async ({ data }) => {
    const { getCustomerBookingSummary } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        booking: await getCustomerBookingSummary(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getAdminConfirmedBookingFn = createServerFn({ method: "GET" })
  .validator(referenceSchema)
  .handler(async ({ data }) => {
    const { getAdminConfirmedBooking } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        booking: await getAdminConfirmedBooking(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getAdminCancelledBookingFn = createServerFn({ method: "GET" })
  .validator(referenceSchema)
  .handler(async ({ data }) => {
    const { getAdminCancelledBooking } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        booking: await getAdminCancelledBooking(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getMyBookingsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getMyBookings } = await import("@/lib/booking.server");
    try {
      return { ok: true as const, bookings: await getMyBookings() };
    } catch (error) {
      return publicFailure(error);
    }
  },
);

export const getMyBookingByReferenceFn = createServerFn({ method: "GET" })
  .validator(referenceSchema)
  .handler(async ({ data }) => {
    const { getMyBookingByReference } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        booking: await getMyBookingByReference(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getMyConfirmedBookingForPackageFn = createServerFn({
  method: "GET",
})
  .validator(z.object({ slug: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { getMyConfirmedBookingForPackage } =
      await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        booking: await getMyConfirmedBookingForPackage(data.slug),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const getMyCancellationPreviewFn = createServerFn({ method: "GET" })
  .validator(referenceSchema)
  .handler(async ({ data }) => {
    const { getMyCancellationPreview } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        preview: await getMyCancellationPreview(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const cancelMyBookingFn = createServerFn({ method: "POST" })
  .validator(
    referenceSchema.extend({ reason: z.string().trim().max(1000).optional() }),
  )
  .handler(async ({ data }) => {
    const { cancelMyBooking } = await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        cancellation: await cancelMyBooking(data.reference, data.reason),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const completeDevelopmentMockRefundFn = createServerFn({
  method: "POST",
})
  .validator(referenceSchema)
  .handler(async ({ data }) => {
    const { completeDevelopmentMockRefund } =
      await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        refund: await completeDevelopmentMockRefund(data.reference),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });

export const uploadMyBookingIdentityDocumentFn = createServerFn({
  method: "POST",
})
  .validator((data: FormData) => {
    if (!(data instanceof FormData))
      throw new Error("Invalid document upload.");
    return data;
  })
  .handler(async ({ data }) => {
    const reference = data.get("reference");
    const documentType = data.get("documentType");
    const file = data.get("identityDocument");
    if (
      typeof reference !== "string" ||
      !/^NH-\d{4}-[A-F0-9]{16}$/.test(reference) ||
      (documentType !== "passport" && documentType !== "national_id") ||
      !(file instanceof File) ||
      file.size < 1
    )
      return {
        ok: false as const,
        code: "VALIDATION_ERROR" as const,
        message: "Choose a valid Passport or National ID file.",
      };
    const { uploadMyBookingIdentityDocument } =
      await import("@/lib/booking.server");
    try {
      return {
        ok: true as const,
        document: await uploadMyBookingIdentityDocument(
          reference,
          documentType,
          file,
        ),
      };
    } catch (error) {
      return publicFailure(error);
    }
  });
