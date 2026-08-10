const marks = [
  "Nepal Tourism Board licensed",
  "TAAN member",
  "NMA certified guides",
  "4.9 on Tripadvisor",
  "24/7 Kathmandu desk",
  "1,000+ travellers hosted",
  "Private departures",
  "Carbon-offset flights",
];

export function TrustMarquee() {
  return (
    <div className="mask-fade-x relative overflow-hidden border-y border-border/60 bg-card/40 py-4 backdrop-blur-sm">
      <ul className="animate-marquee flex w-max items-center gap-12 pr-12" aria-hidden>
        {[...marks, ...marks].map((m, i) => (
          <li
            key={`${m}-${i}`}
            className="flex shrink-0 items-center gap-4 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {m}
          </li>
        ))}
      </ul>
      <p className="sr-only">{marks.join(", ")}</p>
    </div>
  );
}
