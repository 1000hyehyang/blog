// src\types\post.ts
import type { PostComment } from "./comment";

// 목록용
export interface PostSummary {
  id: number;
  title: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string; 
  thumbnailUrl?: string;
}


// 상세용
export interface PostDetail extends PostSummary {
  html: string;
  author: string;
  tags: string[];
  comments: PostComment[];
}
