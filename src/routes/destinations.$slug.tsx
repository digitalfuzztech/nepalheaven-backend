import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Map,
  MessageCircle,
  Mountain,
  Signal,
  X,
} from "lucide-react";
import {
  getDestinationBySlugFn,
  getDestinationsFn,
  getPackagesFn,
} from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PackageCard } from "@/components/PackageCard";
import { submitDestinationInquiryFn } from "@/lib/lead.functions";
import { useAuth } from "@/lib/auth";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export const Route = createFileRoute("/destinations/$slug")({
  loader: async ({ params }) => {
    const [destination, destinations, packages] = await Promise.all([
      getDestinationBySlugFn({ data: { slug: params.slug } }),
      getDestinationsFn(),
      getPackagesFn(),
    ]);
    if (!destination) throw notFound();
    return { destination, destinations, packages };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Destination unavailable | Nepal Heaven" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const d = loaderData.destination;
    return {
      meta: [
        { title: `${d.name}, Nepal — Travel Guide & Tours | Nepal Heaven` },
        { name: "description", content: d.short },
        { property: "og:title", content: `${d.name}, Nepal | Nepal Heaven` },
        { property: "og:description", content: d.short },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/destinations/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/destinations/${params.slug}` }],
    };
  },
  component: DestinationDetail,
});

function DestinationDetail() {
  const { destination: d, destinations, packages } = Route.useLoaderData();
  const { user } = useAuth();
  const related = packages
    .filter((p) =>
      p.destinations.some((destination) => destination.slug === d.slug),
    )
    .slice(0, 3);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function submitItinerary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    const formData = new FormData(event.currentTarget);
    try {
      const result = await submitDestinationInquiryFn({
        data: {
          destinationSlug: d.slug,
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          travelDate: String(formData.get("date") ?? ""),
          message: String(formData.get("message") ?? ""),
          interestedIn: d.name,
          marketingOptIn: formData.get("marketingOptIn") === "on",
        },
      });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      setSent(true);
    } catch (error) {
      console.error("Itinerary request validation failed", error);
      setSubmitError("Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        image={d.image}
        eyebrow={d.region}
        title={d.name}
        description={d.short}
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Destinations", to: "/destinations" },
          { label: d.name },
        ]}
      />

      <section className="container-lux -mt-10 relative z-10">
        <Reveal>
          <dl className="glass-card grid gap-6 rounded-3xl p-7 sm:grid-cols-4">
            {[
              { icon: Mountain, k: "Altitude", v: d.altitude },
              { icon: CalendarDays, k: "Best season", v: d.season },
              { icon: Clock, k: "Duration", v: d.duration },
              { icon: Signal, k: "Difficulty", v: d.difficulty },
            ].map(({ icon: Icon, k, v }) => (
              <div key={k} className="flex items-start gap-3">
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0 text-gold"
                  aria-hidden
                />
                <div className="min-w-0">
                  <dt className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">{v}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <div className="container-lux grid gap-14 py-20 lg:grid-cols-[1fr_22rem] lg:py-28">
        <div className="space-y-20">
          <Reveal as="section">
            <h2 className="text-3xl">Overview</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {d.description}
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {d.highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-3 rounded-2xl bg-sand p-4 text-sm text-foreground"
                >
                  <Compass
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                    aria-hidden
                  />
                  {h}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Gallery</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                d.image,
                ...destinations
                  .filter((x) => x.slug !== d.slug)
                  .slice(0, 5)
                  .map((x) => x.image),
              ].map((src, i) => (
                <figure
                  key={i}
                  className="zoom-media aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  <img
                    src={src}
                    alt={`${d.name} gallery image ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </figure>
              ))}
            </div>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Itinerary</h2>
            <ol className="mt-8 space-y-0 border-l border-border pl-8">
              {d.itinerary.map((step) => (
                <li key={step.day} className="relative pb-10 last:pb-0">
                  <span className="bg-gold-gradient absolute -left-[2.15rem] top-1.5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-background" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                    {step.day}
                  </p>
                  <h3 className="mt-2 text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Where you'll be</h2>
            <div className="mt-6 grid h-72 place-items-center rounded-3xl border border-dashed border-border bg-sand text-center">
              <div>
                <Map className="mx-auto h-8 w-8 text-gold" aria-hidden />
                <p className="mt-3 font-semibold text-foreground">
                  {d.name}, {d.region}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Interactive route map
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal as="section" className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="text-2xl">What's included</h2>
              <ul className="mt-5 space-y-3">
                {d.included.map((x) => (
                  <li
                    key={x}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-forest"
                      aria-hidden
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="text-2xl">Not included</h2>
              <ul className="mt-5 space-y-3">
                {d.excluded.map((x) => (
                  <li
                    key={x}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <X
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                      aria-hidden
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Travel tips</h2>
            <ul className="mt-6 space-y-3">
              {d.tips.map((t) => (
                <li
                  key={t}
                  className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground"
                >
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Frequently asked</h2>
            <div className="mt-6">
              <FaqAccordion
                items={[
                  {
                    q: `When is the best time to visit ${d.name}?`,
                    a: `The most reliable window is ${d.season}. Outside those months we can still operate, but expect changeable weather and reduced views.`,
                  },
                  {
                    q: "How fit do I need to be?",
                    a: `${d.name} is rated ${d.difficulty.toLowerCase()}. We send a preparation plan twelve weeks before departure tailored to your current fitness.`,
                  },
                  {
                    q: "Can this be made private?",
                    a: "Yes. Every itinerary can be run privately on your own dates with a dedicated guide and vehicle.",
                  },
                ]}
              />
            </div>
          </Reveal>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-card rounded-3xl p-7">
            <p className="eyebrow">Enquire</p>
            <h2 className="mt-3 text-2xl">Plan {d.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A specialist replies within 24 hours with a tailored itinerary and
              price.
            </p>
            <WhatsAppLink
              context="destination"
              slug={d.slug}
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-forest/25 px-5 py-3 text-sm font-bold text-forest hover:bg-forest/5"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Ask about {d.name} on WhatsApp
            </WhatsAppLink>
            {sent ? (
              <div className="mt-6 rounded-3xl bg-sand p-7 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest/10 text-forest">
                  <CheckCircle2 className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="mt-5 text-2xl">
                  Thank you — your itinerary request is in.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  A specialist will reply within 24 hours with a tailored
                  itinerary and pricing for {d.name}.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-6 rounded-2xl border border-border px-6 py-3 text-sm font-bold transition-colors hover:border-gold hover:text-gold"
                >
                  Send another request
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-3" onSubmit={submitItinerary}>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Full name"
                  aria-label="Full name"
                  defaultValue={user?.name}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
                />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Email address"
                  aria-label="Email address"
                  defaultValue={user?.email}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone / WhatsApp (optional)"
                  aria-label="Phone or WhatsApp"
                  defaultValue={user?.phone}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
                />
                <input
                  type="date"
                  name="date"
                  aria-label="Preferred start date"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
                />
                <textarea
                  name="message"
                  rows={3}
                  required
                  placeholder="Tell us about your trip…"
                  aria-label="Trip notes"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
                />
                <label className="flex items-start gap-3 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    className="mt-0.5"
                  />
                  <span>
                    Send me Nepal travel inspiration, offers and trip updates.
                  </span>
                </label>
                {submitError ? (
                  <p className="text-sm text-destructive">{submitError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gold-gradient w-full rounded-2xl px-6 py-4 text-sm font-bold text-gold-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Request itinerary"}
                </button>
              </form>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No deposit required to enquire.
            </p>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="bg-sand py-24">
          <div className="container-lux">
            <SectionHeading eyebrow="Related" title={`Tours in ${d.name}`} />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <PackageCard key={p.slug} pkg={p} delay={i * 70} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="container-lux py-20 text-center">
        <Link
          to="/destinations"
          className="text-sm font-bold text-primary hover:text-gold"
        >
          ← Back to all destinations
        </Link>
      </div>
    </>
  );
}
