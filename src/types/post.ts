// src\types\post.ts
import type { PostComment } from "./comment";

// 목록용
export interface PostSummary {
  id: number;
  title: string;
  category: string;
  content: string; // 짧은 텍스트 또는 요약
  date: string;
  thumbnailUrl?: string;
}

// 상세용
export interface PostDetail extends PostSummary {
  html: string;
  author: string;
  tags: string[];
  comments: PostComment[];
}
