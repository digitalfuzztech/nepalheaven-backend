import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { getDestinationsFn, getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { DestinationCard } from "@/components/DestinationCard";
import { CtaBanner } from "@/components/CtaBanner";
import { cn } from "@/lib/utils";

const categories = ["All", "Mountains", "Culture", "Wildlife", "Lakes", "Adventure"] as const;
const difficulties = ["All", "Easy", "Moderate", "Challenging"] as const;

export const Route = createFileRoute("/destinations/")({
  loader: async () => {
    const [destinations, settings] = await Promise.all([
      getDestinationsFn(),
      getPublicSiteSettingsFn(),
    ]);
    return { destinations, images: settings.images };
  },
  head: () => ({
    meta: [
      { title: "Destinations in Nepal — Everest, Annapurna, Mustang | Nepal Heaven" },
      {
        name: "description",
        content:
          "Browse every region we operate in: altitude, best season, duration and difficulty for each Nepal destination.",
      },
      { property: "og:title", content: "Destinations in Nepal | Nepal Heaven" },
      { property: "og:description", content: "Eight Nepal regions with altitude, season and difficulty detail." },
      { property: "og:url", content: "/destinations" },
    ],
    links: [{ rel: "canonical", href: "/destinations" }],
  }),
  component: DestinationsPage,
});

function DestinationsPage() {
  const { destinations, images } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("All");

  const results = useMemo(
    () =>
      destinations.filter((d) => {
        const matchesQuery =
          !query ||
          `${d.name} ${d.region} ${d.short}`.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "All" || d.category === category;
        const matchesDifficulty = difficulty === "All" || d.difficulty === difficulty;
        return matchesQuery && matchesCategory && matchesDifficulty;
      }),
    [query, category, difficulty],
  );

  return (
    <>
      <PageHero
        image={images.destAnnapurna}
        eyebrow="Explore Nepal"
        title="Every region, honestly described"
        description="Altitude, season, duration and difficulty for each of the places we know best."
        crumbs={[{ label: "Home", to: "/" }, { label: "Destinations" }]}
      />

      <section className="container-lux grid gap-10 py-20 lg:grid-cols-[18rem_1fr] lg:py-28">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-4 w-4 text-gold" aria-hidden />
              Refine
            </h2>

            <label className="mt-6 flex items-center gap-2 rounded-2xl border border-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">Search destinations</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search regions…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>

            <FilterGroup
              label="Category"
              options={categories}
              value={category}
              onChange={(v) => setCategory(v as (typeof categories)[number])}
            />
            <FilterGroup
              label="Difficulty"
              options={difficulties}
              value={difficulty}
              onChange={(v) => setDifficulty(v as (typeof difficulties)[number])}
            />

            <p className="mt-8 text-xs text-muted-foreground">
              Showing {results.length} of {destinations.length} destinations
            </p>
          </div>
        </aside>

        <div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((d, i) => (
              <DestinationCard key={d.slug} destination={d} delay={i * 60} />
            ))}
          </div>

          <ul className="mt-12 grid gap-6">
            {results.map((d) => (
              <li
                key={d.slug}
                className="grid gap-6 rounded-3xl border border-border bg-card p-6 sm:grid-cols-[auto_1fr]"
              >
                <dl className="grid grid-cols-2 gap-4 sm:w-56 sm:grid-cols-1">
                  {[
                    ["Altitude", d.altitude],
                    ["Best season", d.season],
                    ["Duration", d.duration],
                    ["Difficulty", d.difficulty],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <h3 className="text-xl">{d.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {d.highlights.slice(0, 4).map((h) => (
                      <li key={h} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pb-24">
        <CtaBanner />
      </div>
    </>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="mt-7">
      <legend className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-gold hover:text-gold",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
