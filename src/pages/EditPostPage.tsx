// src/pages/EditPostPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPostDetail, updatePost } from "../lib/api/postApi";
import { uploadThumbnail } from "../lib/api/fileApi";
import type { PostDetail } from "../types/post";
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

  const handleUpdate = async (payload: {
    title: string;
    category: string;
    content: string;
    html: string;
    thumbnailUrl?: string;
    tags: string[];
  }) => {
    if (!id) return;
    try {
      await updatePost(Number(id), payload);
      navigate(`/post/${id}`);
    } catch (err) {
      alert("수정에 실패했습니다.");
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
      uploadThumbnail={uploadThumbnail}
    />
  );
}
