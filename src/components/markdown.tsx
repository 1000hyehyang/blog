import { codeToHtml } from "shiki";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyCodeButton } from "@/components/copy-code-button";
import { toSlug } from "@/lib/content";

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

  const match = /language-([\w-]+)/.exec(className ?? "");
  const language = match?.[1];

  if (language) {
    const html = await codeToHtml(code, {
      lang: language,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    }).catch(() => "");

    if (html) {
      return (
        <div className="notion-code-block notion-code-block--lang group">
          <span className="notion-code-lang">{language}</span>
          <CopyCodeButton code={code} />
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    }
  }

  return (
    <div className="notion-code-block group">
      <CopyCodeButton code={code} />
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownContent({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: HighlightedCode,
          h1: createHeading(1),
          h2: createHeading(2),
          h3: createHeading(3),
          h4: createHeading(4),
          h5: createHeading(5),
          h6: createHeading(6),
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
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
            // Markdown 이미지는 원본 크기를 알 수 없어 native lazy loading을 사용합니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
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
