# Discussion 카테고리 폼

GitHub Discussions는 Issue처럼 `.md` 템플릿 목록을 보여주지 **않습니다**.  
대신 **카테고리 slug와 같은 이름의 `.yml` 폼**이 해당 카테고리 글 작성 시 자동으로 나타납니다.

## 왜 템플릿이 안 보였나?

1. **`.md` 파일은 Discussions에서 인식되지 않음** → `.yml`만 사용
2. **"Choose a template" UI가 없음** → 카테고리를 고르면 폼이 자동 표시
3. **파일명 = 카테고리 slug** 여야 함 (예: `Development` → `development.yml`)
4. **default branch(main)에 push**되어 있어야 함
5. **`.env`의 `GITHUB_REPO`와 템플릿 repo가 같아야** 함

## GitHub 카테고리 만들기

Discussions → Categories에서 아래 **이름 그대로** 생성하세요.

| 카테고리 이름 | 폼 파일 | 블로그 URL |
|--------------|---------|-------------|
| Development | `development.yml` | `/category/development` |
| Study | `study.yml` | `/category/study` |
| CS | `cs.yml` | `/category/cs` |
| Art | `art.yml` | `/category/art` |
| Retrospective | `retrospective.yml` | `/category/retrospective` |
| Essay | `essay.yml` | `/category/essay` |

## 글 발행 방법

1. **Discussions → New discussion**
2. **Category** 선택 (예: Development)
3. 자동으로 나타나는 **폼**에서 frontmatter·본문 수정
4. **Title** 작성
5. **Start discussion** / **Publish**

카테고리를 고르기 **전**에는 폼이 보이지 않습니다.  
카테고리를 고른 **후**에 `게시글 본문` textarea에 frontmatter가 채워져 있어야 정상입니다.

## frontmatter 필드

| 필드 | 설명 |
|------|------|
| `published` | `false`면 블로그 목록에서 숨김 |
| `featured` | `true`면 홈 Pinned Posts 후보 |
| `featuredOrder` | 고정글 순서 (작을수록 앞) |
| `slug` / `excerpt` / `coverImage` | 선택 (비우면 자동 fallback) |
| `tags` | 검색용 키워드 |

## 폼이 여전히 안 보이면

- [ ] `development.yml` 등이 **main 브랜치**에 있는지
- [ ] GitHub Category 이름이 **Development**처럼 정확한지 (slug `development`)
- [ ] Discussions 기능이 켜져 있는지
- [ ] Polls 카테고리가 아닌지 (Polls는 폼 미지원)
- [ ] `.env`의 repo와 템플릿 repo가 같은지
