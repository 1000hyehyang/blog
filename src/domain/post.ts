import { z } from "zod";

export const POST_BODY_MAX_BYTES = 5 * 1024 * 1024;
// JSON 제어 문자 이스케이프는 원문 한 바이트를 최대 여섯 바이트로 만든다.
export const POST_REQUEST_MAX_BYTES = POST_BODY_MAX_BYTES * 6 + 128 * 1024;

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine((s) => !/^\d+$/.test(s), "숫자만으로 된 주소는 사용할 수 없습니다.");
const imageUrl = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .refine((s) => /^https?:\/\//.test(s)),
]);
export const postFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z
    .string()
    .max(POST_BODY_MAX_BYTES)
    .refine(
      (body) =>
        new TextEncoder().encode(body).byteLength <= POST_BODY_MAX_BYTES,
      "본문은 UTF-8 기준 5 MiB까지 저장할 수 있습니다.",
    ),
  category: z.object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
  }),
  series: slugSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30),
  coverImage: z.object({ src: imageUrl }),
  galleryImage: z.object({ src: imageUrl }).optional(),
  featured: z.boolean(),
  featuredOrder: z.number().int().nonnegative().optional(),
  published: z.boolean(),
});
export const storedPostSchema = postFieldsSchema.extend({
  slug: slugSchema,
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  // 현재 글의 발행일이 없으면 생성일을 사용하고, null은 미발행 초안이다.
  publishedAt: z.string().datetime().nullable().optional(),
  lastEditedAt: z.string().datetime().nullable(),
  commentsCount: z.number().int().nonnegative().default(0),
  reactionsCount: z.number().int().nonnegative().default(0),
});
export type PostFields = z.infer<typeof postFieldsSchema>;
export type StoredPost = z.infer<typeof storedPostSchema>;
export type Post = StoredPost & { excerpt: string };
export type PostImage = Post["coverImage"];

export type PostSummary = Omit<Post, "body">;

export type PostPreview = Pick<
  Post,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "coverImage"
  | "category"
  | "createdAt"
  | "publishedAt"
>;
