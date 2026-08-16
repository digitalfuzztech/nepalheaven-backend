import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugSchema = z.object({ slug: z.string().trim().min(1).max(200) });
const searchSchema = z.object({ q: z.string().trim().max(200) });

export const getDestinationsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getDestinations } = await import("@/lib/content.server");
    return getDestinations();
  },
);

export const getDestinationBySlugFn = createServerFn({ method: "GET" })
  .validator(slugSchema)
  .handler(async ({ data }) => {
    const { getDestinationBySlug } = await import("@/lib/content.server");
    return getDestinationBySlug(data.slug);
  });

export const getPackagesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPackages } = await import("@/lib/content.server");
    return getPackages();
  },
);

export const getPackageBySlugFn = createServerFn({ method: "GET" })
  .validator(slugSchema)
  .handler(async ({ data }) => {
    const { getPackageBySlug } = await import("@/lib/content.server");
    return getPackageBySlug(data.slug);
  });
export const getExperiencesFn = createServerFn({ method: "GET" }).handler(async () => { const { getExperiences } = await import("@/lib/content.server"); return getExperiences(); });
export const getExperienceBySlugFn = createServerFn({ method: "GET" }).validator(slugSchema).handler(async ({ data }) => { const { getExperienceBySlug } = await import("@/lib/content.server"); return getExperienceBySlug(data.slug); });
export const searchPublicContentFn = createServerFn({ method: "GET" }).validator(searchSchema).handler(async ({ data }) => { const { searchPublicContent } = await import("@/lib/content.server"); return searchPublicContent(data.q); });

export const getBlogPostsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getBlogPosts } = await import("@/lib/content.server");
    return getBlogPosts();
  },
);

export const getBlogPostBySlugFn = createServerFn({ method: "GET" })
  .validator(slugSchema)
  .handler(async ({ data }) => {
    const { getBlogPostBySlug } = await import("@/lib/content.server");
    return getBlogPostBySlug(data.slug);
  });

export const getFaqsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getFaqs } = await import("@/lib/content.server");
  return getFaqs();
});

export const getTestimonialsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getTestimonials } = await import("@/lib/content.server");
    return getTestimonials();
  },
);

export const getPublicSiteSettingsFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { getPublicSiteSettings } = await import("@/lib/content.server");
  return getPublicSiteSettings();
});

export const getHomeContentFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getHomeContent } = await import("@/lib/content.server");
    return getHomeContent();
  },
);

export const getShellContentFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getShellContent } = await import("@/lib/content.server");
    return getShellContent();
  },
);
