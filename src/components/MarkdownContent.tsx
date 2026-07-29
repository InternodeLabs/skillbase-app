"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PLACEHOLDER_RE = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g;
/** Placeholders inside code/pre stay literal — don't restyle them. */
const SKIP_TAGS = new Set(["code", "pre"]);

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/** Split a text value into text + styled `{{param}}` span nodes, or null if none. */
function splitPlaceholders(value: string): HastNode[] | null {
  PLACEHOLDER_RE.lastIndex = 0;
  if (!PLACEHOLDER_RE.test(value)) return null;

  PLACEHOLDER_RE.lastIndex = 0;
  const nodes: HastNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    nodes.push({
      type: "element",
      tagName: "span",
      properties: { className: ["skill-param"] },
      children: [{ type: "text", value: match[0] }],
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }
  return nodes;
}

function highlightPlaceholders(node: HastNode): void {
  if (!node.children) return;
  const next: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      const split = splitPlaceholders(child.value);
      if (split) {
        next.push(...split);
        continue;
      }
    } else if (
      child.type === "element" &&
      !SKIP_TAGS.has(child.tagName ?? "")
    ) {
      highlightPlaceholders(child);
    }
    next.push(child);
  }
  node.children = next;
}

/** Render-only: wrap `{{param}}` tokens so they show bold + blue. */
function rehypeSkillParams() {
  return (tree: HastNode) => highlightPlaceholders(tree);
}

export function MarkdownContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className ?? "markdown-preview text-sm leading-relaxed"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSkillParams]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
