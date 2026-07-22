# GitHub Discussions Dev Blog

GitHub Discussions를 콘텐츠 원본으로 사용하는 Next.js 개발 블로그입니다. App Router, Server Components, ISR, 반응형 UI, 다크 모드, 검색, Markdown, 댓글, SEO를 지원합니다.

## 기술 스택과 구조

Next.js 16, React 19, TypeScript strict, Tailwind CSS 4, GitHub GraphQL API, Zod, React Markdown, Shiki, Vitest, Testing Library, Playwright를 사용합니다.

- `src/app`: 라우트, metadata, API, 오류/로딩 상태
- `src/domain`: GitHub 응답과 분리된 핵심 모델
- `src/infrastructure/github`: 서버 전용 GraphQL client, query, mapper
- `src/features`: 게시글·검색 기능 UI
- `src/components`: 공통 레이아웃과 Markdown
- `src/config/site.ts`: 사이트명, 메뉴, 프로필, 외부 링크
- `src/app/globals.css`: semantic 디자인 토큰

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000`에서 확인합니다. GitHub 설정 전에도 설정 안내 UI가 안전하게 표시됩니다.

## 환경 변수

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=
```

토큰에는 Discussions를 읽을 최소 권한만 부여하세요. `GITHUB_TOKEN`은 서버 전용 모듈에서만 사용하며 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

## GitHub Discussions와 카테고리 설정

1. 저장소 Settings → General → Features에서 Discussions를 활성화합니다.
2. 블로그 메뉴에 대응할 Discussion Category를 만듭니다.
3. `.env.local`에 저장소 owner/repo와 토큰을 입력합니다.
4. `src/config/site.ts`의 `navigation.category`를 category 이름의 소문자 slug와 맞춥니다.

Discussion 하나가 게시글 하나입니다. Discussion number가 `/posts/[number]`의 영구 식별자로 쓰입니다.

## 게시글 작성과 발행

1. 지정 저장소의 Discussions로 이동합니다.
2. 블로그에 표시할 카테고리를 고릅니다.
3. 제목을 작성합니다.
4. 본문 맨 위에 아래 frontmatter를 작성합니다.
5. Markdown 본문을 작성하고 Discussion을 게시합니다.
6. 최대 5분의 ISR 갱신을 기다리거나 revalidation을 실행합니다.

```md
---
slug: web-vitals-guide
excerpt: Web Vitals 핵심 개념을 정리합니다.
coverImage: https://example.com/cover.webp
featured: true
featuredOrder: 1
published: true
tags:
  - Web
  - Performance
---

## 본문 제목

게시글 본문입니다.
```

`excerpt`와 `coverImage`는 생략 시 자동 fallback됩니다. `published: false`인 글은 목록에서 제외됩니다. 잘못된 metadata는 사이트를 중단시키지 않고 기본값으로 대체됩니다.

## 캐시 갱신

```bash
curl -X POST "$SITE_URL/api/revalidate" \
  -H "Authorization: Bearer $REVALIDATE_SECRET"
```

GitHub Actions에서는 `SITE_URL`, `REVALIDATE_SECRET`을 repository secrets로 저장한 뒤 같은 요청을 실행하면 됩니다.

## Vercel 배포

Vercel에 저장소를 연결하고 Production 환경 변수를 등록한 뒤 배포합니다. `NEXT_PUBLIC_SITE_URL`은 실제 HTTPS origin으로 설정합니다.

## 품질 명령

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run start
```

Playwright 최초 실행 전 `npx playwright install chromium`이 필요합니다.

## 디자인과 콘텐츠 변경

색상, radius, 너비, 그림자, 섹션 간격은 `src/app/globals.css`의 CSS Variables에서 수정합니다. 사이트 콘텐츠와 링크은 `src/config/site.ts`에서 관리합니다.
