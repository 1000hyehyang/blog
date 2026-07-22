import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ExternalLink, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown";
import { siteConfig } from "@/config/site";
import { CategoryBadge } from "@/features/post/post-card";
import { getPost, getPosts } from "@/infrastructure/github/github";
import { formatDate, toSlug } from "@/lib/content";

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
  const result = await getPost(number);
  if (!result) return {};
  return {
    title: result.post.title,
    description: result.post.excerpt,
    alternates: { canonical: `/posts/${number}` },
    openGraph: {
      type: "article",
      title: result.post.title,
      description: result.post.excerpt,
      images: [result.post.coverImage],
      publishedTime: result.post.createdAt,
      modifiedTime: result.post.updatedAt,
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
  const result = await getPost(number);
  if (!result || !result.post.published) notFound();
  const { post, comments } = result;
  const all = (await getPosts({ first: 50 })).posts;
  const position = all.findIndex((item) => item.number === post.number);
  const previous = all[position + 1];
  const next = position > 0 ? all[position - 1] : undefined;
  const headings = [...post.body.matchAll(/^##\s+(.+)$/gm)].map((match) => ({
    text: match[1],
    id: toSlug(match[1]),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author.login },
    mainEntityOfPage: `${siteConfig.url}/posts/${post.number}`,
  };

  return (
    <article className="container-shell py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="mx-auto max-w-[var(--content-width)]">
        <CategoryBadge name={post.category.name} />
        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-base leading-7 text-secondary">
          {post.excerpt}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-tertiary">
          <span>{post.author.login}</span>
          <span>·</span>
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          {post.updatedAt !== post.createdAt && (
            <span>수정 {formatDate(post.updatedAt)}</span>
          )}
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-secondary"
          >
            GitHub 원문 <ExternalLink size={12} />
          </a>
        </div>
      </header>

      <div className="relative mx-auto mt-12 aspect-[16/8] max-w-5xl overflow-hidden rounded-[var(--radius-lg)] bg-muted">
        <Image
          src={post.coverImage}
          alt={`${post.title} 대표 이미지`}
          fill
          priority
          unoptimized
          sizes="(max-width: 1120px) 100vw, 1120px"
          className="object-cover"
        />
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-12 lg:grid-cols-[1fr_200px]">
        <MarkdownContent source={post.body} />
        {headings.length > 0 && (
          <aside className="order-first lg:order-last">
            <nav
              aria-label="목차"
              className="sticky top-24 border-l pl-4 text-xs text-secondary"
            >
              <p className="mb-3 font-semibold text-foreground">목차</p>
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className="my-2 block"
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>

      <nav
        aria-label="이전 및 다음 글"
        className="mx-auto mt-20 grid max-w-[var(--content-width)] gap-3 sm:grid-cols-2"
      >
        {previous ? (
          <Link
            href={`/posts/${previous.number}`}
            className="rounded-[var(--radius-md)] border p-5 text-sm"
          >
            <ArrowLeft size={15} />
            <span className="mt-3 block text-xs text-tertiary">이전 글</span>
            <strong className="mt-1 line-clamp-2 block">
              {previous.title}
            </strong>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/posts/${next.number}`}
            className="rounded-[var(--radius-md)] border p-5 text-right text-sm"
          >
            <ArrowRight size={15} className="ml-auto" />
            <span className="mt-3 block text-xs text-tertiary">다음 글</span>
            <strong className="mt-1 line-clamp-2 block">{next.title}</strong>
          </Link>
        )}
      </nav>

      <section
        className="mx-auto mt-20 max-w-[var(--content-width)]"
        aria-labelledby="comments-title"
      >
        <div className="flex items-center justify-between border-b pb-4">
          <h2 id="comments-title" className="font-semibold">
            댓글 {comments.length}
          </h2>
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-secondary"
          >
            GitHub에서 댓글 작성
          </a>
        </div>
        <div className="divide-y">
          {comments.map((comment) => (
            <article key={comment.id} className="py-7">
              <div className="mb-4 flex items-center gap-3 text-xs">
                {comment.author.avatarUrl && (
                  <Image
                    src={comment.author.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="rounded-full"
                  />
                )}
                <a
                  href={comment.author.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold"
                >
                  {comment.author.login}
                </a>
                <time className="text-tertiary" dateTime={comment.createdAt}>
                  {formatDate(comment.createdAt)}
                </time>
                <a
                  href={comment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto flex items-center gap-1 text-tertiary"
                >
                  <Heart size={12} />
                  {comment.reactionsCount}
                </a>
              </div>
              <MarkdownContent source={comment.body} />
            </article>
          ))}
          {!comments.length && (
            <p className="py-10 text-center text-sm text-tertiary">
              아직 댓글이 없습니다.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
