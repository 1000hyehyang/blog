"use client";

import { useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCategoryNavigation, siteConfig } from "@/config/site";
import { imageFileError, uploadPostImage } from "./image-upload";
import { IMAGE_UPLOAD_TYPES } from "@/config/images";
import type { LocalDraft } from "./local-drafts";
import type { PostFields, StoredPost } from "@/domain/post";
import { usePostPersistence } from "./use-post-persistence";
import { motion } from "framer-motion";
import { PinnedCards, WriterCheckbox, WriterSelect } from "./writer-controls";
import type { PinnedPost } from "@/domain/pinned-posts";
import { usePinnedOrder } from "./use-pinned-order";
import { TagInput } from "./tag-input";
import { EditorToolbar } from "./editor-toolbar";
import { EditorBodySkeleton } from "./writer-skeleton";
import { editorExtensions, hasUnsupportedHtml } from "./editor-extensions";
import { TableOverlay } from "./table-overlay";
import { ImageEditor, nextCoverImageSrc } from "./image-editor";
import { ImageLayoutDialog, type PendingImage } from "./image-layout-dialog";
import type { GroupImage, ImageGroupLayout } from "@/lib/image-group";
import { parseExternalHttpUrl } from "@/lib/link-preview";
import styles from "./writer.module.css";
import { WriterHeader } from "./writer-header";
import { StatefulButton } from "./stateful-button";

const emptyFields = {
  title: "",
  body: "",
  tags: [] as string[],
  coverImage: { src: "" },
  galleryImage: { src: "" },
  category: { name: "Development", slug: "development" },
  series: undefined as string | undefined,
  featured: false,
  featuredOrder: undefined as number | undefined,
  published: false,
};
type Props = {
  initial: StoredPost | null;
  initialSha: string | null;
  writable: boolean;
  pinned?: PinnedPost[];
  postSlugs?: string[];
  draft?: LocalDraft;
};
export function PostEditor({
  initial,
  initialSha,
  writable,
  pinned = [],
  postSlugs = [],
  draft,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<PostFields>({
    ...emptyFields,
    ...initial,
  });
  const bodyChanged = useRef(false);
  const currentPin = initial?.slug ?? "__current__";
  const pins = usePinnedOrder(
    pinned,
    currentPin,
    Boolean(initial?.featured),
    draft,
  );
  const { order: pinnedOrder, setOrder: setPinnedOrder } = pins;
  const [tags, setTags] = useState(
    initial?.tags.length ? `${initial.tags.join(",")},` : "",
  );
  const [dirty, setDirty] = useState(false);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const [publishMode, setPublishMode] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageLayoutDialog = useRef<HTMLDialogElement>(null);
  const [pendingImages, setPendingImages] = useState<{
    items: PendingImage[];
    layout: ImageGroupLayout;
    range: { from: number; to: number };
    error: string;
  } | null>(null);
  const uploadTarget = useRef<"body" | "coverImage" | "galleryImage">("body");
  const {
    sha,
    busy,
    message,
    setMessage,
    setFeedback,
    start,
    finish,
    buttonState,
    allocateId,
    save,
    storeDraft,
    remove,
  } = usePostPersistence({
    initial,
    initialSha,
    draft,
    postSlugs,
    currentPin,
    pins,
    readFields: currentFields,
    onSaved: (post) => {
      if (post) setFields(post);
      setDirty(false);
      publishDialog.current?.close();
    },
  });
  const unsupported = useMemo(
    () => hasUnsupportedHtml(initial?.body ?? ""),
    [initial?.body],
  );
  const extensions = useMemo(() => editorExtensions(), []);
  const editor = useEditor({
    extensions,
    content: initial?.body ?? "",
    contentType: "markdown",
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: !unsupported,
    onUpdate: ({ transaction }) => {
      if (!transaction.docChanged) return;
      bodyChanged.current = true;
      setFields((current) => {
        const src = nextCoverImageSrc(transaction, current.coverImage.src);
        return src === current.coverImage.src
          ? current
          : { ...current, coverImage: { src } };
      });
      setDirty(true);
    },
    editorProps: {
      attributes: {
        class: "prose",
        role: "textbox",
        "aria-label": "본문 편집기",
        "aria-multiline": "true",
        spellcheck: "false",
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length) {
          event.preventDefault();
          queueImages(files, "body");
          return true;
        }
        const pasted = event.clipboardData?.getData("text/plain").trim() ?? "";
        const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(pasted);
        if (!link || !view.state.schema.marks.link) return false;
        const label = parseExternalHttpUrl(link[1]);
        const target = parseExternalHttpUrl(link[2]);
        if (!label || !target || label.href !== target.href) return false;
        event.preventDefault();
        view.dispatch(
          view.state.tr.replaceSelectionWith(
            view.state.schema.text(target.href, [
              view.state.schema.marks.link.create({ href: target.href }),
            ]),
            false,
          ),
        );
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (moved || !files.length) return false;
        event.preventDefault();
        const position = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (position) editor?.commands.setTextSelection(position.pos);
        queueImages(files, "body");
        return true;
      },
    },
  });
  useEffect(() => {
    editor?.setEditable(!busy && !unsupported);
  }, [editor, busy, unsupported]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const warnNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("target") === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (
        !window.confirm(
          "저장하지 않은 내용이 있거나 처리 중입니다. 이동할까요?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", warnNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", warnNavigation, true);
    };
  }, [dirty, busy]);

  function update(values: Partial<typeof fields>) {
    setFields((current) => ({ ...current, ...values }));
    setDirty(true);
  }
  function leave() {
    return (
      !dirty || window.confirm("저장하지 않은 내용이 있습니다. 이동할까요?")
    );
  }
  function currentFields() {
    if (!editor) return null;
    return {
      ...fields,
      body: bodyChanged.current && editor ? editor.getMarkdown() : fields.body,
      tags: [
        ...new Set(
          tags
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean),
        ),
      ],
    };
  }
  function uploadImageFile(file: File): Promise<GroupImage> {
    return uploadPostImage(file, fields.category.slug, allocateId());
  }
  function queueImages(
    files: File[],
    target: "body" | "coverImage" | "galleryImage",
  ) {
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
    if (!pendingImages || !editor || !start()) return;
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
      const images = items.map((item) => item.uploaded!);
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
  async function uploadSingleImage(
    file: File,
    target: "body" | "coverImage" | "galleryImage",
  ) {
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
  function chooseImage(target: "body" | "coverImage" | "galleryImage") {
    uploadTarget.current = target;
    fileInput.current?.click();
  }

  async function logout() {
    if (!leave() || !start()) return;
    try {
      const response = await fetch("/api/write/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setDirty(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      finish();
    }
  }
  function openPublish(published: boolean) {
    setPublishMode(published);
    setFeedback(null);
    publishDialog.current?.showModal();
  }
  const categorySeries =
    getCategoryNavigation(fields.category.slug)?.series ?? [];

  return (
    <div className={styles.writer}>
      <h1 className="sr-only">{initial ? "글 수정" : "글쓰기"}</h1>
      <WriterHeader onLogout={logout}>
        <EditorToolbar
          editor={editor}
          busy={busy}
          unsupported={unsupported}
          onChooseImage={() => chooseImage("body")}
        />
      </WriterHeader>
      <div className={styles.canvas}>
        <fieldset disabled={busy} className={styles.composition}>
          <div className={styles.categorySelectors}>
            <WriterSelect
              label="카테고리"
              value={fields.category.slug}
              disabled={busy}
              options={[
                ...(!siteConfig.navigation.some(
                  (item) => item.category === fields.category.slug,
                )
                  ? [
                      {
                        value: fields.category.slug,
                        label: fields.category.name,
                      },
                    ]
                  : []),
                ...siteConfig.navigation.map((item) => ({
                  value: item.category,
                  label: item.label,
                })),
              ]}
              onChange={(value) =>
                update({
                  series: undefined,
                  category: {
                    slug: value,
                    name:
                      siteConfig.navigation.find(
                        (item) => item.category === value,
                      )?.label ?? value,
                  },
                })
              }
            />
            {categorySeries.length > 0 && (
              <WriterSelect
                label="시리즈"
                value={fields.series ?? ""}
                disabled={busy}
                options={[
                  { value: "", label: "None" },
                  ...(!categorySeries.some(
                    (item) => item.slug === fields.series,
                  ) && fields.series
                    ? [{ value: fields.series, label: fields.series }]
                    : []),
                  ...categorySeries.map((item) => ({
                    value: item.slug,
                    label: item.label,
                  })),
                ]}
                onChange={(value) =>
                  update({
                    series: value || undefined,
                  })
                }
              />
            )}
          </div>
          <label className={styles.titleField}>
            <span className="sr-only">제목</span>
            <textarea
              aria-label="제목"
              rows={1}
              value={fields.title}
              maxLength={200}
              placeholder="제목을 입력하세요"
              onChange={(e) =>
                update({ title: e.target.value.replace(/[\r\n]/g, "") })
              }
            />
          </label>
          {unsupported && (
            <p className={styles.notice}>
              이 글의 본문은 편집기에서 안전하게 수정할 수 없습니다. 제목과
              태그는 수정할 수 있습니다.
            </p>
          )}
          <div className={styles.editor}>
            {editor ? (
              <TableOverlay editor={editor}>
                <ImageEditor
                  editor={editor}
                  coverImageSrc={fields.coverImage.src}
                  onCoverImageChange={(src) => update({ coverImage: { src } })}
                />
              </TableOverlay>
            ) : (
              <EditorBodySkeleton />
            )}
          </div>
          <TagInput
            value={tags}
            onChange={(value) => {
              setTags(value);
              setDirty(true);
            }}
          />
        </fieldset>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_UPLOAD_TYPES.join(",")}
          multiple
          hidden
          aria-label="이미지 파일 선택"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            queueImages(files, uploadTarget.current);
          }}
        />
      </div>

      <ImageLayoutDialog
        dialogRef={imageLayoutDialog}
        images={pendingImages?.items ?? []}
        layout={pendingImages?.layout ?? "individual"}
        error={pendingImages?.error ?? ""}
        busy={busy}
        onLayoutChange={(layout) =>
          setPendingImages((current) =>
            current ? { ...current, layout } : null,
          )
        }
        onConfirm={() => void uploadPendingImages()}
        onClose={() => setPendingImages(null)}
      />

      <footer className={styles.bottomBar}>
        {message && (
          <p role="status" aria-live="polite" className={styles.saveStatus}>
            {message}
          </p>
        )}
        <div className={styles.bottomActions}>
          <button
            type="button"
            onClick={() => openPublish(false)}
            disabled={busy || !editor}
          >
            임시 저장
          </button>
          <button
            className={styles.primary}
            type="button"
            onClick={() => openPublish(true)}
            disabled={busy || !editor}
          >
            완료
          </button>
        </div>
      </footer>

      <motion.dialog
        layoutScroll
        ref={publishDialog}
        className={styles.publishDialog}
        aria-labelledby="publish-heading"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy)
            publishDialog.current?.close();
        }}
      >
        <div className={styles.dialogHeading}>
          <div>
            <p className="section-label">PUBLISH</p>
            <h2 id="publish-heading">
              {publishMode ? "발행 설정" : "임시 저장"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="발행 설정 닫기"
            disabled={busy}
            onClick={() => publishDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <motion.div
          layoutScroll
          className={styles.dialogBody}
          role="region"
          aria-label="발행 옵션"
        >
          <fieldset className={styles.stack} disabled={busy}>
            <div className={styles.fields}>
              {(["coverImage", "galleryImage"] as const)
                .filter(
                  (key) =>
                    key === "coverImage" || fields.category.slug === "art",
                )
                .map((key) => (
                  <div key={key} className={styles.stack}>
                    <label>
                      {key === "coverImage" ? "대표 이미지" : "갤러리 이미지"}
                      <input
                        type="url"
                        value={fields[key]?.src ?? ""}
                        onChange={(e) =>
                          update({ [key]: { src: e.target.value } })
                        }
                        placeholder="https://…"
                      />
                    </label>
                    <button type="button" onClick={() => chooseImage(key)}>
                      <ImagePlus size={16} />
                      파일 선택
                    </button>
                  </div>
                ))}
            </div>
            <section
              className={styles.pinnedSection}
              aria-labelledby="pinned-heading"
            >
              <div className={styles.pinnedHeading}>
                <h3 id="pinned-heading">Pinned</h3>
                <WriterCheckbox
                  ariaLabel="Pinned"
                  checked={fields.featured}
                  disabled={busy}
                  onChange={(checked) => {
                    update({ featured: checked });
                    setPinnedOrder((order) =>
                      checked
                        ? order.includes(currentPin)
                          ? order
                          : [...order, currentPin]
                        : order.filter((value) => value !== currentPin),
                    );
                  }}
                />
              </div>
              {pins.conflict && (
                <div className={styles.notice} role="alert">
                  <p>
                    Pinned 목록이 변경되었습니다. 본문은 유지됩니다. 최신 목록을
                    사용하거나 내 순서·해제 변경을 반영한 뒤 확인해 주세요. 새로
                    고정된 글은 유지하고 해제된 글은 제외합니다.
                  </p>
                  <div className={styles.recoveryActions}>
                    {(
                      [
                        ["latest", "최신 고정 목록 사용"],
                        ["draft", "내 고정 변경 반영"],
                      ] as const
                    ).map(([choice, label]) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          pins.resolve(choice, fields.featured);
                          setDirty(true);
                          setMessage("");
                          setFeedback(null);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <PinnedCards
                posts={[
                  ...pins.posts.filter((post) => post.slug !== currentPin),
                  {
                    slug: currentPin,
                    title: fields.title,
                    coverImage: fields.coverImage,
                  },
                ]}
                order={pinnedOrder}
                disabled={busy}
                onReorder={(order) => {
                  setPinnedOrder(order);
                  setDirty(true);
                }}
                onRemove={(slug) => {
                  setPinnedOrder((order) =>
                    order.filter((value) => value !== slug),
                  );
                  if (slug === currentPin) update({ featured: false });
                  else setDirty(true);
                }}
              />
            </section>
            {!writable && publishMode && (
              <p className={styles.notice}>현재 발행할 수 없습니다.</p>
            )}
          </fieldset>
        </motion.div>
        <p role="status" className={styles.dialogStatus}>
          {message}
        </p>
        <div className={styles.dialogActions}>
          {initial && sha && (
            <StatefulButton
              type="button"
              state={buttonState("delete")}
              label="삭제"
              loadingLabel="삭제 중"
              successLabel="삭제 완료"
              disabled={busy || !writable}
              onClick={remove}
            />
          )}
          <StatefulButton
            className={styles.primary}
            type="button"
            onClick={() => (publishMode ? save(true) : storeDraft())}
            disabled={
              busy ||
              (publishMode && (!writable || Boolean(pins.conflict))) ||
              !editor
            }
            state={buttonState(publishMode ? "publish" : "draft")}
            label={
              publishMode ? (initialSha ? "수정 완료" : "발행") : "임시 저장"
            }
            loadingLabel={
              publishMode ? (initialSha ? "수정 중" : "발행 중") : "저장 중"
            }
            successLabel={
              publishMode
                ? initialSha
                  ? "수정 완료"
                  : "발행 완료"
                : "저장 완료"
            }
          />
        </div>
      </motion.dialog>
    </div>
  );
}
