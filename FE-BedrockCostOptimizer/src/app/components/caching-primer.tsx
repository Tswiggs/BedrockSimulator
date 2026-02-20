import React, { isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";
import content from "@docs/BedrockCachingPrimer.md?raw";
import { getPricingData } from "./pricing-data";

const BASE_URL = import.meta.env.BASE_URL;

function formatPrice(perThousand: number | null): string {
  if (perThousand === null) return "\u2014";
  const v = perThousand * 1000;
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 0.1) return `$${v.toFixed(3)}`;
  return `$${v.toFixed(2)}`;
}

const PRICING_COLUMNS: { label: string; key: string }[] = [
  { label: "Input", key: "input_1k" },
  { label: "Output", key: "output_1k" },
  { label: "Cache Write", key: "cache_write_1k" },
  { label: "Cache Read", key: "cache_read_1k" },
  { label: "Batch Input", key: "batch_input_1k" },
  { label: "Batch Output", key: "batch_output_1k" },
];

function PricingRow({ name }: { name: string }) {
  const { models } = getPricingData();
  const model = models.find((m) => m.name === name);
  if (!model) return <p className="text-destructive text-sm">Unknown model: {name}</p>;
  const p = model.pricing;
  const price = (key: string) => (p as unknown as Record<string, number | null>)[key] ?? null;
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card border-b border-border">
          <tr>
            {PRICING_COLUMNS.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {PRICING_COLUMNS.map((col) => (
              <td key={col.key} className="px-3 py-2 text-sm text-foreground font-mono">
                {formatPrice(price(col.key))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border bg-card">
        per 1M tokens
      </div>
    </div>
  );
}

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
    if (className === "language-pricing-row") {
      return <PricingRow name={String(children).trim()} />;
    }
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
  pre: ({ children }) => {
    if (isValidElement(children) && (children as React.ReactElement<{ name?: string }>).type === PricingRow) {
      return <>{children}</>;
    }
    return (
      <pre className="bg-card border border-border rounded-lg p-4 mb-4 overflow-x-auto text-sm leading-relaxed">
        {children}
      </pre>
    );
  },
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
