import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { FeaturedPosts } from "@/features/post/featured-posts";
import { EmptyState, PostGrid } from "@/features/post/post-card";
import { getPosts, isGitHubConfigured } from "@/infrastructure/github/github";
import { getFeaturedPosts } from "@/lib/posts";
import { routes } from "@/lib/routes";
import { buildBlogJsonLd, serializeJsonLd } from "@/lib/seo";

const RECENT_POSTS_COUNT = 9;

export const metadata: Metadata = {
  alternates: { canonical: routes.home },
};

export default async function Home() {
  const { posts } = await getPosts({ first: 50 });
  const featured = getFeaturedPosts(posts);
  const recent = posts.slice(0, RECENT_POSTS_COUNT);

  return (
    <div className="container-shell py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildBlogJsonLd()) }}
      />

      <section>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {siteConfig.title}
        </h1>
        <p className="mt-3 text-sm text-secondary">{siteConfig.description}</p>
      </section>

      {featured.length > 0 && (
        <div className="section-space">
          <FeaturedPosts posts={featured} />
        </div>
      )}

      <section className="section-space" aria-labelledby="recent-title">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="recent-title" className="text-base font-semibold">
            최근 포스트
          </h2>
          <Link
            href={routes.posts}
            className="text-sm text-secondary hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        {recent.length ? (
          <PostGrid posts={recent} />
        ) : (
          <EmptyState
            title={
              isGitHubConfigured()
                ? "아직 게시글이 없습니다"
                : "GitHub Discussions 연결이 필요합니다"
            }
            description={
              isGitHubConfigured()
                ? "첫 Discussion을 발행해 보세요."
                : ".env.local에 저장소 정보를 설정하면 게시글이 표시됩니다."
            }
          />
        )}
      </section>
    </div>
  );
}
