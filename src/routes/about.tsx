import { createFileRoute } from "@tanstack/react-router";
import { Award, Handshake } from "lucide-react";
import { getPublicSiteSettingsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { Counter } from "@/components/Counter";
import { CtaBanner } from "@/components/CtaBanner";

export const Route = createFileRoute("/about")({
  loader: () => getPublicSiteSettingsFn(),
  head: () => ({
    meta: [
      { title: "About Nepal Heaven — Locally Owned Himalayan Specialists" },
      {
        name: "description",
        content:
          "Founded in Kathmandu in 2011 by Sherpa mountain professionals. Our story, team, milestones, awards and partners.",
      },
      { property: "og:title", content: "About Nepal Heaven" },
      { property: "og:description", content: "Fifteen years of locally owned, expert-led Himalayan travel." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { awards, images, milestones, partners, stats, team } = Route.useLoaderData();
  return (
    <>
      <PageHero
        image={images.destBandipur}
        eyebrow="Our story"
        title="Locally owned. Mountain born."
        description="Nepal Heaven began with one Sherpa guide, one borrowed office in Lazimpath and a conviction that Nepal deserved better travel."
        crumbs={[{ label: "Home", to: "/" }, { label: "About" }]}
      />

      <section className="container-lux grid gap-14 py-20 lg:grid-cols-2 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Mission"
            title="Travel that leaves Nepal better than it found it"
            description="We exist to give travellers an unfiltered, well-supported experience of the Himalaya while ensuring the people who make it possible — guides, porters, lodge families — are paid, insured and respected."
          />
        </Reveal>
        <Reveal delay={100}>
          <SectionHeading
            eyebrow="Vision"
            title="The most trusted name in Himalayan travel"
            description="Not the largest operator in Nepal — the one travellers recommend without hesitation and guides most want to work for."
          />
        </Reveal>
        <Reveal delay={160} className="lg:col-span-2">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
            <h2 className="text-3xl">The story</h2>
            <div className="mt-6 grid gap-6 text-base leading-relaxed text-muted-foreground lg:grid-cols-2">
              <p>
                Pemba Sherpa grew up in Khumjung at 3,790 m, carrying loads to Base Camp before he was twenty and
                summiting Everest six times before he was forty. In 2011 he stopped climbing for other companies and
                started one of his own.
              </p>
              <p>
                Fifteen years later, Nepal Heaven has hosted more than ten thousand travellers across 250 curated
                journeys. Every guide on the team is licensed, insured and paid above the industry standard. Every
                porter carries within legal limits. Every lodge we book has been slept in by someone on our staff.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="bg-summit py-24">
        <div className="container-lux">
          <dl className="grid gap-10 text-center sm:grid-cols-4">
            {stats.map((s) => (
              <Reveal key={s.label}>
                <div>
                  <dt className="font-[family-name:var(--font-display)] text-4xl font-semibold text-gold sm:text-5xl">
                    <Counter value={s.value} suffix={s.suffix} />
                  </dt>
                  <dd className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
                    {s.label}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-lux py-24">
        <SectionHeading eyebrow="Our people" title="Meet the team" align="center" />
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m, i) => (
            <Reveal key={m.name} as="li" delay={i * 70}>
              <div className="hover-lift h-full rounded-3xl border border-border bg-card p-7 text-center">
                <span className="bg-summit mx-auto grid h-20 w-20 place-items-center rounded-full font-[family-name:var(--font-display)] text-2xl font-semibold text-primary-foreground">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <h3 className="mt-5 text-lg">{m.name}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">{m.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="bg-sand py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Milestones" title="Fifteen years in five moments" />
          <ol className="mt-14 border-l border-border pl-8">
            {milestones.map((m) => (
              <li key={m.year} className="relative pb-12 last:pb-0">
                <span className="bg-gold-gradient absolute -left-[2.15rem] top-1.5 h-4 w-4 rounded-full ring-4 ring-sand" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{m.year}</p>
                <h3 className="mt-2 text-xl">{m.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{m.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-lux grid gap-12 py-24 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Recognition" title="Awards" />
          <ul className="mt-8 space-y-3">
            {awards.map((a) => (
              <li key={a} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeading eyebrow="Accredited by" title="Partners" />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {partners.map((p) => (
              <li key={p} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm font-semibold">
                <Handshake className="h-4 w-4 shrink-0 text-forest" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pb-24">
        <CtaBanner />
      </div>
    </>
  );
}
