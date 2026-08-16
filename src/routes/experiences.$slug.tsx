import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { getExperienceBySlugFn } from "@/lib/content.functions";
import { submitExperienceInquiryFn } from "@/lib/lead.functions";
import { useAuth } from "@/lib/auth";
import { PageHero } from "@/components/PageHero";
import { PackageCard } from "@/components/PackageCard";
import { SectionHeading } from "@/components/SectionHeading";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export const Route = createFileRoute("/experiences/$slug")({
  loader: async ({ params }) => {
    const experience = await getExperienceBySlugFn({
      data: { slug: params.slug },
    });
    if (!experience) throw notFound();
    return experience;
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.seoTitle },
            { name: "description", content: loaderData.seoDescription },
            { property: "og:url", content: `/experiences/${params.slug}` },
          ],
          links: [{ rel: "canonical", href: `/experiences/${params.slug}` }],
        }
      : { meta: [{ title: "Experience unavailable | Nepal Heaven" }] },
  component: ExperienceDetail,
});

function ExperienceDetail() {
  const experience = Route.useLoaderData();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await submitExperienceInquiryFn({
        data: {
          experienceSlug: experience.slug,
          name: String(data.get("name") || ""),
          email: String(data.get("email") || ""),
          phone: String(data.get("phone") || ""),
          travelDate: String(data.get("date") || ""),
          message: String(data.get("message") || ""),
          interestedIn: experience.name,
          marketingOptIn: data.get("marketingOptIn") === "on",
        },
      });
      if (result.ok) setSent(true);
      else setError(result.message);
    } catch {
      setError("Please check your details and try again.");
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold";
  return (
    <>
      <PageHero
        image={experience.image}
        eyebrow="Nepal experience"
        title={experience.name}
        description={experience.short}
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Experiences", to: "/experiences" },
          { label: experience.name },
        ]}
      />
      <section className="container-lux grid gap-12 py-20 lg:grid-cols-[1.25fr_0.75fr] lg:py-28">
        <div>
          <p className="text-lg leading-8 text-muted-foreground">
            {experience.description}
          </p>
          <h2 className="mt-10 text-3xl">What travellers can expect</h2>
          <ul className="mt-6 grid gap-3">
            {experience.highlights.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl bg-sand p-4">
                <Check className="mt-1 h-4 w-4 shrink-0 text-forest" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-3xl border border-gold/25 bg-card p-8">
          <Sparkles className="h-7 w-7 text-gold" />
          <h2 className="mt-5 text-2xl">Shape this around you</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Tell our local team your pace, dates and interests. We can build a
            private itinerary without claiming fixed availability.
          </p>
          <WhatsAppLink
            context="experience"
            slug={experience.slug}
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-forest/25 px-5 py-3 text-sm font-bold text-forest hover:bg-forest/5"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Ask about {experience.name} on WhatsApp
          </WhatsAppLink>
          {sent ? (
            <p className="mt-6 rounded-2xl bg-sand p-5 text-sm">
              Thank you — your {experience.name} inquiry is safely with us.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                className={inputClass}
                name="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="Full name"
                defaultValue={user?.name}
              />
              <input
                className={inputClass}
                name="email"
                type="email"
                required
                placeholder="Email address"
                defaultValue={user?.email}
              />
              <input
                className={inputClass}
                name="phone"
                type="tel"
                placeholder="Phone / WhatsApp (optional)"
                defaultValue={user?.phone}
              />
              <input
                className={inputClass}
                name="date"
                type="date"
                aria-label="Preferred date"
              />
              <textarea
                className={inputClass}
                name="message"
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                placeholder="Tell us about the journey you have in mind…"
              />
              <label className="flex items-start gap-3 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="marketingOptIn"
                  className="mt-0.5"
                />
                Send me Nepal travel inspiration, offers and trip updates.
              </label>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <button
                disabled={busy}
                className="bg-gold-gradient w-full rounded-2xl px-5 py-3 text-sm font-bold text-gold-foreground disabled:opacity-60"
              >
                {busy ? "Submitting…" : `Ask about ${experience.name}`}
              </button>
            </form>
          )}
        </aside>
      </section>
      <section className="bg-sand py-24">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Related journeys"
            title={`Trips for ${experience.name.toLowerCase()} travellers`}
            description={`${experience.count} published ${experience.count === 1 ? "journey" : "journeys"} currently connected.`}
          />
          {experience.packages.length ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {experience.packages.map((pkg, index) => (
                <PackageCard key={pkg.slug} pkg={pkg} delay={index * 60} />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-muted-foreground">
              No published journeys are connected yet. Ask us for a custom
              itinerary.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
