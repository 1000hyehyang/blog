import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

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
import { markdownPlugins } from "@/lib/markdown-plugins";
import { getReactNodeText } from "@/lib/react/get-node-text";
import { parseYouTubeUrl } from "@/lib/youtube";
import { hasImageSettings, readImageMetadata } from "@/lib/image-metadata";
import { readImageGroup } from "@/lib/image-group";
import { ImageGroupDisplay } from "./image-group";

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

function MarkdownImage({ src, alt, title }: ComponentProps<"img">) {
  const group = readImageGroup(title);
  if (group && group.images[0].src === src)
    return (
      <ImageGroupDisplay
        className="markdown-image-group"
        images={group.images}
        layout={group.layout}
        caption={group.caption}
      />
    );
  const settings = readImageMetadata(title);
  const image = (
    // 본문 이미지는 next/image 허용 목록 밖의 호스트도 사용한다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="markdown-image"
      src={src ?? ""}
      alt={alt ?? ""}
      title={settings.title ?? undefined}
      loading="lazy"
    />
  );
  if (!hasImageSettings(settings)) return image;
  return (
    <span
      className="markdown-image-frame"
      data-align={settings.align}
      data-width={settings.width}
      style={{ width: `${settings.width}%` }}
    >
      {image}
      {settings.caption && (
        <span className="markdown-image-caption">{settings.caption}</span>
      )}
    </span>
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
        remarkPlugins={markdownPlugins}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
