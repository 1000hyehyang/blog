import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyCodeButton } from "@/components/copy-code-button";
import { ExternalLinkPreview } from "@/features/post/external-link-preview";
import { YouTubeEmbed } from "@/features/post/youtube-embed";
import {
  type MarkdownHeadingLevel,
  toBodyHeadingLevel,
  toSlug,
} from "@/lib/content";
import { parseExternalHttpUrl } from "@/lib/link-preview";
import {
  getMarkdownCodeLanguage,
  highlightMarkdownCode,
} from "@/lib/markdown-code";
import { getStandaloneExternalUrl } from "@/lib/markdown-link";
import { getReactNodeText } from "@/lib/react/get-node-text";
import { parseYouTubeUrl } from "@/lib/youtube";

function getHeadingText(children: ReactNode) {
  return getReactNodeText(children).replace(/\s+/g, " ").trim();
}

function createHeading(level: MarkdownHeadingLevel) {
  return function MarkdownHeading({ children }: { children?: ReactNode }) {
    const Tag = `h${toBodyHeadingLevel(level)}` as const;
    const id = level <= 3 ? toSlug(getHeadingText(children)) : undefined;

    return (
      <Tag id={id} className={`markdown-heading markdown-heading--${level}`}>
        {children}
      </Tag>
    );
  };
}

function isBlockCode(className?: string, children?: ReactNode) {
  return (
    className?.startsWith("language-") || String(children ?? "").includes("\n")
  );
}

function MarkdownParagraph({
  node,
  children,
}: {
  node?: unknown;
  children?: ReactNode;
}) {
  const externalUrl = getStandaloneExternalUrl(node);
  if (!externalUrl) return <p>{children}</p>;

  const youtubeVideo = parseYouTubeUrl(externalUrl);
  return youtubeVideo ? (
    <YouTubeEmbed video={youtubeVideo} />
  ) : (
    <ExternalLinkPreview href={externalUrl} />
  );
}

function MarkdownLink({ href, children }: ComponentProps<"a">) {
  const external = href ? Boolean(parseExternalHttpUrl(href)) : false;

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function MarkdownImage({ src, alt }: ComponentProps<"img">) {
  return (
    // Markdown 본문은 next/image 허용 목록에 추가할 수 없는 임의의 호스트를 참조할 수 있다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="markdown-image"
      src={src ?? ""}
      alt={alt ?? ""}
      loading="lazy"
    />
  );
}

async function HighlightedCode({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const code = String(children ?? "").replace(/\n$/, "");

  if (!isBlockCode(className, children)) {
    return <code className="markdown-inline-code">{children}</code>;
  }

  const language = getMarkdownCodeLanguage(className);
  const highlightedHtml = await highlightMarkdownCode(code, language);

  return (
    <div
      className={`markdown-code-block${language ? " markdown-code-block--with-language" : ""} group`}
    >
      {language && (
        <span className="markdown-code-language">{language.label}</span>
      )}
      <CopyCodeButton code={code} />
      {highlightedHtml ? (
        // Shiki는 토큰 마크업을 만들기 전에 원본 코드를 이스케이프한다.
        <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

const markdownComponents = {
  p: MarkdownParagraph,
  pre: ({ children }) => <>{children}</>,
  code: HighlightedCode,
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  a: MarkdownLink,
  img: MarkdownImage,
} satisfies Components;

export function MarkdownContent({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
