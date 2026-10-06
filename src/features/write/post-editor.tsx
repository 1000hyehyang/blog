"use client";

import { useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCategoryNavigation, siteConfig } from "@/config/site";
import { IMAGE_UPLOAD_TYPES } from "@/config/images";
import type { LocalDraft } from "./local-drafts";
import type { PostFields, StoredPost } from "@/domain/post";
import { usePostPersistence } from "./use-post-persistence";
import { WriterSelect } from "./writer-controls";
import type { PinnedPost } from "@/domain/pinned-posts";
import { usePinnedOrder } from "./use-pinned-order";
import { TagInput } from "./tag-input";
import { EditorToolbar } from "./editor-toolbar";
import { EditorBodySkeleton } from "./writer-skeleton";
import { editorExtensions, hasUnsupportedHtml } from "./editor-extensions";
import { TableOverlay } from "./table-overlay";
import { ImageEditor, nextCoverImageSrc } from "./image-editor";
import { ImageLayoutDialog } from "./image-layout-dialog";
import { parseExternalHttpUrl } from "@/lib/link-preview";
import styles from "./writer.module.css";
import { WriterHeader } from "./writer-header";
import { PublishDialog } from "./publish-dialog";
import { usePostImages } from "./use-post-images";
import { useWriterFeedback } from "./use-writer-feedback";

const emptyFields: PostFields = {
  title: "",
  body: "",
  tags: [],
  coverImage: { src: "" },
  galleryImage: { src: "" },
  category: { name: "Development", slug: "development" },
  series: undefined,
  featured: false,
  featuredOrder: undefined,
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
  const [tags, setTags] = useState(
    initial?.tags.length ? `${initial.tags.join(",")},` : "",
  );
  const [dirty, setDirty] = useState(false);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const [publishMode, setPublishMode] = useState(true);
  const feedback = useWriterFeedback();
  const { busy, message, setMessage, setFeedback, start, finish } = feedback;
  const persistence = usePostPersistence({
    feedback,
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
  const { allocateId } = persistence;
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
  const {
    fileInput,
    imageLayoutDialog,
    pendingImages,
    queueImages,
    chooseImage,
    uploadPendingImages,
    queueSelectedImages,
    setLayout,
    close,
  } = usePostImages({
    editor,
    unsupported,
    category: fields.category.slug,
    allocateId,
    update,
    feedback,
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
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
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
      body: bodyChanged.current ? editor.getMarkdown() : fields.body,
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
            queueSelectedImages(files);
          }}
        />
      </div>

      <ImageLayoutDialog
        dialogRef={imageLayoutDialog}
        images={pendingImages?.items ?? []}
        layout={pendingImages?.layout ?? "individual"}
        error={pendingImages?.error ?? ""}
        busy={busy}
        onLayoutChange={setLayout}
        onConfirm={() => void uploadPendingImages()}
        onClose={close}
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

      <PublishDialog
        publishDialog={publishDialog}
        fields={fields}
        publishMode={publishMode}
        initial={initial}
        initialSha={initialSha}
        writable={writable}
        editorReady={Boolean(editor)}
        currentPin={currentPin}
        pins={pins}
        persistence={persistence}
        feedback={feedback}
        update={update}
        chooseImage={chooseImage}
        onDirty={() => setDirty(true)}
      />
    </div>
  );
}
