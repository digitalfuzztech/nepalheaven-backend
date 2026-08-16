import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { submitNewsletterFn } from "@/lib/lead.functions";

export function NewsletterForm({
  source,
  dark = false,
}: {
  source: "homepage" | "footer";
  dark?: boolean;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("");
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") || "");
    try {
      const result = await submitNewsletterFn({ data: { email, source } });
      setStatus(
        result.ok
          ? result.message || "You're subscribed to Nepal Heaven updates."
          : result.message,
      );
      if (result.ok) form.reset();
    } catch {
      setStatus("Please enter a valid email and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <form
        className={`flex items-center gap-2 rounded-full border p-1.5 ${dark ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-card"}`}
        onSubmit={submit}
      >
        <label className="sr-only" htmlFor={`newsletter-${source}`}>
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          className={`w-full min-w-0 bg-transparent px-3 text-sm outline-none ${dark ? "text-primary-foreground placeholder:text-primary-foreground/50" : "text-foreground placeholder:text-muted-foreground"}`}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Subscribe to the newsletter"
          className="bg-gold-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full text-gold-foreground transition-transform hover:scale-105 disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
      {status ? (
        <p
          role="status"
          className={`mt-3 text-xs ${dark ? "text-primary-foreground/75" : "text-muted-foreground"}`}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
