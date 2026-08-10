import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getFaqsFn, getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SectionHeading } from "@/components/SectionHeading";

export const Route = createFileRoute("/faq")({
  loader: async () => {
    const [faqs, settings] = await Promise.all([getFaqsFn(), getPublicSiteSettingsFn()]);
    return { faqs, images: settings.images };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Nepal Travel FAQ — Visas, Permits, Safety & Packing | Nepal Heaven" },
      {
        name: "description",
        content:
          "Answers on Nepal visas, currency, safety, packing, weather and trekking permits from Kathmandu-based specialists.",
      },
      { property: "og:title", content: "Nepal Travel FAQ | Nepal Heaven" },
      { property: "og:description", content: "Everything travellers ask before a Himalayan trip." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (loaderData?.faqs ?? []).flatMap((g) =>
            g.items.map((i) => ({
              "@type": "Question",
              name: i.q,
              acceptedAnswer: { "@type": "Answer", text: i.a },
            })),
          ),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { faqs, images } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    if (!query) return faqs;
    const q = query.toLowerCase();
    return faqs
      .map((g) => ({ ...g, items: g.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <>
      <PageHero
        compact
        image={images.destAnnapurna}
        eyebrow="Good to know"
        title="Frequently asked questions"
        description="Visas, money, safety, packing, weather and permits — the honest version."
        crumbs={[{ label: "Home", to: "/" }, { label: "FAQ" }]}
      />

      <section className="container-lux max-w-4xl py-20 lg:py-28">
        <label className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Search questions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-14 space-y-14">
          {groups.map((g, i) => (
            <Reveal key={g.category} delay={i * 50}>
              <h2 className="text-2xl">{g.category}</h2>
              <div className="mt-5">
                <FaqAccordion items={g.items} />
              </div>
            </Reveal>
          ))}
        </div>

        {groups.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">
            Nothing matched — ask us directly and we'll answer the same day.
          </p>
        ) : null}

        <Reveal className="mt-20">
          <div className="bg-summit rounded-[2rem] px-8 py-14 text-center">
            <SectionHeading
              align="center"
              tone="light"
              eyebrow="Still wondering?"
              title="Ask a Kathmandu specialist"
              description="No call centres, no chatbots — you'll speak to someone who has walked the route."
            />
            <Link
              to="/contact"
              className="bg-gold-gradient mt-8 inline-block rounded-2xl px-8 py-4 text-sm font-bold text-gold-foreground transition-transform hover:scale-[1.02]"
            >
              Contact us
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
