import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
const slug = z.string().trim().min(1).max(191);
export const getBlogEngagementFn = createServerFn({ method: "GET" }).validator(z.object({ slug })).handler(async ({ data }) => (await import("@/lib/blog-engagement.server")).getBlogEngagement(data.slug));
export const toggleBlogLikeFn = createServerFn({ method: "POST" }).validator(z.object({ slug })).handler(async ({ data }) => (await import("@/lib/blog-engagement.server")).toggleBlogLike(data.slug));
export const setBlogRatingFn = createServerFn({ method: "POST" }).validator(z.object({ slug, rating: z.number().int().min(1).max(5) })).handler(async ({ data }) => (await import("@/lib/blog-engagement.server")).setBlogRating(data.slug, data.rating));
export const createBlogCommentFn = createServerFn({ method: "POST" }).validator(z.object({ slug, content: z.string().trim().min(1).max(2000) })).handler(async ({ data }) => (await import("@/lib/blog-engagement.server")).createBlogComment(data.slug, data.content));
