import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  blogCategories,
  blogPosts,
  faqs,
  siteSettings,
  testimonials,
} from "@/db/schema/cms";
import {
  destinationExclusions,
  destinationHighlights,
  destinationInclusions,
  destinationItineraries,
  destinations,
  destinationTips,
} from "@/db/schema/destinations";
import {
  packageDestinations,
  packageExclusions,
  packageHighlights,
  packageInclusions,
  packageItineraries,
  packages,
  packageTiers,
} from "@/db/schema/packages";
import { experienceCategories, experienceHighlights, experiencePackages } from "@/db/schema/experiences";
import { media } from "@/db/schema/media";
import { resolveAssetReference } from "@/lib/asset-resolver";
import type {
  Activity,
  Company,
  Destination,
  ExperienceCategory,
  FaqGroup,
  GalleryItem,
  HomeContent,
  Milestone,
  Package,
  Post,
  PublicSiteSettings,
  ShellContent,
  SiteImages,
  Stat,
  TeamMember,
  Testimonial,
  WhyUsItem,
  PublicSearchResults,
} from "@/lib/content.types";

const publicSettingKeys = [
  "company.profile",
  "company.hours",
  "home.activities",
  "experiences.categories",
  "home.stats",
  "gallery.items",
  "about.team",
  "about.milestones",
  "about.awards",
  "about.partners",
  "home.why_us",
  "assets.images",
] as const;

function requireDb() {
  if (!db)
    throw new Error(
      "Public content is unavailable because the database is not configured.",
    );
  return db;
}

function titleCaseDifficulty(value: string | null): string {
  if (!value) return "";
  if (value === "extreme") return "Strenuous";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function parseJsonSetting<T>(
  values: Map<string, string | null>,
  key: string,
  fallback: T,
  isValid: (value: unknown) => boolean,
): T {
  const raw = values.get(key);
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

function resolveImageItems<T extends { image: string }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    image: resolveAssetReference(item.image),
  }));
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

export async function getDestinations(): Promise<Destination[]> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(destinations)
    .where(eq(destinations.status, true))
    .orderBy(asc(destinations.sortOrder));

  if (rows.length === 0) return [];
  const destinationIds = rows.map((row) => row.id);
  const [highlights, tips, itineraries, inclusions, exclusions] =
    await Promise.all([
      database
        .select()
        .from(destinationHighlights)
        .where(inArray(destinationHighlights.destinationId, destinationIds))
        .orderBy(asc(destinationHighlights.sortOrder)),
      database
        .select()
        .from(destinationTips)
        .where(inArray(destinationTips.destinationId, destinationIds))
        .orderBy(asc(destinationTips.sortOrder)),
      database
        .select()
        .from(destinationItineraries)
        .where(inArray(destinationItineraries.destinationId, destinationIds))
        .orderBy(asc(destinationItineraries.sortOrder)),
      database
        .select()
        .from(destinationInclusions)
        .where(inArray(destinationInclusions.destinationId, destinationIds))
        .orderBy(asc(destinationInclusions.sortOrder)),
      database
        .select()
        .from(destinationExclusions)
        .where(inArray(destinationExclusions.destinationId, destinationIds))
        .orderBy(asc(destinationExclusions.sortOrder)),
    ]);

  const highlightsByDestination = groupBy(
    highlights,
    (item) => item.destinationId,
  );
  const tipsByDestination = groupBy(tips, (item) => item.destinationId);
  const itinerariesByDestination = groupBy(
    itineraries,
    (item) => item.destinationId,
  );
  const inclusionsByDestination = groupBy(
    inclusions,
    (item) => item.destinationId,
  );
  const exclusionsByDestination = groupBy(
    exclusions,
    (item) => item.destinationId,
  );

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    region: row.region ?? "",
    image: resolveAssetReference(row.heroImage),
    altitude:
      row.altitudeLabel ??
      (row.elevation ? `${row.elevation.toLocaleString()} m` : ""),
    season: row.bestSeason ?? "",
    duration: row.duration ?? "",
    difficulty: row.difficulty ?? "",
    category: row.category ?? "",
    short: row.shortDescription ?? "",
    description: row.description ?? "",
    highlights: (highlightsByDestination.get(row.id) ?? []).map(
      (item) => item.item,
    ),
    tips: (tipsByDestination.get(row.id) ?? []).map((item) => item.item),
    itinerary: (itinerariesByDestination.get(row.id) ?? []).map((item) => ({
      day: item.dayLabel,
      title: item.title,
      detail: item.description ?? "",
    })),
    included: (inclusionsByDestination.get(row.id) ?? []).map(
      (item) => item.item,
    ),
    excluded: (exclusionsByDestination.get(row.id) ?? []).map(
      (item) => item.item,
    ),
  }));
}

export async function getDestinationBySlug(
  slug: string,
): Promise<Destination | null> {
  const destinations = await getDestinations();
  return destinations.find((destination) => destination.slug === slug) ?? null;
}

export async function getPackages(): Promise<Package[]> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(packages)
    .where(eq(packages.status, true))
    .orderBy(asc(packages.sortOrder));

  if (rows.length === 0) return [];
  const packageIds = rows.map((row) => row.id);
  const primaryDestinationIds = rows.flatMap((row) =>
    row.destinationId ? [row.destinationId] : [],
  );
  const [
    primaryDestinations,
    destinationLinks,
    highlights,
    tiers,
    itineraries,
    inclusions,
    exclusions,
  ] = await Promise.all([
    primaryDestinationIds.length === 0
      ? Promise.resolve([])
      : database
          .select()
          .from(destinations)
          .where(inArray(destinations.id, primaryDestinationIds)),
    database
      .select({
        packageId: packageDestinations.packageId,
        destination: destinations,
      })
      .from(packageDestinations)
      .innerJoin(
        destinations,
        eq(packageDestinations.destinationId, destinations.id),
      )
      .where(inArray(packageDestinations.packageId, packageIds))
      .orderBy(asc(packageDestinations.sortOrder)),
    database
      .select()
      .from(packageHighlights)
      .where(inArray(packageHighlights.packageId, packageIds))
      .orderBy(asc(packageHighlights.sortOrder)),
    database
      .select()
      .from(packageTiers)
      .where(inArray(packageTiers.packageId, packageIds))
      .orderBy(asc(packageTiers.sortOrder)),
    database
      .select()
      .from(packageItineraries)
      .where(inArray(packageItineraries.packageId, packageIds))
      .orderBy(asc(packageItineraries.sortOrder)),
    database
      .select()
      .from(packageInclusions)
      .where(inArray(packageInclusions.packageId, packageIds))
      .orderBy(asc(packageInclusions.sortOrder)),
    database
      .select()
      .from(packageExclusions)
      .where(inArray(packageExclusions.packageId, packageIds))
      .orderBy(asc(packageExclusions.sortOrder)),
  ]);

  const primaryDestinationById = new Map(
    primaryDestinations.map((destination) => [destination.id, destination]),
  );
  const destinationsByPackage = groupBy(
    destinationLinks,
    (item) => item.packageId,
  );
  const highlightsByPackage = groupBy(highlights, (item) => item.packageId);
  const tiersByPackage = groupBy(tiers, (item) => item.packageId);
  const itinerariesByPackage = groupBy(itineraries, (item) => item.packageId);
  const inclusionsByPackage = groupBy(inclusions, (item) => item.packageId);
  const exclusionsByPackage = groupBy(exclusions, (item) => item.packageId);

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    destination:
      row.destinationLabel ??
      (row.destinationId
        ? primaryDestinationById.get(row.destinationId)?.name
        : undefined) ??
      "",
    destinations: [...new Map([
      ...(row.destinationId && primaryDestinationById.get(row.destinationId) ? [{ slug: primaryDestinationById.get(row.destinationId)!.slug, name: primaryDestinationById.get(row.destinationId)!.name }] : []),
      ...(destinationsByPackage.get(row.id) ?? []).map((item) => ({ slug: item.destination.slug, name: item.destination.name })),
    ].map((item) => [item.slug, item])).values()],
    image: resolveAssetReference(row.heroImage),
    days: row.days ?? 0,
    price: Number(row.startingPrice ?? 0),
    ...(row.oldPrice === null ? {} : { oldPrice: Number(row.oldPrice) }),
    currency: row.currency,
    rating: Number(row.rating ?? 0),
    reviews: row.reviewCount,
    difficulty: titleCaseDifficulty(row.difficulty),
    style: row.style ?? "",
    short: row.shortDescription ?? "",
    highlights: (highlightsByPackage.get(row.id) ?? []).map(
      (item) => item.item,
    ),
    itinerary: (itinerariesByPackage.get(row.id) ?? []).map((item) => ({
      day: item.dayLabel ?? (item.day === null ? "" : `Day ${item.day}`),
      title: item.title,
      detail: item.description ?? "",
    })),
    included: (inclusionsByPackage.get(row.id) ?? []).map((item) => item.item),
    excluded: (exclusionsByPackage.get(row.id) ?? []).map((item) => item.item),
    tiers: (tiersByPackage.get(row.id) ?? []).map((item) => ({
      name: item.name,
      note: item.description ?? "",
      price: Number(item.price),
      currency: item.currency,
    })),
  }));
}

export async function getPackageBySlug(slug: string): Promise<Package | null> {
  const packages = await getPackages();
  return packages.find((packageItem) => packageItem.slug === slug) ?? null;
}
export async function getExperiences(): Promise<ExperienceCategory[]> {
  const database = requireDb();
  const rows = await database.select().from(experienceCategories).where(eq(experienceCategories.status, true)).orderBy(asc(experienceCategories.sortOrder));
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [highlights, links, packageRows, publicPackages] = await Promise.all([
    database.select().from(experienceHighlights).where(inArray(experienceHighlights.experienceId, ids)).orderBy(asc(experienceHighlights.sortOrder)),
    database.select().from(experiencePackages).where(inArray(experiencePackages.experienceId, ids)).orderBy(asc(experiencePackages.sortOrder)),
    database.select({ id: packages.id, slug: packages.slug }).from(packages).where(eq(packages.status, true)), getPackages(),
  ]);
  const highlightsByExperience = groupBy(highlights, (item) => item.experienceId);
  const linksByExperience = groupBy(links, (item) => item.experienceId);
  const slugById = new Map(packageRows.map((item) => [item.id, item.slug]));
  const packageBySlug = new Map(publicPackages.map((item) => [item.slug, item]));
  return rows.map((row) => {
    const related = (linksByExperience.get(row.id) ?? []).map((link) => packageBySlug.get(slugById.get(link.packageId) ?? "")).filter((item): item is Package => Boolean(item));
    return { slug: row.slug, name: row.name, short: row.shortDescription ?? "", detail: row.shortDescription ?? "", description: row.description ?? "", image: resolveAssetReference(row.heroImage), count: related.length, highlights: (highlightsByExperience.get(row.id) ?? []).map((item) => item.item), packages: related, seoTitle: row.seoTitle ?? `${row.name} Experiences | Nepal Heaven`, seoDescription: row.seoDescription ?? row.shortDescription ?? "" };
  });
}
export async function getExperienceBySlug(slug: string) { return (await getExperiences()).find((item) => item.slug === slug) ?? null; }
export async function searchPublicContent(query: string): Promise<PublicSearchResults> {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return { query: "", destinations: [], packages: [], experiences: [], articles: [] };
  const [allDestinations, allPackages, allExperiences, allArticles] = await Promise.all([getDestinations(), getPackages(), getExperiences(), getBlogPosts()]);
  const matches = (...values: (string | string[])[]) => values.flat().join(" ").toLocaleLowerCase().includes(normalized);
  return { query: query.trim(), destinations: allDestinations.filter((x) => matches(x.name, x.region, x.category, x.short)), packages: allPackages.filter((x) => matches(x.title, x.destination, x.style, x.difficulty, x.highlights)), experiences: allExperiences.filter((x) => matches(x.name, x.short, x.description)), articles: allArticles.filter((x) => matches(x.title, x.excerpt, x.category)) };
}

export async function getBlogPosts(): Promise<Post[]> {
  const database = requireDb();
  const rows = await database
    .select({ post: blogPosts, category: blogCategories })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(eq(blogPosts.status, "published"))
    .orderBy(asc(blogPosts.publishedAt));

  return rows
    .map(({ post, category }) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? "",
      category: category?.name ?? "",
      date: post.publishedAt
        ? new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(post.publishedAt)
        : "",
      readingTime: post.readingTimeMinutes
        ? `${post.readingTimeMinutes} min read`
        : "",
      author: { name: post.authorName ?? "", role: post.authorRole ?? "" },
      image: resolveAssetReference(post.coverImage),
      body: (post.content ?? "").split(/\r?\n\s*\r?\n/).filter(Boolean),
      publishedAt: post.publishedAt?.getTime() ?? 0,
    }))
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .map(({ publishedAt: _publishedAt, ...post }) => post);
}

export async function getBlogPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(testimonials)
    .where(eq(testimonials.status, "published"))
    .orderBy(asc(testimonials.sortOrder));
  return rows.map((row) => ({
    name: row.name,
    country: row.location ?? "",
    trip: row.tripName ?? "",
    quote: row.content,
    rating: Number(row.rating ?? 0),
    ...(row.avatarUrl ? { avatar: resolveAssetReference(row.avatarUrl) } : {}),
  }));
}

export async function getFaqs(): Promise<FaqGroup[]> {
  const database = requireDb();
  const rows = await database
    .select()
    .from(faqs)
    .where(eq(faqs.status, "published"));
  rows.sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
  const groups = new Map<string, FaqGroup>();
  for (const row of rows) {
    const category = row.category ?? "General";
    const group = groups.get(category) ?? { category, items: [] };
    group.items.push({ q: row.question, a: row.answer });
    groups.set(category, group);
  }
  return [...groups.values()];
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const database = requireDb();
  const rows = await database
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(inArray(siteSettings.key, [...publicSettingKeys]));
  const values = new Map(rows.map((row) => [row.key, row.value]));

  const companyProfile = parseJsonSetting<Record<string, unknown>>(
    values,
    "company.profile",
    {},
    isObject,
  );
  const companyHours = parseJsonSetting<Company["hours"]>(
    values,
    "company.hours",
    [],
    isArray,
  );
  const company: Company = {
    name:
      typeof companyProfile["name"] === "string"
        ? companyProfile["name"]
        : "Nepal Heaven",
    tagline:
      typeof companyProfile["tagline"] === "string"
        ? companyProfile["tagline"]
        : "",
    phone:
      typeof companyProfile["phone"] === "string"
        ? companyProfile["phone"]
        : "",
    whatsapp:
      typeof companyProfile["whatsapp"] === "string"
        ? companyProfile["whatsapp"]
        : "",
    email:
      typeof companyProfile["email"] === "string"
        ? companyProfile["email"]
        : "",
    address:
      typeof companyProfile["address"] === "string"
        ? companyProfile["address"]
        : "",
    hours: companyHours,
  };

  const activities = parseJsonSetting<Activity[]>(
    values,
    "home.activities",
    [],
    isArray,
  );
  const experienceCategories = resolveImageItems(
    parseJsonSetting<PublicSiteSettings["experienceCategories"]>(
      values,
      "experiences.categories",
      [],
      isArray,
    ),
  );
  const stats = parseJsonSetting<Stat[]>(values, "home.stats", [], isArray);
  const settingGalleryItems = parseJsonSetting<GalleryItem[]>(values, "gallery.items", [], isArray).map((item) => ({ ...item, type: item.type === "video" ? "video" as const : "image" as const, ...(item.image ? { image: resolveAssetReference(item.image) } : {}), ...(item.thumbnail ? { thumbnail: resolveAssetReference(item.thumbnail) } : {}) }));
  const mediaRows = await database.select().from(media).orderBy(asc(media.createdAt));
  const mediaUrl = (value: string) => value.startsWith("/") ? value : resolveAssetReference(value) || value;
  const galleryItems: GalleryItem[] = [
    ...settingGalleryItems,
    ...mediaRows.map((item) => ({
      type: item.type,
      ...(item.type === "image" ? { image: mediaUrl(item.url) } : { videoUrl: mediaUrl(item.url) }),
      ...(item.thumbnailUrl ? { thumbnail: mediaUrl(item.thumbnailUrl) } : {}),
      ...(item.provider ? { provider: item.provider } : {}),
      ...(item.caption ? { caption: item.caption } : {}),
      title: item.title ?? item.altText ?? (item.type === "video" ? "Nepal Heaven video" : "Nepal Heaven photograph"),
      category: "Uncategorised",
      span: "normal",
    })),
  ];
  const team = parseJsonSetting<TeamMember[]>(
    values,
    "about.team",
    [],
    isArray,
  );
  const milestones = parseJsonSetting<Milestone[]>(
    values,
    "about.milestones",
    [],
    isArray,
  );
  const awards = parseJsonSetting<string[]>(
    values,
    "about.awards",
    [],
    isArray,
  );
  const partners = parseJsonSetting<string[]>(
    values,
    "about.partners",
    [],
    isArray,
  );
  const whyUs = parseJsonSetting<WhyUsItem[]>(
    values,
    "home.why_us",
    [],
    isArray,
  );
  const rawImages = parseJsonSetting<Record<string, string>>(
    values,
    "assets.images",
    {},
    isObject,
  );
  const images = Object.fromEntries(
    Object.entries(rawImages).map(([key, value]) => [
      key,
      resolveAssetReference(value),
    ]),
  ) as SiteImages;

  return {
    company,
    activities,
    experienceCategories,
    stats,
    galleryItems,
    team,
    milestones,
    awards,
    partners,
    whyUs,
    images,
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  const [destinations, packages, posts, testimonials, settings] =
    await Promise.all([
      getDestinations(),
      getPackages(),
      getBlogPosts(),
      getTestimonials(),
      getPublicSiteSettings(),
    ]);
  return { destinations, packages, posts, testimonials, ...settings };
}

export async function getShellContent(): Promise<ShellContent> {
  const [destinations, packages, settings] = await Promise.all([
    getDestinations(),
    getPackages(),
    getPublicSiteSettings(),
  ]);
  return {
    company: settings.company,
    destinations: destinations.map(({ slug, name }) => ({ slug, name })),
    packages: packages.map(({ slug, title }) => ({ slug, title })),
  };
}
