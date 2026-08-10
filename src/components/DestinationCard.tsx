import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Mountain, Clock } from "lucide-react";
import type { Destination } from "@/lib/content.types";
import { Reveal } from "./Reveal";

export function DestinationCard({ destination, delay = 0 }: { destination: Destination; delay?: number }) {
  return (
    <Reveal delay={delay} as="article" className="h-full">
      <Link
        to="/destinations/$slug"
        params={{ slug: destination.slug }}
        className="zoom-media hover-lift sheen group relative flex h-full min-h-[28rem] flex-col justify-end overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-soft)]"
      >
        <img
          src={destination.image}
          alt={`${destination.name}, Nepal`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="bg-veil absolute inset-0" />
        <div className="absolute inset-0 bg-linear-to-t from-primary/60 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        <div className="absolute inset-x-0 top-0 flex justify-between p-5">
          <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
            <Mountain className="h-3.5 w-3.5 text-gold" aria-hidden />
            {destination.region}
          </span>
        </div>
        <div className="relative p-6 sm:p-7">
          <h3 className="text-[1.7rem] leading-tight text-primary-foreground">{destination.name}</h3>
          <p className="mt-2.5 line-clamp-2 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
            {destination.short}
          </p>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-primary-foreground/15 pt-5">
            <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium tracking-wide text-primary-foreground/75">
              <Clock className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
              <span className="truncate">{destination.duration}</span>
            </span>
            <span className="glass-dark inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors duration-500 group-hover:text-gold">
              Explore
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>

  );
}
