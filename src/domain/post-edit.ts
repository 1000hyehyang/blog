import { isDeepStrictEqual } from "node:util";
import type { PostFields, StoredPost } from "./post";

const contentFields: (keyof PostFields)[] = [
  "title",
  "body",
  "category",
  "series",
  "tags",
  "coverImage",
  "galleryImage",
];

export function postValidationMessage(
  fields: PostFields,
  series: readonly { slug: string }[],
) {
  if (fields.published && !fields.body.trim()) return "본문을 입력해 주세요.";
  if (fields.series && !series.some((item) => item.slug === fields.series))
    return "카테고리에 등록된 시리즈를 선택해 주세요.";
  return null;
}

export function applyPostEdit(
  previous: StoredPost | null,
  fields: PostFields,
  {
    slug,
    id,
    now,
    categoryName,
  }: {
    slug: string;
    id: string;
    now: string;
    categoryName: string;
  },
): StoredPost {
  // 기존 비공개 글은 과거에 공개했을 수 있으므로 원래 날짜를 보존한다.
  const publishedAt = previous
    ? previous.publishedAt === undefined
      ? previous.createdAt
      : previous.publishedAt
    : null;
  const post: StoredPost = {
    ...(previous ?? {
      id,
      createdAt: now,
      commentsCount: 0,
      reactionsCount: 0,
    }),
    ...fields,
    series: fields.series,
    category: { slug: fields.category.slug, name: categoryName },
    slug,
    publishedAt: publishedAt ?? (fields.published ? now : null),
    lastEditedAt: previous?.lastEditedAt ?? null,
  };
  if (
    previous &&
    contentFields.some((key) => !isDeepStrictEqual(previous[key], post[key]))
  )
    post.lastEditedAt = now;
  if (!publishedAt && fields.published) post.lastEditedAt = null;
  return post;
}
