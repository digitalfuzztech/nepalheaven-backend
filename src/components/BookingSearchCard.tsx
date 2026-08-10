import { CalendarDays, MapPin, Search, Users, Wallet } from "lucide-react";
import type { Destination } from "@/lib/content.types";

const fieldClass =
  "w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground";

export function BookingSearchCard({ destinations }: { destinations: Pick<Destination, "slug" | "name">[] }) {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      aria-label="Search journeys"
      className="glass-card grid gap-px overflow-hidden rounded-[1.75rem] p-2 md:grid-cols-[1.3fr_1fr_1fr_0.9fr_1fr_auto] md:items-center"
    >
      <Field icon={<MapPin className="h-4 w-4" aria-hidden />} label="Destination" htmlFor="f-dest">
        <select id="f-dest" className={fieldClass} defaultValue="">
          <option value="">Anywhere in Nepal</option>
          {destinations.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <Field icon={<CalendarDays className="h-4 w-4" aria-hidden />} label="Arrival" htmlFor="f-in">
        <input id="f-in" type="date" className={fieldClass} />
      </Field>

      <Field icon={<CalendarDays className="h-4 w-4" aria-hidden />} label="Departure" htmlFor="f-out">
        <input id="f-out" type="date" className={fieldClass} />
      </Field>

      <Field icon={<Users className="h-4 w-4" aria-hidden />} label="Travellers" htmlFor="f-pax">
        <select id="f-pax" className={fieldClass} defaultValue="2">
          {[1, 2, 3, 4, 6, 8, 12].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "traveller" : "travellers"}
            </option>
          ))}
        </select>
      </Field>

      <Field icon={<Wallet className="h-4 w-4" aria-hidden />} label="Budget" htmlFor="f-budget">
        <select id="f-budget" className={fieldClass} defaultValue="">
          <option value="">Any budget</option>
          <option value="1">Under $1,500</option>
          <option value="2">$1,500 – $3,000</option>
          <option value="3">$3,000 – $6,000</option>
          <option value="4">$6,000+</option>
        </select>
      </Field>

      <button
        type="submit"
        className="bg-gold-gradient m-2 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold text-gold-foreground transition-transform duration-300 hover:scale-[1.03] md:m-0 md:h-[4.25rem] md:px-7"
      >
        <Search className="h-4 w-4" aria-hidden />
        Search
      </button>
    </form>
  );
}

function Field({
  icon,
  label,
  htmlFor,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-accent/50">
      <span className="text-gold">{icon}</span>
      <span className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </label>
        {children}
      </span>
    </div>
  );
}
