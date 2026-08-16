import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Clock, Signal, Heart, GitCompareArrows } from "lucide-react";
import type { Package } from "@/lib/content.types";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";
import { useComparison } from "@/lib/comparison";

export function PackageCard({
  pkg,
  delay = 0,
  layout = "grid",
  comparisonBaseSlug,
}: {
  pkg: Package;
  delay?: number;
  layout?: "grid" | "row";
  comparisonBaseSlug?: string;
}) {
  const [saved, setSaved] = useState<boolean>(() => {
    try { return JSON.parse(window.localStorage.getItem("nepalheaven_saved_v1") || "[]").includes(pkg.slug); } catch { return false; }
  });
  const comparison = useComparison();

  return (
    <Reveal delay={delay} as="article" className="h-full">
      <div
        className={cn(
          "hover-lift group relative isolate flex h-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[var(--shadow-soft)]",
          layout === "row" ? "flex-col sm:flex-row" : "flex-col",
        )}
      >
        <div
          className={cn(
            "zoom-media sheen relative shrink-0",
            layout === "row" ? "sm:w-[42%]" : "aspect-16/11",
          )}
        >
          <img
            src={pkg.image}
            alt={pkg.title}
            loading="lazy"
            className={cn("h-full w-full object-cover", layout === "row" && "aspect-16/11 sm:aspect-auto")}
          />
          <div className="absolute inset-0 bg-linear-to-t from-primary/45 via-transparent to-transparent" />
          <span className="bg-gold-gradient absolute left-4 top-4 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide text-gold-foreground shadow-[var(--shadow-glow)]">
            From ${pkg.price.toLocaleString()}
          </span>
          <button
            type="button"
            aria-label={saved ? `Remove ${pkg.title} from wishlist` : `Save ${pkg.title} to wishlist`}
            aria-pressed={saved}
            onClick={() => {
              setSaved((current) => {
                const next = !current;
                try {
                  const existing = JSON.parse(window.localStorage.getItem("nepalheaven_saved_v1") || "[]") as string[];
                  const values = next ? [...new Set([...existing, pkg.slug])] : existing.filter((slug) => slug !== pkg.slug);
                  window.localStorage.setItem("nepalheaven_saved_v1", JSON.stringify(values));
                } catch {}
                return next;
              });
            }}
            className="glass-dark absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-primary-foreground transition-transform duration-300 hover:scale-110"
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current text-gold")} aria-hidden />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span className="rounded-full border border-gold/25 bg-accent px-2.5 py-1 uppercase tracking-[0.14em] text-accent-foreground">
              {pkg.style}
            </span>
            <span className="inline-flex items-center gap-1 text-gold">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {pkg.rating.toFixed(1)}
              <span className="text-muted-foreground">({pkg.reviews})</span>
            </span>
          </div>

          <h3 className="mt-3.5 text-[1.4rem] leading-snug transition-colors duration-500 group-hover:text-gold-deep">
            <Link to="/packages/$slug" params={{ slug: pkg.slug }} className="after:absolute after:inset-0">
              {pkg.title}
            </Link>
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{pkg.short}</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {pkg.highlights.slice(0, 3).map((h) => (
              <li
                key={h}
                className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground"
              >
                {h}
              </li>
            ))}
          </ul>


          <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
            <div className="flex min-w-0 flex-wrap gap-4 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                {pkg.days} {pkg.days === 1 ? "day" : "days"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Signal className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                {pkg.difficulty}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">

              <button
                type="button"
                aria-pressed={comparison.has(pkg.slug)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (comparisonBaseSlug) comparison.addMany([comparisonBaseSlug, pkg.slug]);
                  else comparison.toggle(pkg.slug);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  comparison.has(pkg.slug)
                    ? "border-gold bg-accent text-gold"
                    : "border-border text-muted-foreground hover:border-gold hover:text-gold",
                )}
              >
                <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
                {comparison.has(pkg.slug) ? "Added" : "Compare"}
              </button>
              <Link
                to="/packages/$slug"
                params={{ slug: pkg.slug }}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View trip
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
