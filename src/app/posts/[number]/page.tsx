import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiscusComments } from "@/components/giscus-comments";
import { MarkdownContent } from "@/components/markdown";
import { siteConfig } from "@/config/site";
import { PostHero } from "@/features/post/post-hero";
import { RelatedPosts } from "@/features/post/related-posts";
import { PostTableOfContents } from "@/features/post/post-table-of-contents";
import { getPost, getPosts } from "@/infrastructure/github/github";
import { toSlug } from "@/lib/content";
import { getRelatedPosts } from "@/lib/posts";

function parseNumber(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const number = parseNumber((await params).number);
  if (!number) return {};
  const post = await getPost(number);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/posts/${number}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [siteConfig.defaultImage],
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const number = parseNumber((await params).number);
  if (!number) notFound();
  const post = await getPost(number);
  if (!post || !post.published) notFound();
  const all = (await getPosts({ first: 50 })).posts;
  const relatedPosts = getRelatedPosts(all, post);
  const headings = [...post.body.matchAll(/^(#{1,3})\s+(.+)$/gm)].map(
    (match) => ({
      level: match[1].length as 1 | 2 | 3,
      text: match[2],
      id: toSlug(match[2]),
    }),
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage || siteConfig.defaultImage,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: siteConfig.author.name },
    mainEntityOfPage: `${siteConfig.url}/posts/${post.number}`,
  };

  return (
    <article className="container-shell py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto grid max-w-[var(--container-width)] gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-20">
        <div className="min-w-0">
          <PostHero post={post} />

          <div className="mt-10">
            {post.body ? (
              <MarkdownContent source={post.body} />
            ) : (
              <p className="text-sm text-tertiary">
                본문이 없습니다. GitHub Discussion에서 글을 작성해 주세요.
              </p>
            )}
          </div>

          <section
            className="mt-16 border-t pt-12"
            aria-labelledby="comments-title"
          >
            <h2
              id="comments-title"
              className="text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Comments
            </h2>
            <div className="mt-6">
              <GiscusComments discussionNumber={post.number} />
            </div>
          </section>

          <RelatedPosts posts={relatedPosts} embedded />
        </div>

        <PostTableOfContents headings={headings} />
      </div>
    </article>
  );
}
