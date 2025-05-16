// src/types/comment.ts
export interface PostComment {
  id: number;
  content: string;
  createdAt: string;
  nickname: string;
  emoji: string;
  bgColor?: string;
}
