import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

const mediaFilters = ["All", "Photos", "Videos"] as const;
const subjects = ["All Subjects", "Mountains", "Culture", "Wildlife", "Lakes", "Adventure", "Festivals", "Uncategorised"];

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
  const [mediaFilter, setMediaFilter] = useState<(typeof mediaFilters)[number]>("All");
  const [subject, setSubject] = useState("All Subjects");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = useMemo(
    () => galleryItems.filter((g) => (mediaFilter === "All" || (mediaFilter === "Photos" && g.type === "image") || (mediaFilter === "Videos" && g.type === "video")) && (subject === "All Subjects" || g.category === subject)),
    [galleryItems, mediaFilter, subject],
  );
  const active = lightbox !== null ? items[lightbox] : undefined;
  useEffect(() => { if (!active) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setLightbox(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [active]);

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
        <ul aria-label="Media type" className="flex flex-wrap justify-center gap-2">
          {mediaFilters.map((c) => (
            <li key={c}>
              <button
                type="button"
                aria-pressed={mediaFilter === c}
                onClick={() => {
                  setMediaFilter(c);
                  setLightbox(null);
                }}
                className={cn(
                  "rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors",
                  mediaFilter === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-gold hover:text-gold",
                )}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Gallery subject"><span className="mr-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Subject</span>{subjects.map((item) => <button key={item} type="button" aria-pressed={subject === item} onClick={() => { setSubject(item); setLightbox(null); }} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", subject === item ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-gold")}>{item}</button>)}</div>

        {items.length ? <ul className="mt-12 grid auto-rows-[13rem] grid-cols-2 gap-4 lg:grid-cols-4">
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
                <img src={g.type === "video" ? g.thumbnail : g.image} alt={g.title} loading="lazy" className="h-full w-full object-cover" />
                {g.type === "video" ? <span className="absolute inset-0 z-10 grid place-items-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-gold text-gold-foreground"><Play className="ml-1 h-6 w-6 fill-current" /></span></span> : null}
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
        </ul> : <div className="mt-12 rounded-3xl border border-border bg-card p-12 text-center"><Play className="mx-auto h-9 w-9 text-gold" /><h2 className="mt-4 text-2xl">{mediaFilter === "Videos" ? "Videos coming soon" : "Nothing here yet"}</h2><p className="mt-3 text-sm text-muted-foreground">{mediaFilter === "Videos" ? "The gallery supports real database video records; an owned or licensed source still needs to be supplied." : "Choose another filter."}</p></div>}
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
            {active.type === "video" && active.videoUrl ? <VideoPlayer item={active} /> : <img src={active.image} alt={active.title} className="max-h-[75vh] w-full rounded-3xl object-contain" />}
            <figcaption className="mt-4 text-center text-sm text-primary-foreground/80">
              {active.title} — {active.category}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}

function VideoPlayer({ item }: { item: (typeof Route.types.loaderData)["galleryItems"][number] }) {
  const provider = item.provider?.toLowerCase();
  const embedUrl = safeEmbedUrl(provider, item.videoUrl);
  if (embedUrl) return <iframe src={embedUrl} title={item.title} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" className="aspect-video w-full rounded-3xl bg-black" />;
  return <video src={item.videoUrl} poster={item.thumbnail} controls preload="metadata" playsInline className="max-h-[75vh] w-full rounded-3xl bg-black" />;
}

function safeEmbedUrl(provider: string | undefined, value: string | undefined) {
  if (!provider || !value || !["youtube", "vimeo"].includes(provider)) return null;
  try {
    const url = new URL(value);
    const hosts = provider === "youtube" ? ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"] : ["player.vimeo.com"];
    return url.protocol === "https:" && hosts.includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}
