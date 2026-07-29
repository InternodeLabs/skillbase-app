"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className ?? "markdown-preview text-sm leading-relaxed"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
