import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import type { Testimonial } from "@/lib/content.types";
import { cn } from "@/lib/utils";

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const active = testimonials[index];

  if (!active) return null;

  const go = (dir: number) =>
    setIndex((i) => (i + dir + testimonials.length) % testimonials.length);

  return (
    <div className="glass-card relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
      <Quote className="absolute -right-4 -top-4 h-32 w-32 text-gold/10" aria-hidden />
      <div key={index} className="animate-reveal relative">
        <div className="flex items-center gap-1 text-gold" aria-label={`${active.rating} out of 5 stars`}>
          {Array.from({ length: active.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
          ))}
        </div>
        <blockquote className="mt-6 font-[family-name:var(--font-display)] text-xl leading-relaxed text-foreground sm:text-2xl">
          “{active.quote}”
        </blockquote>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <span className="bg-summit grid h-12 w-12 shrink-0 place-items-center rounded-full font-semibold text-primary-foreground">
            {active.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{active.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {active.country} · {active.trip}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4">
        <ul className="flex items-center gap-2">
          {testimonials.map((t, i) => (
            <li key={t.name}>
              <button
                type="button"
                aria-label={`Show review from ${t.name}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === index ? "w-8 bg-gold" : "w-3 bg-border hover:bg-muted-foreground",
                )}
              />
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous review"
            className="grid h-11 w-11 place-items-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next review"
            className="grid h-11 w-11 place-items-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
