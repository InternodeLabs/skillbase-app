"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

const Editor = dynamic(() => import("./InitializedMDXEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-border bg-background px-3 py-8 text-sm text-muted">
      Loading editor…
    </div>
  ),
});

export const ForwardRefEditor = forwardRef<MDXEditorMethods, MDXEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />,
);

ForwardRefEditor.displayName = "ForwardRefEditor";
