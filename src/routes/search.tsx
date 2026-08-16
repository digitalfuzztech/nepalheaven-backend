import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { searchPublicContentFn } from "@/lib/content.functions";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search["q"] === "string" ? search["q"].trim().slice(0, 200) : "" }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchPublicContentFn({ data: { q: deps.q } }),
  head: ({ match }) => ({ meta: [{ title: match.search.q ? `Search: ${match.search.q} | Nepal Heaven` : "Search | Nepal Heaven" }, { name: "robots", content: "noindex,follow" }] }),
  component: SearchPage,
});

function SearchPage() {
  const result = Route.useLoaderData();
  const total = result.destinations.length + result.packages.length + result.experiences.length + result.articles.length;
  return <main className="container-lux min-h-screen pb-24 pt-40"><p className="eyebrow">Site search</p><h1 className="mt-4 text-4xl sm:text-5xl">Results for “{result.query}”</h1><p className="mt-4 text-muted-foreground">{total} {total === 1 ? "result" : "results"}</p>
    {total ? <div className="mt-14 space-y-14"><Group title="Destinations" items={result.destinations.map((x) => ({ title: x.name, detail: `${x.region} · ${x.short}`, to: "/destinations/$slug" as const, slug: x.slug }))} /><Group title="Packages" items={result.packages.map((x) => ({ title: x.title, detail: `${x.days} days · ${x.destination} · From $${x.price.toLocaleString()}`, to: "/packages/$slug" as const, slug: x.slug }))} /><Group title="Experiences" items={result.experiences.map((x) => ({ title: x.name, detail: x.short, to: "/experiences/$slug" as const, slug: x.slug }))} /><Group title="Articles" items={result.articles.map((x) => ({ title: x.title, detail: `${x.category} · ${x.excerpt}`, to: "/blog/$slug" as const, slug: x.slug }))} /></div>
    : <div className="mt-14 rounded-3xl border border-border bg-card p-10 text-center"><Search className="mx-auto h-8 w-8 text-gold" /><h2 className="mt-4 text-2xl">No matching public content</h2><p className="mt-3 text-muted-foreground">Try another phrase or browse all journeys.</p><div className="mt-6 flex justify-center gap-3"><Link to="/destinations" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Destinations</Link><Link to="/packages" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Packages</Link></div></div>}
  </main>;
}
type Item = { title: string; detail: string; to: "/destinations/$slug" | "/packages/$slug" | "/experiences/$slug" | "/blog/$slug"; slug: string };
function Group({ title, items }: { title: string; items: Item[] }) { if (!items.length) return null; return <section><h2 className="text-2xl">{title}</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item.slug}><Link to={item.to} params={{ slug: item.slug }} className="group flex h-full items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 hover:border-gold"><span><span className="block font-semibold group-hover:text-gold">{item.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{item.detail}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-gold" /></Link></li>)}</ul></section>; }
