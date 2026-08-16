import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Check,
  Clock,
  MessageCircle,
  Signal,
  Star,
  X,
  Users,
} from "lucide-react";
import {
  getPackageBySlugFn,
  getPackagesFn,
  getTestimonialsFn,
} from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PackageCard } from "@/components/PackageCard";
import { getMyConfirmedBookingForPackageFn } from "@/lib/booking.functions";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export const Route = createFileRoute("/packages/$slug")({
  loader: async ({ params }) => {
    const [pkg, packages, testimonials, customerBookingResult] =
      await Promise.all([
        getPackageBySlugFn({ data: { slug: params.slug } }),
        getPackagesFn(),
        getTestimonialsFn(),
        getMyConfirmedBookingForPackageFn({ data: { slug: params.slug } }),
      ]);
    if (!pkg) throw notFound();
    return { pkg, packages, testimonials, customerBookingResult };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Package unavailable | Nepal Heaven" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.pkg;
    return {
      meta: [
        {
          title: `${p.title} — ${p.days} Days from $${p.price} | Nepal Heaven`,
        },
        { name: "description", content: p.short },
        { property: "og:title", content: `${p.title} | Nepal Heaven` },
        { property: "og:description", content: p.short },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/packages/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/packages/${params.slug}` }],
    };
  },
  component: PackageDetail,
});

function PackageDetail() {
  const {
    pkg: p,
    packages,
    testimonials,
    customerBookingResult,
  } = Route.useLoaderData();
  const customerBooking = customerBookingResult.ok
    ? customerBookingResult.booking
    : null;
  const related = packages.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <PageHero
        image={p.image}
        eyebrow={p.style}
        title={p.title}
        description={p.short}
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Packages", to: "/packages" },
          { label: p.title },
        ]}
      />

      <div className="container-lux grid gap-14 py-20 lg:grid-cols-[1fr_23rem] lg:py-28">
        <div className="space-y-20">
          <Reveal as="section">
            <dl className="grid grid-cols-2 gap-6 rounded-3xl border border-border bg-card p-7 sm:grid-cols-4">
              {[
                { icon: Clock, k: "Duration", v: `${p.days} days` },
                { icon: Signal, k: "Difficulty", v: p.difficulty },
                { icon: Users, k: "Group size", v: "2 – 12 travellers" },
                {
                  icon: Star,
                  k: "Rating",
                  v: `${p.rating.toFixed(1)} (${p.reviews})`,
                },
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

            <h2 className="mt-14 text-3xl">Tour overview</h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {p.short} Across {p.days} days in {p.destination}, this itinerary
              balances the landmark moments with enough unscheduled time to let
              the place register. Group departures cap at twelve travellers;
              private versions run on any date you choose.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {p.highlights.map((h) => (
                <li
                  key={h}
                  className="flex items-start gap-3 rounded-2xl bg-sand p-4 text-sm text-foreground"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-forest"
                    aria-hidden
                  />
                  {h}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Day by day</h2>
            <ol className="mt-8 border-l border-border pl-8">
              {p.itinerary.map((step) => (
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
            <h2 className="text-3xl">Pricing</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {p.tiers.map((tier, i) => (
                <div
                  key={tier.name}
                  className={
                    i === 1
                      ? "bg-summit rounded-3xl p-7 text-primary-foreground shadow-elevated"
                      : "rounded-3xl border border-border bg-card p-7"
                  }
                >
                  <p
                    className={
                      i === 1
                        ? "eyebrow"
                        : "text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"
                    }
                  >
                    {tier.name}
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold">
                    ${tier.price.toLocaleString()}
                  </p>
                  <p
                    className={
                      i === 1
                        ? "mt-2 text-sm text-primary-foreground/70"
                        : "mt-2 text-sm text-muted-foreground"
                    }
                  >
                    per person · {tier.note}
                  </p>
                  <Link
                    to={
                      customerBooking
                        ? "/account/bookings/$reference"
                        : "/book/$slug"
                    }
                    params={
                      customerBooking
                        ? { reference: customerBooking.reference }
                        : { slug: p.slug }
                    }
                    className={
                      i === 1
                        ? "bg-gold-gradient mt-6 block rounded-2xl px-5 py-3 text-center text-sm font-bold text-gold-foreground"
                        : "mt-6 block rounded-2xl border border-border px-5 py-3 text-center text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
                    }
                  >
                    {customerBooking ? "View my booking" : "Reserve"}
                  </Link>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="text-2xl">Included</h2>
              <ul className="mt-5 space-y-3">
                {p.included.map((x) => (
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
              <h2 className="text-2xl">Excluded</h2>
              <ul className="mt-5 space-y-3">
                {p.excluded.map((x) => (
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
            <h2 className="text-3xl">Gallery</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {packages.slice(0, 6).map((x, i) => (
                <figure
                  key={i}
                  className="zoom-media aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  <img
                    src={x.image}
                    alt={`${p.title} gallery ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </figure>
              ))}
            </div>
          </Reveal>

          <Reveal as="section">
            <h2 className="text-3xl">Traveller reviews</h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2">
              {testimonials.slice(0, 4).map((t) => (
                <li
                  key={t.name}
                  className="rounded-3xl border border-border bg-card p-7"
                >
                  <div
                    className="flex items-center gap-1 text-gold"
                    aria-label={`${t.rating} out of 5`}
                  >
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-current"
                        aria-hidden
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    “{t.quote}”
                  </p>
                  <p className="mt-5 text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.country}</p>
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
                    q: "What deposit is required?",
                    a: "The current minimum advance and balance deadline are calculated from Nepal Heaven's booking settings and shown clearly during checkout.",
                  },
                  {
                    q: "Is insurance mandatory?",
                    a: "Yes. Comprehensive travel insurance including helicopter evacuation up to your maximum trip altitude is required for all travellers.",
                  },
                  {
                    q: "Can I extend the trip?",
                    a: "Absolutely — most travellers add Pokhara, Chitwan or a Kathmandu heritage extension. We arrange it in the same booking.",
                  },
                  {
                    q: "What is the cancellation policy?",
                    a: "Cancellation policy is package-specific. Any configured cancellation fee is snapshotted when a qualifying payment creates the booking, so later policy changes do not alter an existing booking.",
                  },
                ]}
              />
            </div>
          </Reveal>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-card rounded-3xl p-7">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  From
                </p>
                <p className="font-[family-name:var(--font-display)] text-4xl font-semibold text-primary">
                  ${p.price.toLocaleString()}
                </p>
              </div>
              {p.oldPrice ? (
                <p className="pb-1 text-sm text-muted-foreground line-through">
                  ${p.oldPrice.toLocaleString()}
                </p>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              per person, twin share
            </p>

            <div className="mt-6 space-y-3">
              {customerBooking ? (
                <div className="rounded-2xl border border-forest/20 bg-forest/5 p-5">
                  <p className="text-sm font-bold text-forest">
                    You have booked this trip
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reference: {customerBooking.reference}
                    <br />
                    Departure: {customerBooking.departureDate}
                  </p>
                  <Link
                    to="/account/bookings/$reference"
                    params={{ reference: customerBooking.reference }}
                    className="bg-gold-gradient mt-4 block w-full rounded-2xl px-6 py-3 text-center text-sm font-bold text-gold-foreground"
                  >
                    View my booking
                  </Link>
                </div>
              ) : (
                <Link
                  to="/book/$slug"
                  params={{ slug: p.slug }}
                  className="bg-gold-gradient block w-full rounded-2xl px-6 py-4 text-center text-sm font-bold text-gold-foreground transition-transform hover:scale-[1.02]"
                >
                  Book this trip
                </Link>
              )}
              <Link
                to="/contact"
                search={{ package: p.slug }}
                className="block rounded-2xl border border-border px-6 py-4 text-center text-sm font-bold text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Speak to a specialist
              </Link>
              <WhatsAppLink
                context="package"
                slug={p.slug}
                className="flex items-center justify-center gap-2 rounded-2xl border border-forest/25 px-6 py-4 text-sm font-bold text-forest transition-colors hover:bg-forest/5"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Ask on WhatsApp
              </WhatsAppLink>
            </div>
            <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
              <li>· Configured minimum advance shown at checkout</li>
              <li>· Package-specific cancellation policy</li>
              <li>· Permits, guides and transfers included</li>
            </ul>
          </div>
        </aside>
      </div>

      <section className="bg-sand py-24">
        <div className="container-lux">
          <SectionHeading
            eyebrow="You may also like"
            title="Other journeys travellers compare"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((x, i) => (
              <PackageCard
                key={x.slug}
                pkg={x}
                delay={i * 70}
                comparisonBaseSlug={p.slug}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
