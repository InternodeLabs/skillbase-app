"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import {
  activeEditor$,
  addComposerChild$,
  applyFormat$,
  currentFormat$,
  currentSelection$,
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  linkDialogState$,
  openLinkEditDialog$,
  realmPlugin,
  removeLink$,
} from "@mdxeditor/editor";
import { useCellValue, usePublisher, useRealm } from "@mdxeditor/gurx";
import { $isRangeSelection, type LexicalEditor } from "lexical";
import {
  Bold,
  Code2,
  Italic,
  Link2,
  Link2Off,
  Strikethrough,
  Underline,
} from "lucide-react";
import { createPortal } from "react-dom";

const TOOLBAR_OFFSET_PX = 8;

function isSelectionInsideEditor(editor: LexicalEditor): boolean {
  const root = editor.getRootElement();
  if (!root) return false;
  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return false;
  const node = domSelection.anchorNode;
  if (!node) return false;
  return root.contains(node);
}

function getSelectionRect(): DOMRect | null {
  const domSelection = window.getSelection();
  if (
    !domSelection ||
    domSelection.rangeCount === 0 ||
    domSelection.isCollapsed
  ) {
    return null;
  }
  const range = domSelection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function isLinkActive(editor: LexicalEditor): boolean {
  let isLink = false;
  editor.getEditorState().read(() => {
    const domSelection = window.getSelection();
    if (!domSelection || !isSelectionInsideEditor(editor)) return;
    const node = domSelection.anchorNode;
    if (!(node instanceof Node)) return;
    let element: Element | null =
      node instanceof Element ? node : node.parentElement;
    while (element) {
      if (element.tagName === "A") {
        isLink = true;
        return;
      }
      element = element.parentElement;
    }
  });
  return isLink;
}

function ToolbarButton({
  active = false,
  label,
  onMouseDown,
  children,
}: {
  active?: boolean;
  label: string;
  onMouseDown: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-foreground transition hover:bg-skeleton ${
        active ? "bg-skeleton" : ""
      }`}
    >
      {children}
    </button>
  );
}

function FloatingFormatToolbar(): JSX.Element | null {
  const editor = useCellValue(activeEditor$);
  const selection = useCellValue(currentSelection$);
  const formatBitmask = useCellValue(currentFormat$);
  const applyFormat = usePublisher(applyFormat$);
  const openLinkEditDialog = usePublisher(openLinkEditDialog$);
  const removeLink = usePublisher(removeLink$);
  const realm = useRealm();

  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [linkActive, setLinkActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const isActiveRangeSelection = useMemo(() => {
    if (!selection) return false;
    return $isRangeSelection(selection) && !selection.isCollapsed();
  }, [selection]);

  useEffect(() => {
    setDismissed(false);
  }, [selection]);

  useLayoutEffect(() => {
    if (
      !editor ||
      !isActiveRangeSelection ||
      dismissed ||
      !isSelectionInsideEditor(editor)
    ) {
      setPosition(null);
      return;
    }

    const rect = getSelectionRect();
    if (!rect) {
      setPosition(null);
      return;
    }

    setPosition({
      top: rect.top + window.scrollY - TOOLBAR_OFFSET_PX,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setLinkActive(isLinkActive(editor));
  }, [editor, isActiveRangeSelection, selection, formatBitmask, dismissed]);

  useEffect(() => {
    if (!editor || !position) return;

    const root = editor.getRootElement();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (toolbarRef.current?.contains(target)) return;
      if (root?.contains(target)) return;
      setDismissed(true);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, position]);

  useEffect(() => {
    if (!position) return;
    const updateOnViewportChange = () => {
      const rect = getSelectionRect();
      if (!rect) {
        setPosition(null);
        return;
      }
      setPosition({
        top: rect.top + window.scrollY - TOOLBAR_OFFSET_PX,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    };
    window.addEventListener("scroll", updateOnViewportChange, true);
    window.addEventListener("resize", updateOnViewportChange);
    return () => {
      window.removeEventListener("scroll", updateOnViewportChange, true);
      window.removeEventListener("resize", updateOnViewportChange);
    };
  }, [position]);

  if (!editor || !isActiveRangeSelection || !position) return null;

  const handleOpenLink = () => {
    const selectedText = window.getSelection()?.toString().trim() ?? "";
    openLinkEditDialog();
    if (!selectedText) return;
    let attempts = 0;
    const tryPrefill = () => {
      const state = realm.getValue(linkDialogState$);
      if (state.type === "edit") {
        if (!state.title) {
          realm.pub(linkDialogState$, { ...state, title: selectedText });
        }
        return;
      }
      attempts += 1;
      if (attempts < 20) setTimeout(tryPrefill, 16);
    };
    setTimeout(tryPrefill, 0);
  };

  return createPortal(
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Text formatting"
      className="pointer-events-auto fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      <ToolbarButton
        active={(formatBitmask & IS_BOLD) !== 0}
        label="Bold"
        onMouseDown={() => applyFormat("bold")}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={(formatBitmask & IS_ITALIC) !== 0}
        label="Italic"
        onMouseDown={() => applyFormat("italic")}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={(formatBitmask & IS_UNDERLINE) !== 0}
        label="Underline"
        onMouseDown={() => applyFormat("underline")}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={(formatBitmask & IS_STRIKETHROUGH) !== 0}
        label="Strikethrough"
        onMouseDown={() => applyFormat("strikethrough")}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={(formatBitmask & IS_CODE) !== 0}
        label="Inline code"
        onMouseDown={() => applyFormat("code")}
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton
        active={linkActive}
        label={linkActive ? "Edit link" : "Add link"}
        onMouseDown={handleOpenLink}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      {linkActive ? (
        <ToolbarButton label="Remove link" onMouseDown={() => removeLink()}>
          <Link2Off className="h-4 w-4" />
        </ToolbarButton>
      ) : null}
    </div>,
    document.body,
  );
}

export const floatingFormatToolbarPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addComposerChild$]: () => <FloatingFormatToolbar />,
    });
  },
});
