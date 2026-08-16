import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const entrySchema = z
  .object({
    context: z.enum([
      "homepage",
      "destination",
      "experience",
      "package",
      "other",
    ]),
    slug: z.string().trim().min(1).max(191).optional(),
  })
  .superRefine((value, context) => {
    const needsSlug = ["destination", "experience", "package"].includes(
      value.context,
    );
    if (needsSlug !== Boolean(value.slug))
      context.addIssue({
        code: "custom",
        message: needsSlug
          ? "A content slug is required."
          : "This context does not accept a slug.",
      });
  });

const attempts = new Map<string, number[]>();
function allowEntry() {
  const key =
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    getRequestHeader("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(
    (time) => now - time < 10 * 60_000,
  );
  if (recent.length >= 20) return false;
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

export const createWhatsAppEntryFn = createServerFn({ method: "POST" })
  .validator(entrySchema)
  .handler(async ({ data }) => {
    if (!allowEntry())
      return {
        ok: false as const,
        message: "Please wait before opening another WhatsApp conversation.",
      };
    const { createWebsiteWhatsAppAttribution } =
      await import("@/lib/whatsapp.server");
    try {
      const result = await createWebsiteWhatsAppAttribution(data);
      return { ok: true as const, url: result.url };
    } catch (error) {
      console.error("Unable to create WhatsApp attribution", {
        context: data.context,
        slug: data.slug,
        error,
      });
      return {
        ok: false as const,
        message:
          "WhatsApp is unavailable right now. Please use the contact form instead.",
      };
    }
  });

export function buildWhatsAppEntryPath(
  context: "homepage" | "destination" | "experience" | "package" | "other",
  slug?: string,
) {
  const search = new URLSearchParams({ context });
  if (slug) search.set("slug", slug);
  return `/whatsapp?${search.toString()}`;
}
