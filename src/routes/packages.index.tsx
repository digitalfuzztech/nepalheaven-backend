import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getPackagesFn, getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { PackageCard } from "@/components/PackageCard";
import { CtaBanner } from "@/components/CtaBanner";
import { cn } from "@/lib/utils";

const styles = ["All", "Signature Trek", "Classic Trek", "Private Luxury", "Culture", "Slow Travel", "Expedition", "Wildlife", "Scenic Flight"];
const sorts = ["Recommended", "Price: low to high", "Price: high to low", "Duration"] as const;

export const Route = createFileRoute("/packages/")({
  loader: async () => {
    const [packages, settings] = await Promise.all([getPackagesFn(), getPublicSiteSettingsFn()]);
    return { packages, images: settings.images };
  },
  head: () => ({
    meta: [
      { title: "Nepal Tour Packages & Treks — Prices and Dates | Nepal Heaven" },
      {
        name: "description",
        content:
          "Compare curated Nepal packages: Everest Base Camp, Annapurna Circuit, luxury private tours, safaris and helicopter journeys.",
      },
      { property: "og:title", content: "Nepal Tour Packages | Nepal Heaven" },
      { property: "og:description", content: "Curated Himalayan trips with transparent pricing and ratings." },
      { property: "og:url", content: "/packages" },
    ],
    links: [{ rel: "canonical", href: "/packages" }],
  }),
  component: PackagesPage,
});

function PackagesPage() {
  const { images, packages } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("All");
  const [sort, setSort] = useState<(typeof sorts)[number]>("Recommended");
  const [difficulty, setDifficulty] = useState("All");
  const [maxPrice, setMaxPrice] = useState("3000");
  const [maxDays, setMaxDays] = useState("30");

  const results = useMemo(() => {
    const filtered = packages.filter(
      (p) =>
        (style === "All" || p.style === style) &&
        (difficulty === "All" || p.difficulty === difficulty) &&
        p.price <= Number(maxPrice) &&
        p.days <= Number(maxDays) &&
        (!query || `${p.title} ${p.destination} ${p.style} ${p.difficulty}`.toLowerCase().includes(query.toLowerCase())),
    );
    const sorted = [...filtered];
    if (sort === "Price: low to high") sorted.sort((a, b) => a.price - b.price);
    if (sort === "Price: high to low") sorted.sort((a, b) => b.price - a.price);
    if (sort === "Duration") sorted.sort((a, b) => b.days - a.days);
    return sorted;
  }, [query, style, sort, difficulty, maxPrice, maxDays]);

  return (
    <>
      <PageHero
        image={images.destEverest}
        eyebrow="Curated journeys"
        title="Tour packages built by people who walk them"
        description="Every price below includes permits, guides and transfers. No hidden fees at the trailhead."
        crumbs={[{ label: "Home", to: "/" }, { label: "Packages" }]}
      />

      <section className="container-lux py-20 lg:py-28">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Search packages</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packages…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof sorts)[number])}
              className="bg-transparent font-semibold outline-none"
            >
              {sorts.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="mr-2 text-muted-foreground">Difficulty</span><select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="bg-transparent font-semibold outline-none"><option>All</option><option>Easy</option><option>Moderate</option><option>Challenging</option><option>Strenuous</option></select></label>
          <label className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="mr-2 text-muted-foreground">Max price</span><select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="bg-transparent font-semibold outline-none"><option value="1000">$1,000</option><option value="1500">$1,500</option><option value="2000">$2,000</option><option value="3000">$3,000</option><option value="10000">Any</option></select></label>
          <label className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="mr-2 text-muted-foreground">Max duration</span><select value={maxDays} onChange={(e) => setMaxDays(e.target.value)} className="bg-transparent font-semibold outline-none"><option value="7">7 days</option><option value="14">14 days</option><option value="21">21 days</option><option value="30">30 days</option><option value="100">Any</option></select></label>
        </div>

        <ul className="mt-6 flex flex-wrap gap-2">
          {styles.map((s) => (
            <li key={s}>
              <button
                type="button"
                aria-pressed={style === s}
                onClick={() => setStyle(s)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                  style === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-gold hover:text-gold",
                )}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p, i) => (
            <PackageCard key={p.slug} pkg={p} delay={i * 60} />
          ))}
        </div>

        {results.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">
            No packages match that search — try a different style or region.
          </p>
        ) : null}
      </section>

      <div className="pb-24">
        <CtaBanner />
      </div>
    </>
  );
}
