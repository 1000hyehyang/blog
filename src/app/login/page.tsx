import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isWriter, writerConfigured } from "@/lib/writer-auth";
import { writerDestination } from "@/lib/writer-navigation";
import { WriterLogin } from "@/features/write/writer-login";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const destination = writerDestination((await searchParams).next);
  if (await isWriter()) redirect(destination);
  return (
    <WriterLogin configured={writerConfigured()} destination={destination} />
  );
}
