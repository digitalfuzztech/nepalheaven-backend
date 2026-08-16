import type { ReactNode } from "react";
import { buildWhatsAppEntryPath } from "@/lib/whatsapp.functions";

export function WhatsAppLink({
  context,
  slug,
  className,
  children,
}: {
  context: "homepage" | "destination" | "experience" | "package" | "other";
  slug?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={buildWhatsAppEntryPath(context, slug)} className={className}>
      {children}
    </a>
  );
}
