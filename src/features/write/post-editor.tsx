"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  CodeXml,
  Table2,
  Minus,
  Undo2,
  Redo2,
  ImagePlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import {
  readDrafts,
  saveDraft,
  removeDraft,
  type LocalDraft,
} from "./local-drafts";
import { nextPostSlug, type FilePost } from "@/lib/content/post-file";
import { motion } from "framer-motion";
import { PinnedCards, WriterCheckbox, WriterSelect } from "./writer-controls";
import type { PinnedPost } from "./pinned-posts";
import { DitherLoader } from "@/components/dither-loader";
import { TagInput } from "./tag-input";
import { IconButton } from "./icon-button";
import { EditorBodySkeleton } from "./writer-skeleton";
import { editorExtensions, hasUnsupportedHtml } from "./editor-extensions";
import styles from "./writer.module.css";
import { WriterHeader } from "./writer-header";

const emptyFields = {
  title: "",
  body: "",
  tags: [] as string[],
  excerpt: "",
  coverImage: { src: "" },
  galleryImage: { src: "" },
  category: { name: "Development", slug: "development" },
  featured: false,
  featuredOrder: undefined as number | undefined,
  published: false,
};
type Props = {
  initial: FilePost | null;
  initialSha: string | null;
  writable: boolean;
  pinned?: PinnedPost[];
  postSlugs?: string[];
  draft?: LocalDraft;
};
const imageTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
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
  const [fields, setFields] = useState({ ...emptyFields, ...initial });
  const generatedSlug = useRef(initial?.slug ?? "");
  const currentPin = initial?.slug ?? "__current__";
  const [pinnedBase, setPinnedBase] = useState(pinned.map((post) => post.slug));
  const [pinnedOrder, setPinnedOrder] = useState(() => {
    if (draft) return draft.order;
    const order = pinned.map((post) => post.slug);
    return initial?.featured && !order.includes(currentPin)
      ? [...order, currentPin]
      : order;
  });
  const [tags, setTags] = useState(
    initial?.tags.length ? `${initial.tags.join(",")},` : "",
  );
  const [sha, setSha] = useState(initialSha);
  const [draftVersion, setDraftVersion] = useState(draft?.savedAt ?? null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const publishDialog = useRef<HTMLDialogElement>(null);
  const [publishMode, setPublishMode] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<"body" | "coverImage" | "galleryImage">("body");
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
    editable: !unsupported,
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) return;
      setFields((current) => ({ ...current, body: editor.getMarkdown() }));
      setDirty(true);
    },
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "본문 편집기",
        "aria-multiline": "true",
        spellcheck: "false",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        void uploadImages(files, "body");
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
        void uploadImages(files, "body");
        return true;
      },
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      strike: editor?.isActive("strike"),
      bulletList: editor?.isActive("bulletList"),
      orderedList: editor?.isActive("orderedList"),
      taskList: editor?.isActive("taskList"),
      blockquote: editor?.isActive("blockquote"),
      codeBlock: editor?.isActive("codeBlock"),
    }),
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

  function start() {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    return true;
  }
  function finish() {
    busyRef.current = false;
    setBusy(false);
  }
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
    return {
      ...fields,
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
  function allocateSlug() {
    if (generatedSlug.current) return generatedSlug.current;
    try {
      generatedSlug.current = nextPostSlug([
        ...postSlugs,
        ...readDrafts().map(({ post }) => post.slug),
      ]);
      return generatedSlug.current;
    } catch {
      throw new Error("임시 저장 글 번호를 확인하지 못했습니다.");
    }
  }

  async function uploadImages(
    files: File[],
    target: "body" | "coverImage" | "galleryImage",
  ) {
    if (!editor || (target === "body" && unsupported) || !start()) return;
    editor.setEditable(false);
    try {
      for (const file of target === "body" ? files : files.slice(0, 1)) {
        const extension = imageTypes[file.type];
        if (!extension || !file.size || file.size > 8 * 1024 * 1024)
          throw new Error(
            "8MB 이하의 PNG, JPEG, GIF, WebP, AVIF 이미지를 선택해 주세요.",
          );
        const blob = await upload(
          `posts/${crypto.randomUUID()}.${extension}`,
          file,
          {
            access: "public",
            handleUploadUrl: "/api/write/images",
            contentType: file.type,
          },
        );
        if (target === "body")
          editor
            .chain()
            .focus()
            .setImage({ src: blob.url, alt: file.name.replace(/\.[^.]+$/, "") })
            .run();
        else update({ [target]: { src: blob.url } });
      }
      setMessage("이미지를 추가했습니다. 글을 저장해 주세요.");
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

  async function save(published: boolean) {
    if (!editor || !start()) return;
    try {
      // 저장에 실패해도 재시도할 때 같은 글 주소를 사용한다.
      const slug = allocateSlug();
      const order = pinnedOrder
        .filter(
          (value) => value !== currentPin || (fields.featured && published),
        )
        .map((value) => (value === currentPin ? slug : value));
      const response = await fetch(
        `/api/write/posts/${encodeURIComponent(slug)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: { ...currentFields(), published },
            sha,
            pinned: { base: pinnedBase, order },
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSha(data.sha);
      setPinnedBase(data.pinned ?? order);
      setFields(data.post);
      setDirty(false);
      setMessage("저장했습니다.");
      if (draftVersion) {
        try {
          removeDraft(slug, draftVersion);
          setDraftVersion(null);
        } catch {
          setMessage(
            "발행했습니다. 남아 있는 임시 저장본은 글 관리에서 확인해 주세요.",
          );
        }
      }
      publishDialog.current?.close();
      router.replace("/manage");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "저장에 실패했습니다. 작성 내용은 유지됩니다. 다시 시도해 주세요.",
      );
    } finally {
      finish();
    }
  }
  function storeDraft() {
    if (!editor || !start()) return;
    try {
      const slug = allocateSlug();
      const now = new Date().toISOString();
      const value: LocalDraft = {
        post: {
          id: initial?.id ?? crypto.randomUUID(),
          createdAt: initial?.createdAt ?? now,
          lastEditedAt: initial?.lastEditedAt ?? null,
          commentsCount: 0,
          reactionsCount: 0,
          ...initial,
          ...currentFields(),
          title: fields.title.trim() || "제목 없음",
          slug,
        },
        sha,
        savedAt: now,
        pinned,
        order: pinnedOrder.map((value) =>
          value === currentPin ? slug : value,
        ),
      };
      saveDraft(value, draftVersion);
      setDraftVersion(now);
      setDirty(false);
      setMessage("임시 저장했습니다.");
      publishDialog.current?.close();
      router.replace(`/write?draft=${encodeURIComponent(slug)}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "임시 저장하지 못했습니다. 현재 내용은 유지됩니다.",
      );
    } finally {
      finish();
    }
  }
  async function remove() {
    if (!initial || !sha || !window.confirm("이 글을 삭제할까요?") || !start())
      return;
    try {
      const response = await fetch(
        `/api/write/posts/${encodeURIComponent(initial.slug)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setDirty(false);
      publishDialog.current?.close();
      router.replace("/manage");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
      );
    } finally {
      finish();
    }
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
    publishDialog.current?.showModal();
  }
  const formattingDisabled = !editor || unsupported;
  const toolbar = (
    <fieldset className={styles.toolbar} disabled={busy} aria-label="본문 서식">
      <IconButton
        label="이미지"
        disabled={formattingDisabled}
        onClick={() => chooseImage("body")}
      >
        <ImagePlus size={20} />
      </IconButton>
      <span className={styles.fontLabel}>기본 서체</span>
      <span className={styles.separator} />
      {(
        [
          [
            "굵게",
            Bold,
            active?.bold,
            () => editor?.chain().focus().toggleBold().run(),
          ],
          [
            "기울임",
            Italic,
            active?.italic,
            () => editor?.chain().focus().toggleItalic().run(),
          ],
          [
            "취소선",
            Strikethrough,
            active?.strike,
            () => editor?.chain().focus().toggleStrike().run(),
          ],
          [
            "인용",
            Quote,
            active?.blockquote,
            () => editor?.chain().focus().toggleBlockquote().run(),
          ],
          [
            "목록",
            List,
            active?.bulletList,
            () => editor?.chain().focus().toggleBulletList().run(),
          ],
          [
            "번호 목록",
            ListOrdered,
            active?.orderedList,
            () => editor?.chain().focus().toggleOrderedList().run(),
          ],
          [
            "체크리스트",
            ListTodo,
            active?.taskList,
            () => editor?.chain().focus().toggleTaskList().run(),
          ],
          [
            "표",
            Table2,
            false,
            () =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
          ],
          [
            "코드",
            CodeXml,
            active?.codeBlock,
            () => editor?.chain().focus().toggleCodeBlock().run(),
          ],
          [
            "구분선",
            Minus,
            false,
            () => editor?.chain().focus().setHorizontalRule().run(),
          ],
          [
            "실행 취소",
            Undo2,
            false,
            () => editor?.chain().focus().undo().run(),
          ],
          [
            "다시 실행",
            Redo2,
            false,
            () => editor?.chain().focus().redo().run(),
          ],
        ] as const
      ).map(([label, Icon, pressed, command]) => (
        <IconButton
          key={label}
          label={label}
          aria-pressed={Boolean(pressed)}
          disabled={formattingDisabled}
          onClick={command}
        >
          <Icon size={19} strokeWidth={1.7} />
        </IconButton>
      ))}
    </fieldset>
  );

  return (
    <div className={styles.writer}>
      <h1 className="sr-only">{initial ? "글 수정" : "글쓰기"}</h1>
      <WriterHeader onLogout={logout}>{toolbar}</WriterHeader>
      <div className={styles.canvas}>
        <fieldset disabled={busy} className={styles.composition}>
          <div className={styles.category}>
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
              <EditorContent editor={editor} />
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
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
          multiple
          hidden
          aria-label="이미지 파일 선택"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void uploadImages(files, uploadTarget.current);
          }}
        />
      </div>

      <footer className={styles.bottomBar}>
        <p role="status" aria-live="polite" className={styles.saveStatus}>
          {busy ? (
            <DitherLoader label="저장 중" />
          ) : (
            message ||
            (!writable
              ? "현재 발행할 수 없습니다"
              : dirty
                ? "저장하지 않은 변경사항"
                : "모든 변경사항 저장됨")
          )}
        </p>
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
              <PinnedCards
                posts={[
                  ...pinned.filter((post) => post.slug !== currentPin),
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
          {busy ? <DitherLoader label="저장 중" /> : message}
        </p>
        <div className={styles.dialogActions}>
          {initial && sha && (
            <button type="button" disabled={busy || !writable} onClick={remove}>
              삭제
            </button>
          )}
          <button
            className={styles.primary}
            type="button"
            onClick={() => (publishMode ? save(true) : storeDraft())}
            disabled={busy || (publishMode && !writable) || !editor}
          >
            {publishMode ? (sha ? "수정 완료" : "발행") : "임시 저장"}
          </button>
        </div>
      </motion.dialog>
    </div>
  );
}
