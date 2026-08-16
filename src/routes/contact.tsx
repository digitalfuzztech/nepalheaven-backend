import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  getPackagesFn,
  getPublicSiteSettingsFn,
} from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import {
  submitContactLeadFn,
  submitPackageInquiryFn,
} from "@/lib/lead.functions";
import { useAuth } from "@/lib/auth";
import { buildWhatsAppEntryPath } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>): { package?: string } =>
    typeof search["package"] === "string" ? { package: search["package"] } : {},
  loader: async () => {
    const [packages, settings] = await Promise.all([
      getPackagesFn(),
      getPublicSiteSettingsFn(),
    ]);
    return { company: settings.company, images: settings.images, packages };
  },
  head: () => ({
    meta: [
      { title: "Contact Nepal Heaven — Kathmandu Travel Specialists" },
      {
        name: "description",
        content:
          "Talk to a Kathmandu-based specialist. Phone, WhatsApp, email and office hours, plus a trip enquiry form answered within 24 hours.",
      },
      { property: "og:title", content: "Contact Nepal Heaven" },
      {
        property: "og:description",
        content: "Reach our Kathmandu team by phone, WhatsApp or email.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { company, images, packages } = Route.useLoaderData();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    const formData = new FormData(event.currentTarget);
    const packageSlug = String(formData.get("package") ?? "");
    const commonData = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      travelDate: String(formData.get("dates") ?? ""),
      travellers: Number(formData.get("travellers")),
      interestedIn: packageSlug
        ? packages.find((item) => item.slug === packageSlug)?.title
        : "Custom Nepal journey",
      message: String(formData.get("message") ?? ""),
      marketingOptIn: formData.get("marketingOptIn") === "on",
    };

    try {
      const result = packageSlug
        ? await submitPackageInquiryFn({ data: { ...commonData, packageSlug } })
        : await submitContactLeadFn({ data: commonData });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      setSent(true);
    } catch (error) {
      console.error("Contact inquiry validation failed", error);
      setSubmitError("Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        compact
        image={images.destKathmandu}
        eyebrow="Get in touch"
        title="Let's start planning"
        description="Every enquiry is answered by a specialist in Kathmandu, usually within a few hours."
        crumbs={[{ label: "Home", to: "/" }, { label: "Contact" }]}
      />

      <section className="container-lux grid gap-12 py-20 lg:grid-cols-[1.25fr_1fr] lg:py-28">
        <Reveal>
          <div className="rounded-[2rem] border border-border bg-card p-8 sm:p-10">
            <SectionHeading eyebrow="Enquiry" title="Tell us about your trip" />
            {sent ? (
              <div className="mt-8 rounded-3xl bg-sand p-8 text-center">
                <h3 className="text-2xl">Thank you — your enquiry is in.</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  A specialist will reply within 24 hours with a draft itinerary
                  and pricing.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 rounded-2xl border border-border px-6 py-3 text-sm font-bold transition-colors hover:border-gold hover:text-gold"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form
                className="mt-8 grid gap-5 sm:grid-cols-2"
                onSubmit={submitInquiry}
              >
                <Field
                  label="Full name"
                  name="name"
                  placeholder="Jane Doe"
                  defaultValue={user?.name}
                  required
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  defaultValue={user?.email}
                  required
                />
                <Field
                  label="Phone / WhatsApp"
                  name="phone"
                  placeholder="+1 555 0100"
                  defaultValue={user?.phone}
                />
                <Field label="Preferred dates" name="dates" type="date" />
                <label className="block sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Interested in
                  </span>
                  <select
                    name="package"
                    defaultValue={
                      packages.some((item) => item.slug === search.package)
                        ? search.package
                        : ""
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm outline-none focus:border-gold"
                  >
                    <option value="">Not sure yet</option>
                    {packages.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-start gap-3 text-sm text-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    className="mt-1"
                  />
                  <span>
                    Send me Nepal travel inspiration, offers and trip updates.
                  </span>
                </label>
                <label className="block sm:col-span-1">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Travellers
                  </span>
                  <select
                    name="travellers"
                    defaultValue="2"
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm outline-none focus:border-gold"
                  >
                    {[1, 2, 3, 4, 6, 8, 10].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Message
                  </span>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    placeholder="Tell us how you like to travel, your fitness, and anything unmissable."
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold"
                  />
                </label>
                {submitError ? (
                  <p className="text-sm text-destructive sm:col-span-2">
                    {submitError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gold-gradient rounded-2xl px-8 py-4 text-sm font-bold text-gold-foreground transition-transform hover:scale-[1.02] disabled:opacity-60 sm:col-span-2"
                >
                  {submitting ? "Submitting…" : "Send enquiry"}
                </button>
              </form>
            )}
          </div>
        </Reveal>

        <div className="space-y-6">
          <Reveal>
            <ul className="space-y-4">
              {[
                {
                  icon: Phone,
                  label: "Phone",
                  value: company.phone,
                  href: `tel:${company.phone.replace(/\s/g, "")}`,
                },
                {
                  icon: MessageCircle,
                  label: "WhatsApp",
                  value: company.whatsapp,
                  href: buildWhatsAppEntryPath("other"),
                },
                {
                  icon: Mail,
                  label: "Email",
                  value: company.email,
                  href: `mailto:${company.email}`,
                },
                { icon: MapPin, label: "Office", value: company.address },
              ].map(({ icon: Icon, label, value, href }) => (
                <li
                  key={label}
                  className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6"
                >
                  <span className="bg-summit grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-gold">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {label}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        className="mt-1 block font-semibold text-foreground transition-colors hover:text-gold"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="mt-1 font-semibold text-foreground">
                        {value}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-3xl border border-border bg-card p-6">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <Clock className="h-4 w-4 text-gold" aria-hidden />
                Office hours
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {company.hours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{h.day}</span>
                    <span className="font-semibold">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="overflow-hidden rounded-3xl border border-border">
              <iframe
                title="Nepal Heaven office location in Kathmandu"
                src="https://www.openstreetmap.org/export/embed.html?bbox=85.30%2C27.70%2C85.35%2C27.74&layer=mapnik"
                className="h-64 w-full"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-sand py-24">
        <div className="container-lux max-w-3xl">
          <SectionHeading
            align="center"
            eyebrow="Before you write"
            title="Quick answers"
          />
          <div className="mt-10">
            <FaqAccordion
              items={[
                {
                  q: "How fast do you reply?",
                  a: "Within 24 hours on weekdays, usually much sooner. Urgent trek-support calls are answered around the clock.",
                },
                {
                  q: "Can you build a fully custom trip?",
                  a: "Yes — most of our travellers end up with something tailored. Send dates and interests and we will draft a route.",
                },
                {
                  q: "Do you work with travel agents?",
                  a: "We do. Ask for our trade rates and we will connect you with our partnerships team.",
                },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | undefined;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-gold"
      />
    </label>
  );
}
