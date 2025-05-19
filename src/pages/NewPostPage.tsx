// src/pages/NewPostPage.tsx
import { useNavigate } from "react-router-dom";
import PostForm from "../components/Post/PostForm";
import type { PostPayload } from "../components/Post/PostForm";
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

  const handleCreate = async (payload: PostPayload) => {
    try {
      const postId = await createPost({ ...payload, draft: false }); // 정식 등록
      navigate(`/post/${postId}`);
    } catch (err) {
      alert("게시글 등록 실패");
      console.error(err);
    }
  };

  const handleDraft = async (payload: PostPayload) => {
    try {
      const postId = await createPost({ ...payload, draft: true }); // 임시 저장
      alert("임시 저장되었습니다.");
      navigate(`/post/${postId}`); // 또는 stay on page
    } catch (err) {
      alert("임시 저장 실패");
      console.error(err);
    }
  };

  return (
    <PostForm
      mode="new"
      onSubmit={handleCreate}
      onDraftSubmit={handleDraft}
      uploadThumbnail={uploadThumbnail}
    />
  );
}
