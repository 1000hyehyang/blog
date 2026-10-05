import { z } from "zod";

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
  body: z.string().max(200_000),
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
  // undefined는 기존 글, null은 아직 공개한 적 없는 초안을 뜻한다.
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
