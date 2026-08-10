import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  blogCategories,
  blogPosts,
  faqs,
  siteSettings,
  testimonials,
} from "@/db/schema/cms";
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

export async function getDestinations(): Promise<Destination[]> {
  const database = requireDb();
  const rows = await database.query.destinations.findMany({
    where: (table, { eq: equals }) => equals(table.status, true),
    orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
    with: {
      highlights: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      tips: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      itineraries: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      inclusions: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      exclusions: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
    },
  });

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
    highlights: row.highlights.map((item) => item.item),
    tips: row.tips.map((item) => item.item),
    itinerary: row.itineraries.map((item) => ({
      day: item.dayLabel,
      title: item.title,
      detail: item.description ?? "",
    })),
    included: row.inclusions.map((item) => item.item),
    excluded: row.exclusions.map((item) => item.item),
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
  const rows = await database.query.packages.findMany({
    where: (table, { eq: equals }) => equals(table.status, true),
    orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
    with: {
      primaryDestination: true,
      destinations: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
        with: { destination: true },
      },
      highlights: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      tiers: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      itineraries: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      inclusions: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
      exclusions: {
        orderBy: (table, { asc: ascending }) => [ascending(table.sortOrder)],
      },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    destination: row.destinationLabel ?? row.primaryDestination?.name ?? "",
    destinations: row.destinations.map((item) => ({
      slug: item.destination.slug,
      name: item.destination.name,
    })),
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
    highlights: row.highlights.map((item) => item.item),
    itinerary: row.itineraries.map((item) => ({
      day: item.dayLabel ?? (item.day === null ? "" : `Day ${item.day}`),
      title: item.title,
      detail: item.description ?? "",
    })),
    included: row.inclusions.map((item) => item.item),
    excluded: row.exclusions.map((item) => item.item),
    tiers: row.tiers.map((item) => ({
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
    parseJsonSetting<ExperienceCategory[]>(
      values,
      "experiences.categories",
      [],
      isArray,
    ),
  );
  const stats = parseJsonSetting<Stat[]>(values, "home.stats", [], isArray);
  const galleryItems = resolveImageItems(
    parseJsonSetting<GalleryItem[]>(values, "gallery.items", [], isArray),
  );
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
