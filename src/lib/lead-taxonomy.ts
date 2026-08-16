export const leadTypeLabels = {
  1: "Email Lead",
  2: "Contact Lead",
  3: "Destination Lead",
  4: "Experiences Lead",
  5: "WhatsApp Lead",
} as const;

export type CanonicalLeadLevel = keyof typeof leadTypeLabels;

export function getLeadTypeLabel(level: number) {
  return leadTypeLabels[level as CanonicalLeadLevel] ?? "Unclassified";
}

export function getLeadSourceLabel(source: string) {
  const labels: Record<string, string> = {
    homepage: "Homepage Newsletter",
    footer: "Footer Newsletter",
    contact: "Contact Page",
    destination: "Destination Inquiry",
    experience: "Experience Inquiry",
    itinerary_request: "Itinerary Request",
    package_inquiry: "Package Inquiry",
    website_whatsapp: "Website WhatsApp",
    meta_whatsapp_ad: "Meta Click-to-WhatsApp",
    unclassified: "Unclassified / Organic",
  };
  return labels[source] ?? source;
}
