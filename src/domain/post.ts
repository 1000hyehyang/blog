export interface PostImage {
  src: string;
}

interface PostCategory {
  name: string;
  slug: string;
}

export interface Post {
  id: string;
  number: number;
  title: string;
  body: string;
  excerpt: string;
  coverImage: PostImage;
  galleryImage?: PostImage;
  featured: boolean;
  featuredOrder?: number;
  published: boolean;
  tags: string[];
  category: PostCategory;
  createdAt: string;
  lastEditedAt: string | null;
  commentsCount: number;
  reactionsCount: number;
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
