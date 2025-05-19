// src/pages/EditPostPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPostDetail, updatePost } from "../lib/api/postApi";
import { uploadThumbnail } from "../lib/api/fileApi";
import type { PostDetail } from "../types/post";
import type { PostPayload } from "../components/Post/PostForm";
import PostForm from "../components/Post/PostForm";

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const data = await getPostDetail(Number(id));
        setPost(data);
      } catch {
        alert("게시글을 불러올 수 없습니다.");
        navigate("/", { replace: true });
      }
    };

    fetchPost();
  }, [id, navigate]);

  const handleUpdate = async (payload: PostPayload) => {
    if (!id) return;
    try {
      await updatePost(Number(id), { ...payload, draft: false });
      navigate(`/post/${id}`);
    } catch (err) {
      alert("수정에 실패했습니다.");
      console.error(err);
    }
  };
  
  const handleDraftUpdate = async (payload: PostPayload) => {
    if (!id) return;
    try {
      await updatePost(Number(id), { ...payload, draft: true });
      alert("임시 저장되었습니다.");
    } catch (err) {
      alert("임시 저장 실패");
      console.error(err);
    }
  };

  if (!post) return null;

  return (
    <PostForm
      mode="edit"
      initialData={{
        title: post.title,
        category: post.category,
        thumbnailUrl: post.thumbnailUrl,
        tags: post.tags,
        html: post.html,
      }}
      onSubmit={handleUpdate}
      onDraftSubmit={handleDraftUpdate}
      uploadThumbnail={uploadThumbnail}
    />
  );
}
