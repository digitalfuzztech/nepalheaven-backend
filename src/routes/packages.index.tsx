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
type PackageSearch = { q?: string | undefined; destination?: string | undefined; arrival?: string | undefined; departure?: string | undefined; travellers?: number | undefined; budget?: number | undefined; style?: string | undefined; difficulty?: string | undefined; maxPrice?: number | undefined; maxDays?: number | undefined };
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; };

export const Route = createFileRoute("/packages/")({
  validateSearch: (search: Record<string, unknown>): PackageSearch => ({ q: text(search["q"]), destination: text(search["destination"]), arrival: text(search["arrival"]), departure: text(search["departure"]), travellers: number(search["travellers"]), budget: number(search["budget"]), style: text(search["style"]), difficulty: text(search["difficulty"]), maxPrice: number(search["maxPrice"]), maxDays: number(search["maxDays"]) }),
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const update = (patch: Partial<PackageSearch>) => void navigate({ search: (current) => ({ ...current, ...patch }), replace: true });
  const [sort, setSort] = useState<(typeof sorts)[number]>("Recommended");
  const windowDays = search.arrival && search.departure && search.departure > search.arrival ? Math.ceil((Date.parse(`${search.departure}T00:00:00Z`) - Date.parse(`${search.arrival}T00:00:00Z`)) / 86400000) : undefined;

  const results = useMemo(() => {
    const filtered = packages.filter(
      (p) =>
        (!search.destination || p.destinations.some((d) => d.slug === search.destination)) &&
        (!search.budget || (search.budget === 1 && p.price < 1500) || (search.budget === 2 && p.price >= 1500 && p.price <= 3000) || (search.budget === 3 && p.price > 3000 && p.price <= 6000) || (search.budget === 4 && p.price > 6000)) &&
        (!windowDays || p.days <= windowDays) && (!search.style || p.style === search.style) && (!search.difficulty || p.difficulty === search.difficulty) &&
        (!search.maxPrice || p.price <= search.maxPrice) && (!search.maxDays || p.days <= search.maxDays) &&
        (!search.q || `${p.title} ${p.destination} ${p.style} ${p.difficulty} ${p.highlights.join(" ")}`.toLowerCase().includes(search.q.toLowerCase())),
    );
    const sorted = [...filtered];
    if (sort === "Price: low to high") sorted.sort((a, b) => a.price - b.price);
    if (sort === "Price: high to low") sorted.sort((a, b) => b.price - a.price);
    if (sort === "Duration") sorted.sort((a, b) => b.days - a.days);
    return sorted;
  }, [packages, search, sort, windowDays]);

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
        {Object.values(search).some((value) => value !== undefined) ? <div className="mb-6 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Active filters</span>{search.destination ? <span className="rounded-full bg-accent px-3 py-1 text-xs">{search.destination.replaceAll("-", " ")}</span> : null}{search.budget ? <span className="rounded-full bg-accent px-3 py-1 text-xs">Budget {search.budget}</span> : null}{windowDays ? <span className="rounded-full bg-accent px-3 py-1 text-xs">{windowDays}-day trip window</span> : null}{search.travellers ? <span className="rounded-full bg-accent px-3 py-1 text-xs">{search.travellers} travellers</span> : null}<button type="button" onClick={() => void navigate({ search: {}, replace: true })} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">Clear filters</button></div> : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Search packages</span>
            <input
              type="search"
              value={search.q ?? ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
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
          <label className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="mr-2 text-muted-foreground">Difficulty</span><select value={search.difficulty ?? ""} onChange={(e) => update({ difficulty: e.target.value || undefined })} className="bg-transparent font-semibold outline-none"><option value="">All</option><option>Easy</option><option>Moderate</option><option>Challenging</option><option>Strenuous</option></select></label>
          <label className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="mr-2 text-muted-foreground">Max price</span><select value={search.maxPrice ?? ""} onChange={(e) => update({ maxPrice: number(e.target.value) })} className="bg-transparent font-semibold outline-none"><option value="">Any</option><option value="1000">$1,000</option><option value="1500">$1,500</option><option value="3000">$3,000</option></select></label>
          <label className="rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span className="mr-2 text-muted-foreground">Max duration</span><select value={search.maxDays ?? ""} onChange={(e) => update({ maxDays: number(e.target.value) })} className="bg-transparent font-semibold outline-none"><option value="">Any</option><option value="7">7 days</option><option value="14">14 days</option><option value="21">21 days</option><option value="30">30 days</option></select></label>
        </div>

        <ul className="mt-6 flex flex-wrap gap-2">
          {styles.map((s) => (
            <li key={s}>
              <button
                type="button"
                aria-pressed={(search.style ?? "All") === s}
                onClick={() => update({ style: s === "All" ? undefined : s })}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                  (search.style ?? "All") === s
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
