import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { unsubscribeFn } from "@/lib/lead.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "invalid">("working");
  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    void unsubscribeFn({ data: { token } })
      .then((result) => setState(result.ok ? "done" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token]);
  return (
    <main className="container-lux grid min-h-[65vh] place-items-center py-24">
      <section className="max-w-xl rounded-3xl border border-border bg-card p-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
          Nepal Heaven
        </p>
        <h1 className="mt-4 text-3xl">
          {state === "working"
            ? "Updating your preferences…"
            : state === "done"
              ? "You’re unsubscribed"
              : "This unsubscribe link is invalid"}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {state === "done"
            ? "You will no longer receive Nepal Heaven marketing updates. Transactional replies to inquiries you send us are unaffected."
            : state === "invalid"
              ? "The link may be incomplete or no longer valid. Contact us if you need help."
              : "Please wait a moment."}
        </p>
      </section>
    </main>
  );
}
