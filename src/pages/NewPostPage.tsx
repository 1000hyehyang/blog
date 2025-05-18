// src/pages/NewPostPage.tsx
import { useNavigate } from "react-router-dom";
import PostForm from "../components/Post/PostForm";
import { createPost } from "../lib/api/postApi";
import { uploadThumbnail } from "../lib/api/fileApi";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect } from "react";

export default function NewPostPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      alert("접근 권한이 없습니다.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleCreate = async (payload: {
    title: string;
    category: string;
    content: string;
    html: string;
    thumbnailUrl?: string;
    tags: string[];
  }) => {
    try {
      const postId = await createPost(payload);
      navigate(`/post/${postId}`);
    } catch (err) {
      alert("게시글 등록 실패");
      console.error(err);
    }
  };

  return (
    <PostForm
      mode="new"
      onSubmit={handleCreate}
      uploadThumbnail={uploadThumbnail}
    />
  );
}
