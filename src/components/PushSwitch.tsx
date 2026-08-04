export function PushSwitch({
  checked,
  onCheckedChange,
  title,
  description = "",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded px-1 py-1.5 text-left outline-none"
    >
      <span>
        <span className="block text-sm text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-md transition ${
          checked ? "bg-accent" : "bg-skeleton"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-sm bg-surface transition ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
