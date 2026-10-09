import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { GroupImage, ImageGroupLayout } from "@/lib/image-group";
import type { PostFields } from "@/domain/post";
import type { PendingImage } from "./image-layout-dialog";
import type { useWriterFeedback } from "./use-writer-feedback";
import { imageFileError, uploadPostImage } from "./image-upload";

type ImageTarget = "body" | "coverImage" | "galleryImage";
type Options = {
  editor: Editor | null;
  unsupported: boolean;
  category: string;
  allocateId: () => string;
  update: (values: Partial<PostFields>) => void;
  feedback: Pick<
    ReturnType<typeof useWriterFeedback>,
    "start" | "finish" | "setMessage"
  >;
};

export function usePostImages({
  editor,
  unsupported,
  category,
  allocateId,
  update,
  feedback,
}: Options) {
  const { start, finish, setMessage } = feedback;
  const fileInput = useRef<HTMLInputElement>(null);
  const imageLayoutDialog = useRef<HTMLDialogElement>(null);
  const [pendingImages, setPendingImages] = useState<{
    items: PendingImage[];
    layout: ImageGroupLayout;
    range: { from: number; to: number };
    error: string;
  } | null>(null);
  const uploadTarget = useRef<ImageTarget>("body");

  function uploadImageFile(file: File): Promise<GroupImage> {
    return uploadPostImage(file, category, allocateId());
  }
  function queueImages(files: File[], target: ImageTarget) {
    if (target === "body" && (unsupported || !editor?.isEditable)) return;
    if (!files.length) return;
    if (target !== "body" || files.length === 1) {
      void uploadSingleImage(files[0], target);
      return;
    }
    const error = files.map(imageFileError).find(Boolean);
    if (error) {
      setMessage(error);
      return;
    }
    if (files.length > 50) {
      setMessage("사진은 한 번에 50장까지 첨부할 수 있습니다.");
      return;
    }
    const items = files.map((file) => ({ file }));
    const selection = editor?.state.selection;
    setPendingImages({
      items,
      layout: "individual",
      range: { from: selection?.from ?? 0, to: selection?.to ?? 0 },
      error: "",
    });
    imageLayoutDialog.current?.showModal();
  }
  async function uploadPendingImages() {
    if (
      !pendingImages ||
      !editor ||
      unsupported ||
      !editor.isEditable ||
      !start()
    )
      return;
    editor.setEditable(false);
    let items = pendingImages.items;
    try {
      for (let index = 0; index < items.length; index++) {
        if (items[index].uploaded) continue;
        const uploaded = await uploadImageFile(items[index].file);
        items = items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, uploaded } : item,
        );
        setPendingImages((current) =>
          current ? { ...current, items, error: "" } : null,
        );
      }
      const images = items.map((item) => {
        if (!item.uploaded)
          throw new Error("사진을 본문에 삽입하지 못했습니다.");
        return item.uploaded;
      });
      const batchId = crypto.randomUUID();
      const content =
        pendingImages.layout === "individual"
          ? images.map((image) => ({
              type: "image",
              attrs: { ...image, batchId },
            }))
          : {
              type: "image",
              attrs: {
                src: images[0].src,
                alt: images[0].alt,
                layout: pendingImages.layout,
                images,
              },
            };
      if (!editor.commands.insertContentAt(pendingImages.range, content))
        throw new Error("사진을 본문에 삽입하지 못했습니다.");
      imageLayoutDialog.current?.close();
    } catch (error) {
      setPendingImages((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : "이미지 업로드에 실패했습니다. 다시 시도해 주세요.",
            }
          : null,
      );
    } finally {
      finish();
    }
  }
  async function uploadSingleImage(file: File, target: ImageTarget) {
    if (!editor || (target === "body" && unsupported) || !start()) return;
    editor.setEditable(false);
    try {
      const image = await uploadImageFile(file);
      if (target === "body") editor.chain().focus().setImage(image).run();
      else update({ [target]: { src: image.src } });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      finish();
    }
  }
  function chooseImage(target: ImageTarget) {
    uploadTarget.current = target;
    fileInput.current?.click();
  }

  return {
    fileInput,
    imageLayoutDialog,
    pendingImages,
    queueImages,
    chooseImage,
    uploadPendingImages,
    queueSelectedImages: (files: File[]) =>
      queueImages(files, uploadTarget.current),
    setLayout: (layout: ImageGroupLayout) =>
      setPendingImages((current) => (current ? { ...current, layout } : null)),
    close: () => setPendingImages(null),
  };
}
