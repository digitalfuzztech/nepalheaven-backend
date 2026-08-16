import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  expectedRole: z.enum(["admin", "customer"]).optional(),
});

export const loginFn = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const server = await import("@/lib/auth.server");
    return server.login(data);
  });

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const server = await import("@/lib/auth.server");
    return server.getCurrentUser();
  },
);

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const server = await import("@/lib/auth.server");
  return server.logout();
});

export const updatePasswordFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const server = await import("@/lib/auth.server");
    return server.updatePassword({
      newPassword: data.newPassword,
      ...(data.currentPassword
        ? { currentPassword: data.currentPassword }
        : {}),
    });
  });

export const requestPasswordResetFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email().max(254) }))
  .handler(async ({ data }) => {
    const server = await import("@/lib/auth.server");
    return server.requestCustomerPasswordReset(data);
  });

export const requestAdminPasswordResetFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().email().max(254),
      redirect: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const server = await import("@/lib/auth.server");
    return server.requestAdminPasswordReset({
      email: data.email,
      ...(data.redirect ? { redirect: data.redirect } : {}),
    });
  });

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z
    .string()
    .min(8)
    .max(200)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator(resetSchema)
  .handler(async ({ data }) => {
    const server = await import("@/lib/auth.server");
    return server.resetCustomerPassword(data);
  });

export const resetAdminPasswordFn = createServerFn({ method: "POST" })
  .validator(resetSchema)
  .handler(async ({ data }) => {
    const server = await import("@/lib/auth.server");
    return server.resetAdminPassword(data);
  });
