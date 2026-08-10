import { useEffect, useRef, useState } from "react";

/**
 * Returns a value between -1 and 1 describing how far the element is from the
 * vertical centre of the viewport. Used for gentle parallax drift.
 */
export function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const centre = rect.top + rect.height / 2;
      const p = (centre - window.innerHeight / 2) / (window.innerHeight / 2 + rect.height / 2);
      setProgress(Math.max(-1, Math.min(1, p)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, progress };
}
