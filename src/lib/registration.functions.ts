import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const registerCustomerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      nationality: z.string(),
      dateOfBirth: z.string(),
      password: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { enforcePublicRateLimit } =
      await import("@/lib/public-rate-limit.server");
    const email = data.email.trim().toLowerCase();
    if (
      !enforcePublicRateLimit("customer-registration", email, 5, 15 * 60 * 1000)
    )
      return {
        ok: false as const,
        message: "Too many registration attempts. Please wait and try again.",
      };
    const { PublicRegistrationError, registerCustomer } =
      await import("@/lib/registration.server");
    try {
      return {
        ok: true as const,
        ...(await registerCustomer(data)),
      };
    } catch (error) {
      if (error instanceof PublicRegistrationError)
        return { ok: false as const, message: error.message };
      console.error("Customer registration failed", error);
      return {
        ok: false as const,
        message: "We couldn't create your account right now. Please try again.",
      };
    }
  });
