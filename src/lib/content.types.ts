export type Destination = {
  slug: string;
  name: string;
  region: string;
  image: string;
  altitude: string;
  season: string;
  duration: string;
  difficulty: string;
  short: string;
  description: string;
  highlights: string[];
  tips: string[];
  included: string[];
  excluded: string[];
  itinerary: { day: string; title: string; detail: string }[];
  category: string;
};

export type Package = {
  slug: string;
  title: string;
  destination: string;
  destinations: { slug: string; name: string }[];
  image: string;
  days: number;
  price: number;
  oldPrice?: number;
  currency: string;
  rating: number;
  reviews: number;
  difficulty: string;
  style: string;
  short: string;
  highlights: string[];
  itinerary: { day: string; title: string; detail: string }[];
  included: string[];
  excluded: string[];
  tiers: { name: string; note: string; price: number; currency: string }[];
};

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
  author: { name: string; role: string };
  image: string;
  body: string[];
};

export type Testimonial = {
  name: string;
  country: string;
  trip: string;
  quote: string;
  rating: number;
  avatar?: string;
};

export type FaqGroup = {
  category: string;
  items: { q: string; a: string }[];
};

export type Company = {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: { day: string; time: string }[];
};

export type Activity = { name: string; detail: string; icon: string };
export type ExperienceCategory = {
  slug: string;
  name: string;
  short: string;
  description: string;
  detail: string;
  image: string;
  count: number;
  highlights: string[];
  packages: Package[];
  seoTitle: string;
  seoDescription: string;
};
export type Stat = { value: number; suffix: string; label: string };
export type GalleryItem = {
  type: "image" | "video";
  image?: string;
  videoUrl?: string;
  thumbnail?: string;
  provider?: string;
  title: string;
  category: string;
  span: string;
  caption?: string;
};
export type BlogComment = { id: string; customerName: string; avatarUrl?: string; content: string; createdAt: string };
export type BlogEngagement = { likeCount: number; hasLiked: boolean; averageRating: number | null; ratingCount: number; currentUserRating: number | null; comments: BlogComment[] };
export type PublicSearchResults = { query: string; destinations: Destination[]; packages: Package[]; experiences: ExperienceCategory[]; articles: Post[] };
export type TeamMember = { name: string; role: string; bio: string };
export type Milestone = { year: string; title: string; detail: string };
export type WhyUsItem = { title: string; detail: string; icon: string };

export type SiteImages = {
  heroEverest: string;
  destEverest: string;
  destAnnapurna: string;
  destPokhara: string;
  destChitwan: string;
  destLumbini: string;
  destMustang: string;
  destRara: string;
  destBandipur: string;
  destKathmandu: string;
  expParagliding: string;
  ctaLodge: string;
};

export type PublicSiteSettings = {
  company: Company;
  activities: Activity[];
  experienceCategories: LegacyExperienceCategory[];
  stats: Stat[];
  galleryItems: GalleryItem[];
  team: TeamMember[];
  milestones: Milestone[];
  awards: string[];
  partners: string[];
  whyUs: WhyUsItem[];
  images: SiteImages;
};
type LegacyExperienceCategory = { name: string; detail: string; image: string; count?: number };

export type HomeContent = PublicSiteSettings & {
  destinations: Destination[];
  packages: Package[];
  posts: Post[];
  testimonials: Testimonial[];
};

export type ShellContent = {
  company: Company;
  destinations: Pick<Destination, "slug" | "name">[];
  packages: Pick<Package, "slug" | "title">[];
};
