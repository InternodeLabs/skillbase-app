/** Derive a display name: underscores → spaces, drop trailing "skill", title case. */
export function nameFromFilename(filename: string): string {
  const base =
    filename.replace(/\.(md|markdown|mdown|mkd)$/i, "").trim() || filename;
  const withSpaces = base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const withoutSkill =
    withSpaces.replace(/\bskill$/i, "").replace(/\s+/g, " ").trim() ||
    withSpaces;

  return withoutSkill
    .split(" ")
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function redactEmails(text: string): string {
  return text.replace(EMAIL_RE, "[email]");
}

export function isMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".mdown") ||
    name.endsWith(".mkd") ||
    file.type === "text/markdown" ||
    file.type === "text/x-markdown"
  );
}

/** During drag, infer whether the payload looks like Markdown. `null` = unknown. */
export function isMarkdownDataTransfer(dataTransfer: DataTransfer): boolean | null {
  const items = Array.from(dataTransfer.items).filter(
    (item) => item.kind === "file",
  );
  if (items.length === 0) return null;

  const file = items[0]?.getAsFile();
  if (file?.name) return isMarkdownFile(file);

  const type = items[0]?.type ?? "";
  if (type === "text/markdown" || type === "text/x-markdown") return true;
  if (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf" ||
    type === "application/zip" ||
    type === "application/json" ||
    type.startsWith("application/")
  ) {
    return false;
  }

  return null;
}

export function dataTransferHasFiles(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes("Files");
}
