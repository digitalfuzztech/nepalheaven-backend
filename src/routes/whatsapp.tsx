import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createWhatsAppEntryFn } from "@/lib/whatsapp.functions";

const contexts = [
  "homepage",
  "destination",
  "experience",
  "package",
  "other",
] as const;
type Context = (typeof contexts)[number];
export const Route = createFileRoute("/whatsapp")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { context: Context; slug?: string } => {
    const context = contexts.includes(search["context"] as Context)
      ? (search["context"] as Context)
      : "homepage";
    return {
      context,
      ...(typeof search["slug"] === "string" ? { slug: search["slug"] } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Open WhatsApp | Nepal Heaven" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WhatsAppEntry,
});
function WhatsAppEntry() {
  const { context, slug } = Route.useSearch();
  const [error, setError] = useState("");
  useEffect(() => {
    void createWhatsAppEntryFn({
      data: { context, ...(slug ? { slug } : {}) },
    })
      .then((result) => {
        if (result.ok) window.location.replace(result.url);
        else setError(result.message);
      })
      .catch(() => setError("WhatsApp is unavailable right now."));
  }, [context, slug]);
  return (
    <main className="container-lux grid min-h-[60vh] place-items-center py-24">
      <section className="max-w-lg rounded-3xl border border-border bg-card p-10 text-center">
        <h1 className="text-3xl">Opening WhatsApp…</h1>
        <p className="mt-4 text-muted-foreground">
          {error ||
            "We’re preparing a contextual message for the Nepal Heaven team."}
        </p>
        {error ? (
          <Link
            to="/contact"
            className="mt-6 inline-block font-bold text-primary"
          >
            Use the contact form
          </Link>
        ) : null}
      </section>
    </main>
  );
}
