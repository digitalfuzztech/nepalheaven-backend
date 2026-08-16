import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { getExperiencesFn, getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { CtaBanner } from "@/components/CtaBanner";

export const Route = createFileRoute("/experiences")({
  loader: async () => { const [experienceCategories, settings] = await Promise.all([getExperiencesFn(), getPublicSiteSettingsFn()]); return { experienceCategories, images: settings.images }; },
  head: () => ({
    meta: [
      { title: "Nepal Experiences — Adventure, Culture, Wellness | Nepal Heaven" },
      {
        name: "description",
        content:
          "Choose how you travel: adventure, luxury, culture, wellness, photography, pilgrimage, food, family or honeymoon journeys in Nepal.",
      },
      { property: "og:title", content: "Nepal Experiences | Nepal Heaven" },
      { property: "og:description", content: "Nine ways to travel Nepal, each designed around a different kind of traveller." },
      { property: "og:url", content: "/experiences" },
    ],
    links: [{ rel: "canonical", href: "/experiences" }],
  }),
  component: ExperiencesPage,
});

function ExperiencesPage() {
  const pathname = useLocation().pathname;
  if (pathname !== "/experiences" && pathname !== "/experiences/") return <Outlet />;
  const { experienceCategories, images } = Route.useLoaderData();
  return (
    <>
      <PageHero
        image={images.expParagliding}
        eyebrow="How you travel"
        title="Nine ways to experience Nepal"
        description="The same mountains, read nine different ways — pick the one that sounds like your kind of week."
        crumbs={[{ label: "Home", to: "/" }, { label: "Experiences" }]}
      />

      <section className="container-lux py-20 lg:py-28">
        <SectionHeading
          eyebrow="Categories"
          title="Start with a feeling, not an itinerary"
          description="Every category below can be run privately, combined with another, or extended into a multi-region journey."
        />

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experienceCategories.map((c, i) => (
            <Reveal key={c.name} as="li" delay={i * 60}>
              <Link
                to="/experiences/$slug"
                params={{ slug: c.slug }}
                className="zoom-media hover-lift group relative flex h-full min-h-[24rem] flex-col justify-end overflow-hidden rounded-3xl"
              >
                <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="bg-veil absolute inset-0" />
                <div className="relative p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{c.count} journeys</p>
                  <h2 className="mt-3 text-2xl text-primary-foreground">{c.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{c.detail}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold transition-transform duration-500 group-hover:translate-x-1">
                    View journeys
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="bg-summit py-24">
        <div className="container-lux grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Bespoke"
            tone="light"
            title="Nothing here quite right?"
            description="Around a third of our travellers arrive with an idea rather than an itinerary — a festival date, a photograph, a summit their father once climbed. We build from there."
          />
          <div className="glass-dark rounded-3xl p-8">
            <ul className="space-y-5 text-primary-foreground/80">
              {[
                "Tell us your dates, pace and altitude appetite",
                "We draft a route within 24 hours",
                "Refine it together until it's exactly right",
                "Travel with a private guide and 24/7 support",
              ].map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="bg-gold-gradient grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-gold-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="py-24">
        <CtaBanner />
      </div>
    </>
  );
}
