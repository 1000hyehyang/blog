export interface PostImage {
  src: string;
}

export interface Post {
  id: string;
  number: number;
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  coverImage: PostImage;
  galleryImage?: PostImage;
  featured: boolean;
  featuredOrder?: number;
  published: boolean;
  tags: string[];
  category: { id: string; name: string; slug: string };
  author: { login: string; avatarUrl: string; url: string };
  createdAt: string;
  lastEditedAt: string | null;
  commentsCount: number;
  reactionsCount: number;
  url: string;
}

export type PostPreview = Pick<
  Post,
  | "id"
  | "number"
  | "title"
  | "excerpt"
  | "coverImage"
  | "category"
  | "createdAt"
>;

export interface PostPage {
  posts: Post[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
