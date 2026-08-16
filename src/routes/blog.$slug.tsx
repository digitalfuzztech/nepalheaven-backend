import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { getBlogPostBySlugFn, getBlogPostsFn } from "@/lib/content.functions";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { CtaBanner } from "@/components/CtaBanner";
import { BlogEngagement } from "@/components/BlogEngagement";
import { getBlogEngagementFn } from "@/lib/blog-engagement.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const [post, posts, engagement] = await Promise.all([
      getBlogPostBySlugFn({ data: { slug: params.slug } }),
      getBlogPostsFn(),
      getBlogEngagementFn({ data: { slug: params.slug } }),
    ]);
    if (!post) throw notFound();
    if (!engagement) throw notFound();
    return { post, posts, engagement };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article unavailable | Nepal Heaven" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    return {
      meta: [
        { title: `${p.title} | Nepal Heaven Journal` },
        { name: "description", content: p.excerpt },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/blog/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description: p.excerpt,
            author: { "@type": "Person", name: p.author.name },
            datePublished: p.date,
          }),
        },
      ],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { post, posts, engagement } = Route.useLoaderData();
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <PageHero
        compact
        image={post.image}
        eyebrow={post.category}
        title={post.title}
        crumbs={[{ label: "Home", to: "/" }, { label: "Blog", to: "/blog" }, { label: post.title }]}
      />

      <article className="container-lux grid gap-14 py-20 lg:grid-cols-[1fr_18rem] lg:py-24">
        <div>
          <div className="flex flex-wrap items-center gap-3 border-b border-border pb-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="text-foreground">{post.author.name}</span>
            <span aria-hidden>·</span>
            <span>{post.author.role}</span>
            <span aria-hidden>·</span>
            <span>{post.date}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {post.readingTime}
            </span>
          </div>

          <p className="mt-10 text-xl leading-relaxed text-foreground">{post.excerpt}</p>

          <div className="mt-8 space-y-6">
            {post.body.map((para, i) => (
              <p key={i} className="text-base leading-[1.85] text-muted-foreground">
                {para}
              </p>
            ))}
          </div>

          <BlogEngagement slug={post.slug} initial={engagement} />

          <div className="mt-14 rounded-3xl border border-border bg-sand p-8">
            <p className="eyebrow text-gold">About the author</p>
            <h2 className="mt-3 text-xl">{post.author.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {post.author.role} at Nepal Heaven. Based in Kathmandu, on the trail roughly half the year.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-7">
            <h2 className="text-lg">Keep reading</h2>
            <ul className="mt-5 space-y-5">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to="/blog/$slug" params={{ slug: r.slug }} className="group flex gap-4">
                    <span className="zoom-media h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                      <img src={r.image} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-gold">
                        {r.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{r.readingTime}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </article>

      <div className="pb-24">
        <CtaBanner />
      </div>

      <Reveal className="sr-only">
        <span>End of article</span>
      </Reveal>
    </>
  );
}
