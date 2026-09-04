import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { HomeHero } from "@/features/home/home-hero";
import { ArtGallery } from "@/features/post/art-gallery";
import { FeaturedPosts } from "@/features/post/featured-posts";
import { EmptyState } from "@/features/post/empty-state";
import { PostGrid } from "@/features/post/post-grid";
import {
  getFeaturedPosts,
  getRecentArtPosts,
  getRecentPosts,
  toPostPreview,
} from "@/features/post/post-queries";
import {
  getAllPosts,
  isGitHubConfigured,
} from "@/infrastructure/github/github";
import { routes } from "@/lib/routes";
import { buildBlogJsonLd, serializeJsonLd } from "@/lib/seo";

const RECENT_POSTS_COUNT = 9;
const RECENT_ART_COUNT = 8;

export const metadata: Metadata = {
  alternates: { canonical: routes.home },
};

export default async function Home() {
  const posts = await getAllPosts();
  const featured = getFeaturedPosts(posts).map(toPostPreview);
  const recent = getRecentPosts(posts, RECENT_POSTS_COUNT);
  const recentArt = getRecentArtPosts(posts, RECENT_ART_COUNT);
  const eagerImageSource =
    featured[0]?.coverImage.src ||
    recent.find((post) => post.coverImage.src)?.coverImage.src ||
    recentArt
      .map((post) => post.galleryImage ?? post.coverImage)
      .find((image) => image.src)?.src;

  return (
    <div className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildBlogJsonLd()) }}
      />

      <HomeHero title={siteConfig.title} description={siteConfig.description} />

      {featured.length > 0 && (
        <div className="section-space">
          <FeaturedPosts posts={featured} eagerImageSource={eagerImageSource} />
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
          <PostGrid posts={recent} eagerImageSource={eagerImageSource} />
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

      {recentArt.length > 0 && (
        <section className="section-space" aria-label="최근 Art 갤러리">
          <div className="mb-6 flex items-center justify-between">
            <p className="section-label">Gallery</p>
            <Link
              href={routes.category("art")}
              className="text-sm text-secondary hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          <ArtGallery posts={recentArt} eagerImageSource={eagerImageSource} />
        </section>
      )}
    </div>
  );
}
