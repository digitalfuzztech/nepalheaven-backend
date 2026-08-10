import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Clock, Search } from "lucide-react";
import { getBlogPostsFn, getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog/")({
  loader: async () => {
    const [posts, settings] = await Promise.all([getBlogPostsFn(), getPublicSiteSettingsFn()]);
    return { posts, images: settings.images };
  },
  head: () => ({
    meta: [
      { title: "Nepal Travel Journal — Trekking Guides & Culture | Nepal Heaven" },
      {
        name: "description",
        content:
          "Field notes from our Kathmandu team: trekking seasons, altitude advice, packing lists, festivals and Himalayan photography.",
      },
      { property: "og:title", content: "The Nepal Heaven Journal" },
      { property: "og:description", content: "Practical Himalayan travel writing from guides who live here." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { images, posts } = Route.useLoaderData();
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category)))];
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const featured = posts[0];
  const rest = posts.slice(1);


  const filtered = useMemo(
    () =>
      rest.filter(
        (p) =>
          (category === "All" || p.category === category) &&
          (!query || `${p.title} ${p.excerpt}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [category, query, rest],
  );

  if (!featured) {
    return <section className="container-lux py-24 text-center"><h1 className="text-4xl font-semibold">No journal stories yet</h1><p className="mt-4 text-muted-foreground">Please check back soon.</p></section>;
  }

  return (
    <>
      <PageHero
        compact
        image={images.destMustang}
        eyebrow="The journal"
        title="Notes from the Himalaya"
        description="Season guides, altitude science, packing lists and festival calendars — written by the people who guide them."
        crumbs={[{ label: "Home", to: "/" }, { label: "Blog" }]}
      />

      <section className="container-lux py-20 lg:py-24">
        <Reveal>
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="hover-lift group grid overflow-hidden rounded-[2rem] border border-border bg-card lg:grid-cols-2"
          >
            <div className="zoom-media aspect-[16/11] overflow-hidden lg:aspect-auto">
              <img src={featured.image} alt={featured.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <p className="eyebrow">Featured · {featured.category}</p>
              <h2 className="mt-4 text-3xl leading-tight sm:text-4xl">{featured.title}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">{featured.excerpt}</p>
              <p className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>{featured.author.name}</span>
                <span aria-hidden>·</span>
                <span>{featured.date}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {featured.readingTime}
                </span>
              </p>
              <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-bold text-gold transition-transform duration-500 group-hover:translate-x-1">
                Read the story
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </Link>
        </Reveal>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4">
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-gold hover:text-gold",
                  )}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
          <label className="flex min-w-[14rem] items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Search articles</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <Reveal key={p.slug} as="li" delay={i * 60} className="h-full">
              <Link
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="hover-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card"
              >
                <div className="zoom-media aspect-[16/10] overflow-hidden">
                  <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{p.category}</p>
                  <h3 className="mt-3 text-xl leading-snug">{p.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{p.excerpt}</p>
                  <p className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{p.date}</span>
                    <span aria-hidden>·</span>
                    <span>{p.readingTime}</span>
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">No articles match that search yet.</p>
        ) : null}

        <Reveal className="mt-20">
          <div className="bg-summit rounded-[2rem] px-8 py-14 text-center sm:px-14">
            <p className="eyebrow">Newsletter</p>
            <h2 className="mx-auto mt-4 max-w-xl text-3xl text-primary-foreground">
              One thoughtful Nepal letter each month
            </h2>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label className="flex-1">
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-3.5 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/50 focus:border-gold"
                />
              </label>
              <button
                type="submit"
                className="bg-gold-gradient rounded-2xl px-7 py-3.5 text-sm font-bold text-gold-foreground"
              >
                Subscribe
              </button>
            </form>
          </div>
        </Reveal>
      </section>
    </>
  );
}
