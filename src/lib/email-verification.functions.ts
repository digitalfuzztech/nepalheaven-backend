import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyEmailCodeFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        token: z.string().min(20).max(200).optional(),
        email: z.string().trim().email().max(254).optional(),
        code: z.string().regex(/^\d{6}$/),
      })
      .refine((value) => value.token || value.email, {
        message: "A verification challenge is required.",
      }),
  )
  .handler(async ({ data }) => {
    const { enforcePublicRateLimit } =
      await import("@/lib/public-rate-limit.server");
    const identity = data.token || data.email || "anonymous";
    if (!enforcePublicRateLimit("verify-email", identity, 8, 15 * 60 * 1000))
      return {
        ok: false as const,
        message: "Too many attempts. Request a new verification email.",
      };
    const { verifyEmailCode } = await import("@/lib/email-verification.server");
    const result = await verifyEmailCode(data.token, data.code, data.email);
    if (!result.ok) return result;
    const { createVerifiedCustomerSession } = await import("@/lib/auth.server");
    await createVerifiedCustomerSession(result.userId);
    return { ok: true as const, message: result.message };
  });

export const resendEmailVerificationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().max(200).optional(),
      email: z.string().trim().email().max(254).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { enforcePublicRateLimit } =
      await import("@/lib/public-rate-limit.server");
    const identity = data.token || data.email || "anonymous";
    if (
      !enforcePublicRateLimit(
        "resend-verification",
        identity,
        5,
        15 * 60 * 1000,
      )
    )
      return {
        ok: true as const,
        message:
          "If verification is still required, a new email will be sent when allowed.",
        verificationPath: "/verify-email",
      };
    const { resendEmailVerification } =
      await import("@/lib/email-verification.server");
    return resendEmailVerification({
      ...(data.token ? { token: data.token } : {}),
      ...(data.email ? { email: data.email } : {}),
    });
  });
