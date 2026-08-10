import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-accent/60"
            >
              <span className="font-[family-name:var(--font-display)] text-lg leading-snug text-foreground">
                {item.q}
              </span>
              <Plus
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 text-gold transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                  isOpen && "rotate-45",
                )}
                aria-hidden
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
