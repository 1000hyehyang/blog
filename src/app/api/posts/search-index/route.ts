import { NextResponse } from "next/server";

import { getPosts } from "@/infrastructure/github/github";

export async function GET() {
  const { posts } = await getPosts({ first: 50 });

  return NextResponse.json(
    posts.map((post) => ({
      number: post.number,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category.name,
      tags: post.tags,
      body: post.body,
    })),
  );
}
