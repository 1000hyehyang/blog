import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { HomeHero } from "@/features/home/home-hero";
import { FeaturedPosts } from "@/features/post/featured-posts";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";
import { getFeaturedPosts } from "@/features/post/post-queries";
import { getPosts, isGitHubConfigured } from "@/infrastructure/github/github";
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
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildBlogJsonLd()) }}
      />

      <HomeHero
        title={siteConfig.title}
        description={siteConfig.description}
      />

      {featured.length > 0 && (
        <div className="section-space">
          <FeaturedPosts posts={featured} />
        </div>
      )}

      <section className="section-space" aria-labelledby="recent-title">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="recent-title" className="section-heading">
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
                ? "아직 포스트가 없습니다"
                : "GitHub Discussions 연결이 필요합니다"
            }
            description={
              isGitHubConfigured()
                ? "첫 Discussion을 발행해 보세요."
                : ".env.local에 저장소 정보를 설정하면 포스트가 표시됩니다."
            }
          />
        )}
      </section>
    </div>
  );
}
