import { Link } from "@tanstack/react-router";
import { ArrowRight, PhoneCall } from "lucide-react";
import { getBundledAsset } from "@/lib/asset-resolver";
import { Reveal } from "./Reveal";

const ctaLodge = getBundledAsset("asset:src/assets/cta-lodge.jpg");

export function CtaBanner() {
  return (
    <section className="container-lux">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-gold/20 shadow-[var(--shadow-elevated)]">
          <img
            src={ctaLodge}
            alt="Himalayan lodge terrace at dusk"
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
          <div className="absolute inset-0 bg-primary/75" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_100%_at_100%_0%,color-mix(in_oklab,var(--gold)_28%,transparent),transparent_62%)]" />
          <div className="animate-drift absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold/15 blur-3xl" aria-hidden />
          <div className="relative grid gap-8 px-8 py-16 sm:px-14 sm:py-24 lg:grid-cols-[1.4fr_1fr] lg:items-end">

            <div>
              <p className="eyebrow">Bespoke planning</p>
              <h2 className="mt-4 max-w-xl text-3xl leading-tight text-primary-foreground sm:text-4xl lg:text-[2.9rem]">
                Let's plan your dream Nepal journey.
              </h2>
              <p className="mt-5 max-w-lg text-primary-foreground/75">
                Tell us your dates, your pace and how high you want to go. A Kathmandu-based specialist will send a
                tailored itinerary within 24 hours — no obligation, no templates.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to="/contact"
                className="bg-gold-gradient inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-bold text-gold-foreground transition-transform duration-300 hover:scale-[1.04]"
              >
                Plan my trip
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="tel:+97714412880"
                className="glass-dark inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-bold text-primary-foreground transition-colors hover:text-gold"
              >
                <PhoneCall className="h-4 w-4" aria-hidden />
                Talk to a specialist
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
