import { notFound } from "next/navigation";
import { ImageEditorDemo } from "@/features/write/image-editor-demo";

export default function ImageEditorDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ImageEditorDemo />;
}
