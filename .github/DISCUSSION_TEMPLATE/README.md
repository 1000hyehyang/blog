# Discussion 게시글 템플릿

블로그 게시글은 GitHub Discussions에 올립니다. 이 폴더의 Markdown 템플릿을 사용하면 frontmatter를 매번 직접 작성하지 않아도 됩니다.

## 1. GitHub 카테고리 만들기

저장소 **Discussions → Categories**에서 아래 이름으로 카테고리를 만듭니다.  
이름은 블로그 헤더 메뉴 slug와 맞아야 합니다.

| 카테고리 이름 | 블로그 URL |
|--------------|-----------|
| Development | `/category/development` |
| Study | `/category/study` |
| CS | `/category/cs` |
| Art | `/category/art` |
| Retrospective | `/category/retrospective` |
| Essay | `/category/essay` |

## 2. 글 발행 방법

1. **Discussions → New discussion**
2. **Category** 선택 (예: Development)
3. **Choose a template**에서 같은 이름 템플릿 선택 (예: `Development · 블로그 게시글`)
4. **Title** 작성
5. 본문 frontmatter·Markdown 수정
6. **Publish discussion**

## 3. frontmatter 안내

| 필드 | 필수 | 설명 |
|------|------|------|
| `published` | 권장 | `false`면 블로그 목록에서 숨김 |
| `featured` | 선택 | `true`면 홈 Pinned Posts 후보 |
| `featuredOrder` | 선택 | 고정글 순서 (작을수록 앞) |
| `slug` | 선택 | SEO용 slug |
| `excerpt` | 선택 | 비우면 본문에서 자동 생성 |
| `coverImage` | 선택 | 비우면 기본 이미지 사용 |
| `tags` | 선택 | 검색·카드 표시용 |

## 4. 카테고리별 기본 본문 (선택)

GitHub 카테고리 설정에서 **Template**에 해당 `.md` 파일 본문(frontmatter 이하)을 붙여 넣으면, 템플릿 선택 없이도 새 글 작성 시 자동으로 채워집니다.
