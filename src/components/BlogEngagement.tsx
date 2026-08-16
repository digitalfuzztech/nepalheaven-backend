import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart, LoaderCircle, Star } from "lucide-react";
import { createBlogCommentFn, setBlogRatingFn, toggleBlogLikeFn } from "@/lib/blog-engagement.functions";
import type { BlogEngagement as BlogEngagementData } from "@/lib/content.types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function BlogEngagement({ slug, initial }: { slug: string; initial: BlogEngagementData }) {
  const [engagement, setEngagement] = useState(initial);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const login = () => void navigate({ to: "/login", search: { redirect: `/blog/${slug}` } });
  const requireCustomer = () => { if (user?.role !== "customer") { login(); return false; } return true; };
  const apply = (result: { ok: boolean; code?: string; engagement?: BlogEngagementData | null }) => {
    if (!result.ok && result.code === "unauthorized") return login();
    if (result.ok && result.engagement) setEngagement(result.engagement);
  };
  return <section className="mt-14 border-y border-border py-10" aria-labelledby="engagement-title">
    <h2 id="engagement-title" className="sr-only">Article engagement</h2>
    <div className="flex flex-wrap items-center justify-between gap-8">
      <button type="button" aria-pressed={engagement.hasLiked} onClick={async () => { if (!requireCustomer()) return; setBusy(true); apply(await toggleBlogLikeFn({ data: { slug } })); setBusy(false); }} className={cn("inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold", engagement.hasLiked ? "border-gold bg-accent text-gold-deep" : "border-border hover:border-gold hover:text-gold")}>
        <Heart className={cn("h-5 w-5", engagement.hasLiked && "fill-current")} /> {engagement.hasLiked ? "Liked" : "Like"} <span data-testid="blog-like-count" className="font-medium text-muted-foreground">{engagement.likeCount}</span>
      </button>
      <div><p className="text-sm font-semibold">Rate this story</p><div className="mt-2 flex items-center gap-1" aria-label="Choose a rating from 1 to 5">{[1,2,3,4,5].map((rating) => <button key={rating} type="button" aria-label={`Rate ${rating} out of 5`} aria-pressed={engagement.currentUserRating === rating} onClick={async () => { if (!requireCustomer()) return; setBusy(true); apply(await setBlogRatingFn({ data: { slug, rating } })); setBusy(false); }} className="p-1 text-gold"><Star className={cn("h-6 w-6", rating <= (engagement.currentUserRating ?? 0) && "fill-current")} /></button>)}</div><p className="mt-1 text-xs text-muted-foreground">{engagement.averageRating === null ? "Not rated yet" : `${engagement.averageRating.toFixed(1)} ★ · ${engagement.ratingCount} ${engagement.ratingCount === 1 ? "rating" : "ratings"}`}</p></div>
    </div>
    <div className="mt-12"><h2 className="text-2xl">Traveller Comments</h2>{engagement.comments.length ? <ul className="mt-7 space-y-5">{engagement.comments.map((item) => <li key={item.id} className="flex gap-4 rounded-2xl bg-sand p-5">{item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{item.customerName.charAt(0).toUpperCase()}</span>}<div><div className="flex flex-wrap items-baseline gap-2"><p className="font-semibold">{item.customerName}</p><time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.content}</p></div></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}
      <form className="mt-8" onSubmit={async (event) => { event.preventDefault(); if (!requireCustomer()) return; const content = comment.trim(); if (!content) return setError("Write a comment before posting."); if (content.length > 2000) return setError("Comments can be up to 2,000 characters."); setBusy(true); setError(""); const result = await createBlogCommentFn({ data: { slug, content } }); apply(result); if (result.ok) setComment(""); setBusy(false); }}><label htmlFor="blog-comment" className="block text-sm font-semibold">Write a comment</label><textarea id="blog-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} placeholder={user?.role === "customer" ? "Share what was useful…" : "Sign in to join the conversation…"} onFocus={() => { if (user?.role !== "customer") login(); }} className="mt-3 w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:border-gold" />{error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}<div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">{comment.length}/2000</span><button type="submit" disabled={busy} className="bg-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Post Comment</button></div></form>
    </div>
  </section>;
}
