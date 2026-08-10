import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

const categories = ["All", "Mountains", "Culture", "Wildlife", "Lakes", "Adventure", "Festivals"];

export const Route = createFileRoute("/gallery")({
  loader: () => getPublicSiteSettingsFn(),
  head: () => ({
    meta: [
      { title: "Nepal Photo Gallery — Mountains, Culture & Wildlife | Nepal Heaven" },
      {
        name: "description",
        content: "A curated gallery of Nepal: Himalayan summits, Newari heritage, Terai wildlife, alpine lakes and festivals.",
      },
      { property: "og:title", content: "Nepal Photo Gallery | Nepal Heaven" },
      { property: "og:description", content: "Photographs from our guides across every region of Nepal." },
      { property: "og:url", content: "/gallery" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { galleryItems, images } = Route.useLoaderData();
  const [category, setCategory] = useState("All");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = useMemo(
    () => galleryItems.filter((g) => category === "All" || g.category === category),
    [category],
  );
  const active = lightbox !== null ? items[lightbox] : undefined;

  return (
    <>
      <PageHero
        compact
        image={images.destRara}
        eyebrow="Gallery"
        title="Nepal, as our guides see it"
        description="Every photograph below was taken on one of our departures — no stock, no filters."
        crumbs={[{ label: "Home", to: "/" }, { label: "Gallery" }]}
      />

      <section className="container-lux py-20 lg:py-24">
        <ul className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <li key={c}>
              <button
                type="button"
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  setLightbox(null);
                }}
                className={cn(
                  "rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors",
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

        <ul className="mt-12 grid auto-rows-[13rem] grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((g, i) => (
            <Reveal
              key={g.title}
              as="li"
              delay={i * 45}
              className={cn(
                g.span === "tall" && "row-span-2",
                g.span === "wide" && "col-span-2",
              )}
            >
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="zoom-media group relative block h-full w-full overflow-hidden rounded-3xl text-left"
              >
                <img src={g.image} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
                <span className="bg-veil absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-95" />
                <span className="absolute inset-x-0 bottom-0 p-5">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">
                    {g.category}
                  </span>
                  <span className="mt-1 block font-[family-name:var(--font-display)] text-lg text-primary-foreground">
                    {g.title}
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </ul>
      </section>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-[80] grid place-items-center bg-primary/85 p-6 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full border border-primary-foreground/25 text-primary-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" aria-hidden />
          </button>
          <figure className="max-h-[85vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={active.image} alt={active.title} className="max-h-[75vh] w-full rounded-3xl object-cover" />
            <figcaption className="mt-4 text-center text-sm text-primary-foreground/80">
              {active.title} — {active.category}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
