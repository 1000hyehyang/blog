// src/components/Post/PostCardList.tsx
import { Stack } from "@mui/material";
import PostCard from "./PostCard";

const dummyPosts = [
  {
    id: 1,
    title: "React에서 Zustand로 상태 관리하기",
    content:
      "리덕스를 대체할 수 있는 훨씬 더 가벼운 상태 관리 라이브러리인 Zustand를 알아봅니다.",
    category: "개발",
    date: "2024.05.10",
    thumbnailUrl: "/dummyThumbnail.png",
  },
  {
    id: 2,
    title: "디자이너도 알아야 할 UX 심리학",
    content:
      "UX 디자인에서 사람들이 어떤 방식으로 UI를 인식하는지 알아보는 글입니다.",
    category: "디자인",
    date: "2024.05.07",
    thumbnailUrl: "/dummyThumbnail.png",
  },
  {
    id: 3,
    title: "머신러닝 파이프라인 자동화하기",
    content:
      "ML Ops를 통해 학습, 테스트, 배포 자동화를 구성하는 기본적인 전략을 소개합니다.",
    category: "데이터/ML",
    date: "2024.05.05",
    thumbnailUrl: "/dummyThumbnail.png",
  },
];

export default function PostCardList() {
  return (
    <Stack spacing={3}>
      {dummyPosts.map((post) => (
        <PostCard key={post.id} {...post} />
      ))}
    </Stack>
  );
}
