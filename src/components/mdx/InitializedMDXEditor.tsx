"use client";

import type { ForwardedRef } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

import { floatingFormatToolbarPlugin } from "./floatingFormatToolbarPlugin";
import { slashCommandPlugin } from "./slashCommandPlugin";

export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            txt: "Plain Text",
            js: "JavaScript",
            ts: "TypeScript",
            css: "CSS",
            json: "JSON",
            md: "Markdown",
            bash: "Bash",
          },
        }),
        slashCommandPlugin(),
        floatingFormatToolbarPlugin(),
      ]}
      {...props}
      ref={editorRef}
    />
  );
}
