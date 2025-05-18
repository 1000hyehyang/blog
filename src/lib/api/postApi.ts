// src/api/postApi.ts
import axiosInstance from "../axiosInstance";
import type { PostSummary, PostDetail } from "../../types/post";
import type { PostComment } from "../../types/comment";

export const getRecentPosts = async (): Promise<PostSummary[]> => {
  const res = await axiosInstance.get("/posts");
  return res.data.data;
};

export const getPostDetail = async (id: number): Promise<PostDetail> => {
  const res = await axiosInstance.get(`/posts/${id}`);
  return res.data.data;
};

export const createComment = async (
  postId: number,
  comment: Omit<PostComment, "id" | "createdAt">
): Promise<PostComment> => {
  const res = await axiosInstance.post(`/comments/posts/${postId}`, comment);
  return res.data.data;
};

export const getComments = async (postId: number): Promise<PostComment[]> => {
  const res = await axiosInstance.get(`/comments/posts/${postId}`);
  return res.data.data;
};

export const createPost = async (payload: {
  title: string;
  category: string;
  content: string;
  html: string;
  thumbnailUrl?: string;
  tags: string[];
}): Promise<number> => {
  const res = await axiosInstance.post("/posts", payload);
  return res.data.data;
};