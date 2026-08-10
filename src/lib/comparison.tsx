import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Package } from "@/lib/content.types";

const KEY = "nepalheaven_compare_v1";

type ComparisonContextValue = {
  items: string[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
  toggle: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as string[]);
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => ({
    items,
    add: (slug: string) => setItems((current) => current.includes(slug) || current.length >= 3 ? current : [...current, slug]),
    remove: (slug: string) => setItems((current) => current.filter((x) => x !== slug)),
    toggle: (slug: string) => setItems((current) => current.includes(slug) ? current.filter((x) => x !== slug) : current.length < 3 ? [...current, slug] : current),
    clear: () => setItems([]),
    has: (slug: string) => items.includes(slug),
  }), [items]);

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) throw new Error("useComparison must be used inside ComparisonProvider");
  return context;
}

export function packagesForComparison(packages: Package[], slugs: string[]) {
  return slugs.map((slug) => packages.find((pkg) => pkg.slug === slug)).filter(Boolean) as Package[];
}
