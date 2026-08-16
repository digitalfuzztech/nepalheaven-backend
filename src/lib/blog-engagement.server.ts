import { and, avg, count, desc, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { getRequestHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { blogComments, blogLikes, blogRatings } from "@/db/schema/blog-engagement";
import { blogPosts } from "@/db/schema/cms";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { resolveAssetReference } from "@/lib/asset-resolver";
import type { BlogEngagement } from "@/lib/content.types";

const SESSION_COOKIE = "nepalheaven_session";
function requireDb() { if (!db) throw new Error("Database is not configured."); return db; }
function sessionToken() {
  const cookie = getRequestHeader("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(/;\s*/)) { const separator = part.indexOf("="); if (separator > 0 && part.slice(0, separator) === SESSION_COOKIE) return part.slice(separator + 1); }
  return null;
}
async function currentCustomerId() {
  const token = sessionToken(); if (!token) return null;
  const database = requireDb();
  const [row] = await database.select({ id: users.id }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, createHash("sha256").update(token).digest("hex")), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()), eq(users.role, "customer"))).limit(1);
  return row?.id ?? null;
}
async function publishedPost(slug: string) {
  const [post] = await requireDb().select({ id: blogPosts.id }).from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published"))).limit(1);
  return post ?? null;
}
async function requireCustomerAndPost(slug: string) {
  const [userId, post] = await Promise.all([currentCustomerId(), publishedPost(slug)]);
  if (!post) return { ok: false as const, code: "not_found" as const };
  if (!userId) return { ok: false as const, code: "unauthorized" as const };
  return { ok: true as const, userId, postId: post.id };
}

export async function getBlogEngagement(slug: string): Promise<BlogEngagement | null> {
  const database = requireDb(); const post = await publishedPost(slug); if (!post) return null;
  const userId = await currentCustomerId();
  const [likeAggregate, ratingAggregate, likedRows, ratingRows, commentRows] = await Promise.all([
    database.select({ value: count() }).from(blogLikes).where(eq(blogLikes.blogPostId, post.id)),
    database.select({ average: avg(blogRatings.rating), value: count() }).from(blogRatings).where(eq(blogRatings.blogPostId, post.id)),
    userId ? database.select({ id: blogLikes.id }).from(blogLikes).where(and(eq(blogLikes.blogPostId, post.id), eq(blogLikes.userId, userId))).limit(1) : Promise.resolve([]),
    userId ? database.select({ rating: blogRatings.rating }).from(blogRatings).where(and(eq(blogRatings.blogPostId, post.id), eq(blogRatings.userId, userId))).limit(1) : Promise.resolve([]),
    database.select({ id: blogComments.id, content: blogComments.content, createdAt: blogComments.createdAt, customerName: users.name, avatarUrl: users.avatarUrl }).from(blogComments).innerJoin(users, eq(blogComments.userId, users.id)).where(and(eq(blogComments.blogPostId, post.id), eq(blogComments.status, "published"))).orderBy(desc(blogComments.createdAt)),
  ]);
  const average = ratingAggregate[0]?.average;
  return { likeCount: Number(likeAggregate[0]?.value ?? 0), hasLiked: likedRows.length > 0, averageRating: average === null || average === undefined ? null : Math.round(Number(average) * 10) / 10, ratingCount: Number(ratingAggregate[0]?.value ?? 0), currentUserRating: ratingRows[0]?.rating ?? null, comments: commentRows.map((row) => ({ id: row.id, customerName: row.customerName, ...(row.avatarUrl ? { avatarUrl: resolveAssetReference(row.avatarUrl) } : {}), content: row.content, createdAt: row.createdAt.toISOString() })) };
}

export async function toggleBlogLike(slug: string) {
  const auth = await requireCustomerAndPost(slug); if (!auth.ok) return auth;
  const database = requireDb();
  const [existing] = await database.select({ id: blogLikes.id }).from(blogLikes).where(and(eq(blogLikes.blogPostId, auth.postId), eq(blogLikes.userId, auth.userId))).limit(1);
  if (existing) await database.delete(blogLikes).where(eq(blogLikes.id, existing.id));
  else await database.insert(blogLikes).values({ id: randomUUID(), blogPostId: auth.postId, userId: auth.userId }).onDuplicateKeyUpdate({ set: { userId: auth.userId } });
  return { ok: true as const, engagement: await getBlogEngagement(slug) };
}
export async function setBlogRating(slug: string, rating: number) {
  const auth = await requireCustomerAndPost(slug); if (!auth.ok) return auth;
  await requireDb().insert(blogRatings).values({ id: randomUUID(), blogPostId: auth.postId, userId: auth.userId, rating }).onDuplicateKeyUpdate({ set: { rating, updatedAt: new Date() } });
  return { ok: true as const, engagement: await getBlogEngagement(slug) };
}
export async function createBlogComment(slug: string, content: string) {
  const auth = await requireCustomerAndPost(slug); if (!auth.ok) return auth;
  await requireDb().insert(blogComments).values({ id: randomUUID(), blogPostId: auth.postId, userId: auth.userId, content, status: "published" });
  return { ok: true as const, engagement: await getBlogEngagement(slug) };
}
