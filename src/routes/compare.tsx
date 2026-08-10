import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, Signal, Star, Users, X } from "lucide-react";
import { getPackagesFn } from "@/lib/content.functions";
import { packagesForComparison, useComparison } from "@/lib/comparison";

export const Route = createFileRoute("/compare")({ loader: () => getPackagesFn(), component: ComparePage });

function ComparePage() {
  const packages = Route.useLoaderData();
  const { items, remove, clear } = useComparison();
  const selected = packagesForComparison(packages, items);

  return (
    <section className="container-lux py-16 lg:py-24">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="eyebrow text-gold">Trip comparison</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-semibold text-primary">Compare your journeys.</h1><p className="mt-4 max-w-2xl text-muted-foreground">Put up to three Nepal Heaven journeys side by side before you decide.</p></div>
        {selected.length ? <button onClick={clear} className="text-sm font-semibold text-muted-foreground hover:text-destructive">Clear comparison</button> : null}
      </div>

      {selected.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-dashed border-border bg-card p-12 text-center">
          <h2 className="text-2xl font-semibold">Nothing to compare yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Choose up to three trips from the package catalogue using the Compare button.</p>
          <Link to="/packages" className="bg-gold-gradient mt-7 inline-flex rounded-full px-6 py-3 text-sm font-bold text-gold-foreground">Browse packages</Link>
        </div>
      ) : (
        <div className="mt-12 overflow-x-auto rounded-[2rem] border border-border bg-card">
          <div className="min-w-[760px]">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `12rem repeat(${selected.length}, minmax(14rem, 1fr))` }}>
              <div className="p-5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Trip</div>
              {selected.map((p) => <div key={p.slug} className="border-l border-border p-5"><button onClick={() => remove(p.slug)} className="float-right text-muted-foreground hover:text-destructive" aria-label={`Remove ${p.title}`}><X className="h-4 w-4" /></button><img src={p.image} alt="" className="h-28 w-full rounded-xl object-cover" /><h2 className="mt-4 text-lg font-semibold">{p.title}</h2><p className="mt-1 text-xs text-muted-foreground">{p.destination}</p></div>)}
            </div>
            {[
              ["Price", (p: typeof selected[number]) => `$${p.price.toLocaleString()}`],
              ["Duration", (p: typeof selected[number]) => `${p.days} days`],
              ["Difficulty", (p: typeof selected[number]) => p.difficulty],
              ["Rating", (p: typeof selected[number]) => `${p.rating.toFixed(1)} / 5`],
              ["Reviews", (p: typeof selected[number]) => String(p.reviews)],
              ["Group size", () => "2 – 12 travellers"],
              ["Style", (p: typeof selected[number]) => p.style],
            ].map(([label, fn]) => <div key={String(label)} className="grid border-b border-border last:border-0" style={{ gridTemplateColumns: `12rem repeat(${selected.length}, minmax(14rem, 1fr))` }}><div className="flex items-center gap-2 p-5 text-sm font-semibold text-muted-foreground">{label === "Duration" ? <Clock className="h-4 w-4 text-gold" /> : label === "Difficulty" ? <Signal className="h-4 w-4 text-gold" /> : label === "Rating" ? <Star className="h-4 w-4 text-gold" /> : label === "Group size" ? <Users className="h-4 w-4 text-gold" /> : null}{String(label)}</div>{selected.map((p) => <div key={p.slug} className="border-l border-border p-5 text-sm font-semibold">{(fn as (p: typeof p) => string)(p)}</div>)}</div>)}
            <div className="grid" style={{ gridTemplateColumns: `12rem repeat(${selected.length}, minmax(14rem, 1fr))` }}><div className="p-5" />{selected.map((p) => <div key={p.slug} className="border-l border-border p-5"><Link to="/packages/$slug" params={{ slug: p.slug }} className="bg-primary block rounded-xl px-4 py-3 text-center text-sm font-bold text-primary-foreground">View trip</Link><Link to="/book/$slug" params={{ slug: p.slug }} className="mt-2 block rounded-xl border border-border px-4 py-3 text-center text-sm font-bold hover:border-gold hover:text-gold">Book now</Link></div>)}</div>
          </div>
        </div>
      )}

      {selected.length ? <div className="mt-10 grid gap-5 md:grid-cols-3">{selected.map((p) => <div key={p.slug} className="rounded-3xl border border-border bg-card p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Highlights</p><ul className="mt-4 space-y-2">{p.highlights.slice(0, 4).map((h) => <li key={h} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" />{h}</li>)}</ul></div>)}</div> : null}
    </section>
  );
}
