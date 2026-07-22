import Link from "next/link";

import { siteConfig } from "@/config/site";
import { FeaturedPosts } from "@/features/post/featured-posts";
import { EmptyState, PostGrid } from "@/features/post/post-card";
import { getPosts, isGitHubConfigured } from "@/infrastructure/github/github";

export default async function Home() {
  const { posts } = await getPosts({ first: 12 });
  const featured = posts
    .filter((post) => post.featured)
    .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

  return (
    <div className="container-shell py-16 sm:py-24">
      <section>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {siteConfig.title}
        </h1>
        <p className="mt-3 text-sm text-secondary">{siteConfig.description}</p>
      </section>

      <div className="section-space">
        <FeaturedPosts posts={featured} />
      </div>

      <section className="section-space grid gap-6 rounded-[var(--radius-lg)] bg-muted p-6 text-xs sm:grid-cols-[1.1fr_1fr] sm:p-8">
        <div>
          <p className="text-tertiary">반갑습니다!</p>
          <p className="mt-2 text-sm font-semibold">
            {siteConfig.profileMessage}
          </p>
          <p className="mt-5 text-secondary">
            {siteConfig.author.name} · {siteConfig.author.role}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <a
            href={siteConfig.socialLinks.github}
            target="_blank"
            rel="noreferrer"
          >
            <strong className="block text-foreground">GitHub</strong>
            <span className="text-tertiary">코드와 프로젝트</span>
          </a>
          <Link href={siteConfig.socialLinks.portfolio}>
            <strong className="block text-foreground">Portfolio</strong>
            <span className="text-tertiary">작업 소개</span>
          </Link>
          <a href={siteConfig.socialLinks.email}>
            <strong className="block text-foreground">Email</strong>
            <span className="text-tertiary">연락하기</span>
          </a>
          <Link href={siteConfig.socialLinks.library}>
            <strong className="block text-foreground">Library</strong>
            <span className="text-tertiary">모든 기록</span>
          </Link>
        </div>
      </section>

      <section className="section-space" aria-labelledby="recent-title">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="recent-title" className="text-sm font-semibold">
            최근 포스트
          </h2>
          <Link
            href="/posts"
            className="text-xs text-secondary hover:text-foreground"
          >
            전체 보기 →
          </Link>
        </div>
        {posts.length ? (
          <PostGrid posts={posts.slice(0, 9)} />
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
