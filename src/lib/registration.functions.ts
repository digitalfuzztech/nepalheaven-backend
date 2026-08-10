import { createServerFn } from "@tanstack/react-start";

export const registerCustomerFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid registration data.");
    return data;
  })
  .handler(async ({ data }) => {
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
