import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; to?: "/" | "/destinations" | "/packages" | "/experiences" | "/blog" };

export function PageHero({
  image,
  eyebrow,
  title,
  description,
  crumbs,
  compact = false,
}: {
  image: string;
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  compact?: boolean;
}) {
  return (
    <section className={`relative isolate flex ${compact ? "min-h-[56vh]" : "min-h-[72vh]"} items-end overflow-hidden`}>
      <img
        src={image}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
      <div className="bg-veil absolute inset-0" />
      <div className="absolute inset-0 bg-primary/30" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_10%_100%,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
      <div className="container-lux relative pb-20 pt-40">

        {crumbs ? (
          <nav aria-label="Breadcrumb">
            <ol className="glass-dark inline-flex flex-wrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-primary-foreground/75">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {c.to ? (
                    <Link to={c.to} className="transition-colors hover:text-gold">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-gold">{c.label}</span>
                  )}
                  {i < crumbs.length - 1 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <p className="eyebrow mt-7">{eyebrow}</p> : null}
        <h1 className="animate-reveal mt-5 max-w-4xl text-[2.5rem] leading-[1.02] text-primary-foreground sm:text-5xl lg:text-[4rem]">
          {title}
        </h1>
        {description ? (
          <p
            className="animate-reveal mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/80 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            {description}
          </p>
        ) : null}

      </div>
    </section>
  );
}
