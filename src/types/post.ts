// src\types\post.ts

// 목록용
export interface PostSummary {
  id: number;
  title: string;
  content: string; // 짧은 텍스트 또는 요약
  date: string;
  thumbnailUrl?: string;
}

// 상세용
export interface PostDetail extends PostSummary {
  html: string; // 본문 HTML (Tiptap 저장 결과)
  author: string;
  comments: Comment[]; // 선택
}
