import type { ReactNode } from "react";
import { useParallax } from "./Parallax";

/**
 * Full-bleed cinematic band: a slow-drifting image behind layered copy.
 */
export function ImmersiveBand({
  image,
  alt,
  children,
  height = "min-h-[86vh]",
}: {
  image: string;
  alt: string;
  children: ReactNode;
  height?: string;
}) {
  const { ref, progress } = useParallax<HTMLElement>();

  return (
    <section ref={ref} className={`grain relative isolate flex ${height} items-center overflow-hidden`}>
      <img
        src={image}
        alt={alt}
        loading="lazy"
        style={{ transform: `translate3d(0, ${progress * -70}px, 0) scale(1.18)` }}
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
      />
      <div className="bg-veil absolute inset-0" />
      <div className="absolute inset-0 bg-primary/45" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_15%_80%,color-mix(in_oklab,var(--gold)_28%,transparent),transparent_65%)]" />
      <div className="container-lux relative py-24">{children}</div>
    </section>
  );
}
