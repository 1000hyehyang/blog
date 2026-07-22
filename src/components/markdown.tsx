import { codeToHtml } from "shiki";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyCodeButton } from "@/components/copy-code-button";
import { toSlug } from "@/lib/content";

async function HighlightedCode({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const code = String(children ?? "").replace(/\n$/, "");
  const match = /language-([\w-]+)/.exec(className ?? "");
  if (!match) return <code>{children}</code>;
  const html = await codeToHtml(code, {
    lang: match[1],
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  }).catch(() => "");
  if (!html)
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  return (
    <div className="relative my-6 overflow-hidden rounded-[var(--radius-md)] border bg-[#0d1117]">
      <span className="absolute right-3 top-2 z-10 text-[10px] text-zinc-400">
        {match[1]}
      </span>
      <CopyCodeButton code={code} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
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
          h2: ({ children }) => (
            <h2 id={toSlug(String(children))}>{children}</h2>
          ),
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
