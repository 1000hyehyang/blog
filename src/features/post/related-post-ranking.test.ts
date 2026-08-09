import { describe, expect, it } from "vitest";

import type { Post } from "@/domain/post";

import { rankRelatedPosts } from "./related-post-ranking";

const NOW = new Date("2026-08-01T00:00:00Z");

function category(slug: string): Post["category"] {
  return { id: `C_${slug}`, name: slug, slug };
}

function createPost(overrides: Partial<Post> & Pick<Post, "number">): Post {
  const { number, ...rest } = overrides;

  return {
    id: `D_${number}`,
    number,
    slug: `post-${number}`,
    title: `고유 제목 ${number}`,
    body: "본문",
    excerpt: "요약",
    coverImage: {
      src: "/og-default.png",
    },
    featured: false,
    published: true,
    tags: [],
    category: category("development"),
    author: {
      login: "author",
      avatarUrl: "",
      url: "https://github.com/author",
    },
    createdAt: "2026-01-01T00:00:00Z",
    lastEditedAt: null,
    commentsCount: 0,
    reactionsCount: 0,
    url: `https://github.com/example/discussions/${number}`,
    ...rest,
  };
}

describe("rankRelatedPosts", () => {
  it("카테고리, 공통 태그, 최신성 점수를 합산해 정렬한다", () => {
    const current = createPost({
      number: 1,
      title: "캐시 무효화 이해하기",
      tags: ["React", "TypeScript"],
    });
    const sameCategory = createPost({
      number: 2,
      title: "데이터베이스 트랜잭션",
    });
    const twoSharedTags = createPost({
      number: 3,
      title: "접근성 높은 폼 만들기",
      category: category("frontend"),
      tags: ["react", "typescript"],
    });

    expect(
      rankRelatedPosts([sameCategory, twoSharedTags], current, { now: NOW }),
    ).toEqual([twoSharedTags, sameCategory]);
  });

  it("태그의 대소문자, 공백, Unicode를 정규화하고 중복은 한 번만 센다", () => {
    const current = createPost({
      number: 1,
      title: "서버 렌더링 안내서",
      tags: [" TypeScript "],
    });
    const sameCategory = createPost({
      number: 2,
      title: "브라우저 렌더링 과정",
    });
    const duplicatedTag = createPost({
      number: 3,
      title: "정적 분석 도구",
      category: category("tools"),
      tags: ["typescript", " TYPESCRIPT ", "ＴＹＰＥＳＣＲＩＰＴ"],
    });

    expect(
      rankRelatedPosts([duplicatedTag, sameCategory], current, { now: NOW }),
    ).toEqual([sameCategory, duplicatedTag]);
  });

  it("제목 토큰의 Jaccard 유사도를 반영하고 관련 없는 글은 fallback으로 둔다", () => {
    const current = createPost({
      number: 1,
      title: "Next.js App Router 캐시",
      category: category("framework"),
    });
    const closeTitle = createPost({
      number: 2,
      title: "Next.js App Router 캐시 전략",
      category: category("performance"),
      createdAt: "2024-01-01T00:00:00Z",
    });
    const partialTitle = createPost({
      number: 3,
      title: "Next.js 라우팅 이해하기",
      category: category("routing"),
      createdAt: "2025-01-01T00:00:00Z",
    });
    const unrelated = createPost({
      number: 4,
      title: "CSS 그리드 레이아웃",
      category: category("css"),
      createdAt: "2026-07-31T00:00:00Z",
    });

    expect(
      rankRelatedPosts([unrelated, partialTitle, closeTitle], current, {
        now: NOW,
      }),
    ).toEqual([closeTitle, partialTitle, unrelated]);
  });

  it("관련도 점수가 같으면 더 최근 글을 우선한다", () => {
    const current = createPost({ number: 1, title: "현재 아티클" });
    const older = createPost({
      number: 2,
      title: "운영체제 스케줄러",
      createdAt: "2025-01-01T00:00:00Z",
    });
    const newer = createPost({
      number: 3,
      title: "데이터베이스 인덱스",
      createdAt: "2026-07-01T00:00:00Z",
    });

    expect(rankRelatedPosts([older, newer], current, { now: NOW })).toEqual([
      newer,
      older,
    ]);
  });

  it("현재 글과 비공개 글을 제외하고 부족한 자리는 최신 fallback으로 채운다", () => {
    const current = createPost({
      number: 1,
      title: "캐싱 완전 정복",
      category: category("backend"),
    });
    const related = createPost({
      number: 2,
      title: "데이터 구조",
      category: category("backend"),
      createdAt: "2024-01-01T00:00:00Z",
    });
    const draft = createPost({
      number: 3,
      title: "비공개 캐싱 글",
      category: category("backend"),
      published: false,
    });
    const olderFallback = createPost({
      number: 4,
      title: "홈 베이킹 입문",
      category: category("life"),
      createdAt: "2025-01-01T00:00:00Z",
    });
    const newerFallback = createPost({
      number: 5,
      title: "제주 여행 기록",
      category: category("travel"),
      createdAt: "2026-07-01T00:00:00Z",
    });

    expect(
      rankRelatedPosts(
        [current, draft, olderFallback, related, newerFallback],
        current,
        { now: NOW },
      ),
    ).toEqual([related, newerFallback, olderFallback]);
  });

  it("동점이면 작성일과 포스트 번호로 결과를 결정한다", () => {
    const current = createPost({ number: 1, title: "현재 아티클" });
    const third = createPost({ number: 3, title: "네트워크 계층" });
    const second = createPost({ number: 2, title: "프로세스 동기화" });

    expect(rankRelatedPosts([third, second], current, { now: NOW })).toEqual([
      second,
      third,
    ]);
  });

  it("잘못된 작성일을 안전하게 처리한다", () => {
    const current = createPost({ number: 1, title: "현재 아티클" });
    const invalidDate = createPost({
      number: 2,
      title: "분산 시스템",
      createdAt: "invalid-date",
    });
    const validDate = createPost({
      number: 3,
      title: "컴파일러 구조",
      createdAt: "2025-01-01T00:00:00Z",
    });

    expect(
      rankRelatedPosts([invalidDate, validDate], current, { now: NOW }),
    ).toEqual([validDate, invalidDate]);
  });

  it("limit을 검증하고 입력 배열을 변경하지 않는다", () => {
    const current = createPost({ number: 1, title: "현재 아티클" });
    const second = createPost({ number: 2, title: "관계형 데이터베이스" });
    const third = createPost({ number: 3, title: "네트워크 프로토콜" });
    const posts = [third, current, second];
    const originalOrder = [...posts];

    expect(
      rankRelatedPosts(posts, current, { limit: 1.9, now: NOW }),
    ).toHaveLength(1);
    expect(rankRelatedPosts(posts, current, { limit: 0, now: NOW })).toEqual(
      [],
    );
    expect(rankRelatedPosts(posts, current, { limit: -1, now: NOW })).toEqual(
      [],
    );
    expect(posts).toEqual(originalOrder);
  });
});
