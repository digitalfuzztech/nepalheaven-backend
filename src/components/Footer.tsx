import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Mail,
  Phone,
  MapPin,
  MountainSnow,
} from "lucide-react";
import type { ShellContent } from "@/lib/content.types";
import whiteLogo from "@/assets/logo-light4.png";
import { NewsletterForm } from "@/components/NewsletterForm";

export function Footer({ company, destinations, packages }: ShellContent) {
  return (
    <footer className="bg-summit relative mt-24 overflow-hidden text-primary-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
      />
      <div className="container-lux relative py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={whiteLogo}
                alt="Nepal Heaven"
                className="h-30 w-auto transition-all duration-500"
              />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Fifteen years designing private Himalayan journeys — from the
              Khumbu icefall to the walled lanes of Lo Manthang. Licensed,
              insured and locally owned in Kathmandu.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-primary-foreground/75">
              <li className="flex gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                  aria-hidden
                />
                {company.address}
              </li>
              <li className="flex gap-3">
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                  aria-hidden
                />
                <a
                  className="hover:text-gold"
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                >
                  {company.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                  aria-hidden
                />
                <a className="hover:text-gold" href={`mailto:${company.email}`}>
                  {company.email}
                </a>
              </li>
            </ul>
          </div>

          <nav aria-label="Quick links">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gold">
              Company
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/75">
              {[
                { label: "About us", to: "/about" as const },
                { label: "Experiences", to: "/experiences" as const },
                { label: "Travel stories", to: "/blog" as const },
                { label: "Gallery", to: "/gallery" as const },
                { label: "FAQ", to: "/faq" as const },
                { label: "Contact", to: "/contact" as const },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-gold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Destinations">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gold">
              Destinations
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/75">
              {destinations.slice(0, 6).map((d) => (
                <li key={d.slug}>
                  <Link
                    to="/destinations/$slug"
                    params={{ slug: d.slug }}
                    className="transition-colors hover:text-gold"
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gold">
              Journal
            </h3>
            <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
              Seasonal route notes, permit changes and quiet-season offers. One
              considered email a month.
            </p>
            <div className="mt-5">
              <NewsletterForm source="footer" dark />
            </div>

            <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-gold">
              Top packages
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-primary-foreground/75">
              {packages.slice(0, 4).map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/packages/$slug"
                    params={{ slug: p.slug }}
                    className="transition-colors hover:text-gold"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col-reverse items-center justify-between gap-6 border-t border-primary-foreground/15 pt-8 sm:flex-row">
          <p className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} Nepal Heaven Travels &amp; Tours Pvt.
            Ltd. All rights reserved.
          </p>
          <ul className="flex items-center gap-3">
            {[
              { Icon: Instagram, label: "Instagram" },
              { Icon: Facebook, label: "Facebook" },
              { Icon: Youtube, label: "YouTube" },
              { Icon: Twitter, label: "X" },
            ].map(({ Icon, label }) => (
              <li key={label}>
                <a
                  href="#"
                  aria-label={`${company.name} on ${label}`}
                  className="grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/20 text-primary-foreground/80 transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
