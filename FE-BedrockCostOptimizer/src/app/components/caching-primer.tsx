import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";
import content from "../content/BedrockCachingPrimer.md?raw";

const BASE_URL = import.meta.env.BASE_URL;

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-[var(--text-2xl)] font-[var(--font-weight-medium)] font-[family-name:var(--font-headline)] leading-relaxed mt-10 mb-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[var(--text-xl)] font-[var(--font-weight-medium)] font-[family-name:var(--font-headline)] leading-relaxed mt-10 mb-3 border-b border-border pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[var(--text-lg)] font-[var(--font-weight-medium)] font-[family-name:var(--font-headline)] leading-relaxed mt-8 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[var(--text-base)] font-[family-name:var(--font-body)] leading-relaxed mb-4 text-foreground">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => {
    const isInternal = href?.startsWith("#");
    return (
      <a
        href={href}
        className="text-secondary underline underline-offset-2 hover:text-secondary/80 transition-colors"
        {...(!isInternal && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-4 space-y-2 text-[var(--text-base)] font-[family-name:var(--font-body)] leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 text-[var(--text-base)] font-[family-name:var(--font-body)] leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-foreground">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block text-sm font-mono">{children}</code>
      );
    }
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-card border border-border rounded-lg p-4 mb-4 overflow-x-auto text-sm leading-relaxed">
      {children}
    </pre>
  ),
  img: ({ src, alt }) => {
    const resolvedSrc =
      src && !src.startsWith("http") ? `${BASE_URL}docs/${src}` : src;
    return (
      <figure className="my-6">
        <img
          src={resolvedSrc}
          alt={alt || ""}
          className="w-full rounded-lg border border-border shadow-sm"
          loading="lazy"
        />
        {alt && (
          <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">
            {alt}
          </figcaption>
        )}
      </figure>
    );
  },
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-card border-b border-border">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-foreground">{children}</td>
  ),
  hr: () => <hr className="my-8 border-border" />,
};

export function CachingPrimer() {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
