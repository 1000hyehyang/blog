import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GiscusComments } from "@/components/giscus-comments";
import { MarkdownContent } from "@/components/markdown";
import { siteConfig } from "@/config/site";
import { PostHero } from "@/features/post/post-hero";
import { PostTableOfContents } from "@/features/post/post-table-of-contents";
import { RelatedPosts } from "@/features/post/related-posts";
import { getPost, getPosts } from "@/infrastructure/github/github";
import { extractHeadings } from "@/lib/content";
import { getRelatedPosts } from "@/lib/posts";
import { routes } from "@/lib/routes";
import { buildPostJsonLd, serializeJsonLd } from "@/lib/seo";

type PostPageProps = {
  params: Promise<{ number: string }>;
};

function parsePostNumber(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const number = parsePostNumber((await params).number);
  if (!number) return {};
  const post = await getPost(number);
  if (!post) return {};

  const images = [post.coverImage || siteConfig.defaultImage];

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    alternates: { canonical: routes.post(number) },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: routes.post(number),
      images,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [siteConfig.author.name],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const number = parsePostNumber((await params).number);
  if (!number) notFound();

  const post = await getPost(number);
  if (!post || !post.published) notFound();

  const { posts } = await getPosts({ first: 50 });
  const relatedPosts = getRelatedPosts(posts, post);
  const headings = extractHeadings(post.body);

  return (
    <article className="container-shell py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildPostJsonLd(post)),
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
