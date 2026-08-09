import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyCodeButton } from "@/components/copy-code-button";
import { ExternalLinkBookmark } from "@/features/post/external-link-bookmark";
import { YouTubeEmbed } from "@/features/post/youtube-embed";
import { toSlug } from "@/lib/content";
import { parseExternalHttpUrl } from "@/lib/link-preview";
import {
  getMarkdownCodeLanguage,
  highlightMarkdownCode,
} from "@/lib/markdown-code";
import { getStandaloneExternalUrl } from "@/lib/markdown-link";
import { parseYouTubeUrl } from "@/lib/youtube";

function headingText(children: React.ReactNode) {
  return String(children ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  return function Heading({ children }: { children?: React.ReactNode }) {
    const Tag = `h${level}` as const;
    const id = level <= 3 ? toSlug(headingText(children)) : undefined;
    return <Tag id={id}>{children}</Tag>;
  };
}

function isBlockCode(className?: string, children?: React.ReactNode) {
  if (className?.startsWith("language-")) return true;
  return String(children ?? "").includes("\n");
}

function MarkdownParagraph({
  node,
  children,
}: {
  node?: unknown;
  children?: React.ReactNode;
}) {
  const externalUrl = getStandaloneExternalUrl(node);
  if (!externalUrl) return <p>{children}</p>;

  const youtubeVideo = parseYouTubeUrl(externalUrl);
  return youtubeVideo ? (
    <YouTubeEmbed video={youtubeVideo} />
  ) : (
    <ExternalLinkBookmark href={externalUrl} />
  );
}

async function HighlightedCode({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const code = String(children ?? "").replace(/\n$/, "");

  if (!isBlockCode(className, children)) {
    return <code className="notion-inline-code">{children}</code>;
  }

  const language = getMarkdownCodeLanguage(className);
  const highlightedHtml = await highlightMarkdownCode(code, language);

  return (
    <div
      className={`notion-code-block${language ? " notion-code-block--lang" : ""} group`}
    >
      {language && <span className="notion-code-lang">{language.label}</span>}
      <CopyCodeButton code={code} />
      {highlightedHtml ? (
        // Shiki가 원문을 이스케이프한 뒤 생성한 토큰 마크업만 삽입한다.
        <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

export function MarkdownContent({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: MarkdownParagraph,
          pre: ({ children }) => <>{children}</>,
          code: HighlightedCode,
          h1: createHeading(1),
          h2: createHeading(2),
          h3: createHeading(3),
          h4: createHeading(4),
          h5: createHeading(5),
          h6: createHeading(6),
          a: ({ href, children }) => {
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
          },
          img: ({ src, alt }) => (
            // 마크다운 이미지의 임의 호스트를 next/image 허용 목록에 열지 않는다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="markdown-image"
              src={typeof src === "string" ? src : ""}
              alt={alt ?? ""}
              loading="lazy"
            />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
