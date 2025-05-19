import axiosInstance from "../axiosInstance";
import type { PostDetail, PostSummary } from "../../types/post";
import type { PostComment } from "../../types/comment";

interface CreatePostPayload {
  title: string;
  category: string;
  content: string;
  html: string;
  thumbnailUrl?: string;
  tags: string[];
  draft?: boolean; 
}

type UpdatePostPayload = CreatePostPayload;

interface CreateCommentPayload {
  nickname: string;
  content: string;
  emoji: string;
  bgColor: string;
}

// 게시글 생성
export const createPost = async (
  payload: CreatePostPayload
): Promise<number> => {
  const res = await axiosInstance.post("/posts", payload);
  return res.data.data; // 생성된 postId
};

// 게시글 수정
export const updatePost = async (
  id: number,
  payload: UpdatePostPayload
): Promise<PostDetail> => {
  const res = await axiosInstance.put(`/posts/${id}`, payload);
  return res.data.data;
};

// 게시글 상세 조회
export const getPostDetail = async (id: number): Promise<PostDetail> => {
  const res = await axiosInstance.get(`/posts/${id}`);
  return res.data.data;
};

// 게시글 목록 조회
export const getRecentPosts = async (limit = 10): Promise<PostSummary[]> => {
  const res = await axiosInstance.get("/posts", { params: { limit } });
  return res.data.data;
};

// 게시글 임시저장 목록 조회
export const getDraftPosts = async (): Promise<PostSummary[]> => {
  const res = await axiosInstance.get("/posts/drafts");
  return res.data.data;
};

// 게시글 삭제
export const deletePost = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/posts/${id}`);
};

// 댓글 작성
export const createComment = async (
  postId: number,
  payload: CreateCommentPayload
): Promise<PostComment> => {
  const res = await axiosInstance.post(`/posts/${postId}/comments`, payload);
  return res.data.data;
};

// 댓글 조회
export const getComments = async (postId: number): Promise<PostComment[]> => {
  const res = await axiosInstance.get(`/posts/${postId}/comments`);
  return res.data.data;
};
