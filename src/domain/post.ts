export interface Post {
  id: string;
  number: number;
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  coverImage: string;
  featured: boolean;
  featuredOrder?: number;
  published: boolean;
  tags: string[];
  category: { id: string; name: string; slug: string };
  author: { login: string; avatarUrl: string; url: string };
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  reactionsCount: number;
  url: string;
}

export interface Comment {
  id: string;
  body: string;
  author: { login: string; avatarUrl: string; url: string };
  createdAt: string;
  reactionsCount: number;
  url: string;
}

export interface PostPage {
  posts: Post[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
