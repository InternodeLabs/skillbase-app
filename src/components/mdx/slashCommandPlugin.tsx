"use client";

import {
  useCallback,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
  activeEditor$,
  addComposerChild$,
  convertSelectionToNode$,
  insertCodeBlock$,
  insertTable$,
  insertThematicBreak$,
  realmPlugin,
} from "@mdxeditor/editor";
import { useCellValue, usePublisher } from "@mdxeditor/gurx";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type ElementNode,
  type LexicalEditor,
  type TextNode,
} from "lexical";
import {
  CheckCircle,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table,
  Type,
} from "lucide-react";
import { createPortal } from "react-dom";

type SlashCommandAction = (ctx: {
  editor: LexicalEditor;
  convertSelectionToNode: (factory: () => ElementNode) => void;
  insertCodeBlock: (value: { language?: string; code?: string }) => void;
  insertTable: (value: { rows: number; columns: number }) => void;
  insertThematicBreak: () => void;
}) => void;

type SlashCommand = {
  key: string;
  title: string;
  description: string;
  keywords: string[];
  icon: (props: { className?: string }) => JSX.Element;
  run: SlashCommandAction;
};

const COMMANDS: readonly SlashCommand[] = [
  {
    key: "paragraph",
    title: "Text",
    description: "Plain paragraph",
    keywords: ["text", "paragraph", "p"],
    icon: (props) => <Type {...props} />,
    run: ({ convertSelectionToNode }) =>
      convertSelectionToNode(() => $createParagraphNode()),
  },
  {
    key: "h1",
    title: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "heading", "title"],
    icon: (props) => <Heading1 {...props} />,
    run: ({ convertSelectionToNode }) =>
      convertSelectionToNode(() => $createHeadingNode("h1")),
  },
  {
    key: "h2",
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2", "heading", "subtitle"],
    icon: (props) => <Heading2 {...props} />,
    run: ({ convertSelectionToNode }) =>
      convertSelectionToNode(() => $createHeadingNode("h2")),
  },
  {
    key: "h3",
    title: "Heading 3",
    description: "Small section heading",
    keywords: ["h3", "heading"],
    icon: (props) => <Heading3 {...props} />,
    run: ({ convertSelectionToNode }) =>
      convertSelectionToNode(() => $createHeadingNode("h3")),
  },
  {
    key: "bullet",
    title: "Bulleted list",
    description: "Unordered list",
    keywords: ["bullet", "ul", "list", "unordered"],
    icon: (props) => <List {...props} />,
    run: ({ editor }) => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    key: "numbered",
    title: "Numbered list",
    description: "Ordered list",
    keywords: ["numbered", "ol", "list", "ordered"],
    icon: (props) => <ListOrdered {...props} />,
    run: ({ editor }) => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    key: "todo",
    title: "To-do list",
    description: "Checklist",
    keywords: ["todo", "task", "check", "checklist"],
    icon: (props) => <CheckCircle {...props} />,
    run: ({ editor }) => {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    },
  },
  {
    key: "quote",
    title: "Quote",
    description: "Block quote",
    keywords: ["quote", "blockquote"],
    icon: (props) => <Quote {...props} />,
    run: ({ convertSelectionToNode }) =>
      convertSelectionToNode(() => $createQuoteNode()),
  },
  {
    key: "code",
    title: "Code block",
    description: "Fenced code block",
    keywords: ["code", "codeblock", "fence"],
    icon: (props) => <Code2 {...props} />,
    run: ({ insertCodeBlock }) =>
      insertCodeBlock({ language: "txt", code: "" }),
  },
  {
    key: "divider",
    title: "Divider",
    description: "Horizontal rule",
    keywords: ["divider", "hr", "rule", "separator"],
    icon: (props) => <Minus {...props} />,
    run: ({ insertThematicBreak }) => insertThematicBreak(),
  },
  {
    key: "table",
    title: "Table",
    description: "3×3 table",
    keywords: ["table", "grid"],
    icon: (props) => <Table {...props} />,
    run: ({ insertTable }) => insertTable({ rows: 3, columns: 3 }),
  },
];

class SlashOption extends MenuOption {
  readonly command: SlashCommand;

  constructor(command: SlashCommand) {
    super(command.key);
    this.command = command;
  }
}

function filterCommands(query: string | null): SlashOption[] {
  const normalized = (query ?? "").trim().toLowerCase();
  const source = !normalized
    ? COMMANDS
    : COMMANDS.filter((command) => {
        if (command.title.toLowerCase().includes(normalized)) return true;
        return command.keywords.some((keyword) =>
          keyword.toLowerCase().includes(normalized),
        );
      });
  return source.map((command) => new SlashOption(command));
}

function SlashMenu({
  anchor,
  options,
  selectedIndex,
  onHover,
  onSelect,
}: {
  anchor: HTMLElement;
  options: SlashOption[];
  selectedIndex: number | null;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
}): ReactNode {
  if (options.length === 0) return null;

  const rect = anchor.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 4;
  const left = rect.left + window.scrollX;

  return createPortal(
    <div
      style={{ position: "absolute", top, left }}
      className="z-50 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 text-sm text-foreground shadow-lg"
    >
      {options.map((option, index) => {
        const isActive = selectedIndex === index;
        const Icon = option.command.icon;
        return (
          <button
            key={option.command.key}
            ref={(el) => {
              option.setRefElement(el);
            }}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(index);
            }}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
              isActive ? "bg-skeleton" : "hover:bg-skeleton"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {option.command.title}
              </span>
              <span className="truncate text-xs text-muted">
                {option.command.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

function SlashCommandTypeahead(): JSX.Element | null {
  const editor = useCellValue(activeEditor$);
  const convertSelectionToNode = usePublisher(convertSelectionToNode$);
  const insertCodeBlock = usePublisher(insertCodeBlock$);
  const insertTable = usePublisher(insertTable$);
  const insertThematicBreak = usePublisher(insertThematicBreak$);
  const [query, setQuery] = useState<string | null>(null);
  const options = useMemo(() => filterCommands(query), [query]);

  const triggerFn = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
    allowWhitespace: false,
  });

  const triggerAtBlockStart = useCallback(
    (text: string, currentEditor: LexicalEditor) => {
      const basic = triggerFn(text, currentEditor);
      if (!basic) return null;
      const leadingIndex = basic.leadOffset;
      const charBefore = leadingIndex > 0 ? text.charAt(leadingIndex - 1) : "";
      if (leadingIndex === 0 || /\s/.test(charBefore)) return basic;
      return null;
    },
    [triggerFn],
  );

  const onSelectOption = useCallback(
    (
      option: SlashOption,
      matchingNode: TextNode | null,
      closeMenu: () => void,
    ) => {
      if (!editor) {
        closeMenu();
        return;
      }

      editor.update(() => {
        if (matchingNode !== null) {
          matchingNode.remove();
        } else {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) selection.removeText();
        }
      });

      option.command.run({
        editor,
        convertSelectionToNode,
        insertCodeBlock,
        insertTable,
        insertThematicBreak,
      });
      closeMenu();
    },
    [
      convertSelectionToNode,
      editor,
      insertCodeBlock,
      insertTable,
      insertThematicBreak,
    ],
  );

  if (!editor) return null;

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      options={options}
      triggerFn={triggerAtBlockStart}
      anchorClassName="mdxeditor-slash-command-anchor"
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) => {
        if (!anchorElementRef.current) return null;
        return (
          <SlashMenu
            anchor={anchorElementRef.current}
            options={options}
            selectedIndex={selectedIndex}
            onHover={setHighlightedIndex}
            onSelect={(index) => {
              const chosen = options[index];
              if (chosen) selectOptionAndCleanUp(chosen);
            }}
          />
        );
      }}
    />
  );
}

export const slashCommandPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addComposerChild$]: () => <SlashCommandTypeahead />,
    });
  },
});
