// src/data/dummyPosts.ts

import type { PostSummary, PostDetail } from "../types/post";

export const dummyPostList: PostSummary[] = [
  {
    id: 1,
    title: "React에서 Zustand로 상태 관리하기",
    content: "리덕스를 대체할 수 있는 훨씬 더 가벼운 상태 관리 라이브러리인 Zustand를 알아봅니다.",
    date: "2024.05.10",
    thumbnailUrl: "/dummyThumbnail.png",
  },
];

export const dummyPostDetail: Record<number, PostDetail> = {
  1: {
    id: 1,
    title: "React에서 Zustand로 상태 관리하기",
    content: "리덕스를 대체할 수 있는 훨씬 더 가벼운 상태 관리 라이브러리인 Zustand를 알아봅니다.",
    date: "2024.05.10",
    thumbnailUrl: "/dummyThumbnail.png",
    html: `<h2>Zustand는 정말 가볍다</h2><p>상태 관리가 간단해지는 마법같은 경험</p>`,
    author: "이다윗",
    comments: [], // 옵션
  },
};
