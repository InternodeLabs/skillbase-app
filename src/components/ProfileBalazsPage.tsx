"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Check,
  ChevronDown,
  FilePlus,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { BrandHomeLink } from "@/components/Brand";
import { TabUnderlineSwitch } from "@/components/TabUnderlineSwitch";
import { UploadSkillButton } from "@/components/UploadSkillButton";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
  { id: "draft", label: "Draft" },
  { id: "synced", label: "Synced skills" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const WORKSPACES = [{ id: "balazsketyi", name: "@BalazsKetyi" }] as const;

type WorkspaceId = (typeof WORKSPACES)[number]["id"];

type SyncedSkill = {
  id: string;
  url: string;
};

type OwnedSkill = {
  id: string;
  name: string;
  visibility: Exclude<TabId, "synced">;
};

const EMPTY_COPY: Record<Exclude<TabId, "synced">, string> = {
  public:
    "No public skills yet. Upload your first .md file or follow someone else's shared skill.",
  private: "No private skills yet. Upload a Markdown file to get started.",
  draft: "No drafts yet.",
};

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  public:
    "All the skills that you are sharing publicly. Anyone who visit your page can see these",
  private: "Skills only you can see. Share them privately when you’re ready.",
  draft: "Work-in-progress skills that aren’t published yet.",
  synced:
    "Skills you’ve synced from a URL so you can keep them in this workspace.",
};

function labelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : parsed.hostname;
  } catch {
    return url;
  }
}

export function ProfileBalazsPage() {
  const [tab, setTab] = useState<TabId>("public");
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("balazsketyi");
  const [syncUrl, setSyncUrl] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedSkills, setSyncedSkills] = useState<SyncedSkill[]>([]);
  const [uploadedSkills, setUploadedSkills] = useState<OwnedSkill[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] =
    useState<SyncedSkill | null>(null);
  const workspace =
    WORKSPACES.find((item) => item.id === workspaceId) ?? WORKSPACES[0];
  const tabLabel = TABS.find((item) => item.id === tab)?.label ?? "Public";
  const pendingLabel = pendingDisconnect
    ? labelFromUrl(pendingDisconnect.url)
    : "";
  const hasUploadedSkill = uploadedSkills.length > 0;
  const skillsForTab =
    tab === "synced"
      ? []
      : uploadedSkills.filter((skill) => skill.visibility === tab);

  function trySyncUrl(): boolean {
    const url = syncUrl.trim();
    if (!url) {
      setSyncError("Enter a skill URL to sync.");
      return false;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("invalid protocol");
      }
    } catch {
      setSyncError("Enter a valid http(s) URL.");
      return false;
    }

    if (syncedSkills.some((skill) => skill.url === url)) {
      setSyncError("That skill is already synced.");
      return false;
    }

    setSyncedSkills((prev) => [{ id: crypto.randomUUID(), url }, ...prev]);
    setSyncUrl("");
    setSyncError(null);
    return true;
  }

  function handleSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trySyncUrl()) {
      setTab("synced");
    }
  }

  function openSyncDialog() {
    setSyncError(null);
    setSyncDialogOpen(true);
  }

  function openUploadSkill() {
    setUploadOpen(true);
  }

  return (
    <div className="profile-balazs profile-balazs-page flex min-h-dvh flex-col">
      <UploadSkillButton
        hideTrigger
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        initialUsername="balazsketyi"
        onUploaded={(skill) => {
          setUploadedSkills((prev) => [
            {
              id: skill.id,
              name: skill.name,
              visibility: "public",
            },
            ...prev,
          ]);
          setTab("public");
        }}
      />
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandHomeLink />
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <label className="relative hidden min-w-0 sm:block">
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Search skills…"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-56"
              />
            </label>
            <button
              type="button"
              onClick={openUploadSkill}
              className="btn-primary"
            >
              <FilePlus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Create skill
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="grid h-8 w-8 place-items-center rounded-full bg-skeleton text-xs font-semibold text-foreground transition hover:opacity-80 data-[state=open]:opacity-80"
                >
                  <User className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-44 rounded-md border border-border bg-surface p-1 text-foreground shadow-md"
                >
                  <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium text-muted">
                    @BalazsKetyi
                  </DropdownMenu.Label>
                  <form action="/api/auth/logout" method="post">
                    <DropdownMenu.Item asChild>
                      <button
                        type="submit"
                        className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none data-highlighted:bg-background"
                      >
                        <LogOut
                          className="h-4 w-4 shrink-0 text-muted"
                          aria-hidden
                        />
                        Log out
                      </button>
                    </DropdownMenu.Item>
                  </form>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-[var(--pb-border)] px-4 py-6 sm:px-6 md:w-72 md:border-b-0 md:border-r lg:w-80">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Switch workspace"
                className="inline-flex w-full min-w-0 items-center gap-1 rounded-md border border-[var(--pb-border)] bg-[var(--pb-white)] px-2.5 py-1.5 text-sm font-medium tracking-tight text-[var(--pb-ink)] transition hover:bg-[var(--pb-paper)] data-[state=open]:bg-[var(--pb-paper)]"
              >
                <span className="truncate">{workspace.name}</span>
                <ChevronDown
                  className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70"
                  aria-hidden
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className="profile-balazs z-50 min-w-52 rounded-md border border-[var(--pb-border)] bg-[var(--pb-white)] p-1 text-[var(--pb-ink)] shadow-md"
              >
                <DropdownMenu.Label className="px-3 py-1.5 text-xs font-medium text-[var(--pb-muted)]">
                  Workspaces
                </DropdownMenu.Label>
                {WORKSPACES.map((item) => {
                  const selected = item.id === workspaceId;
                  return (
                    <DropdownMenu.Item
                      key={item.id}
                      onSelect={() => setWorkspaceId(item.id)}
                      className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none data-highlighted:bg-[var(--pb-paper)]"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {item.name}
                      </span>
                      {selected ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : null}
                    </DropdownMenu.Item>
                  );
                })}
                <DropdownMenu.Separator className="my-1 h-px bg-[var(--pb-border)]" />
                <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm font-medium text-[var(--pb-ink)] outline-none data-highlighted:bg-[var(--pb-paper)]">
                  <Plus
                    className="h-4 w-4 shrink-0 text-primary"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  Create new workspace
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {!hasUploadedSkill ? (
            <>
              <h1 className="mt-6 text-sm font-semibold tracking-tight text-[var(--pb-ink)]">
                Upload your first skill
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--pb-muted)]">
                Upload your first skill to share it with others, or connect to
                an existing skill that someone else created.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={openUploadSkill}
                  className="btn-primary text-sm"
                >
                  Upload skill
                </button>
                <button
                  type="button"
                  onClick={openSyncDialog}
                  className="text-sm font-medium text-primary transition hover:text-orange-600 hover:underline"
                >
                  Sync a skill
                </button>
              </div>
            </>
          ) : null}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--pb-white)] px-4 py-6 sm:px-6">
          <TabUnderlineSwitch
            className="min-w-0"
            indicatorClassName="bg-[var(--pb-red)]"
            tabs={TABS}
            value={tab}
            onChange={setTab}
          />

          <div className="mt-6">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--pb-ink)]">
              {tabLabel}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--pb-muted)]">
              {TAB_DESCRIPTIONS[tab]}
            </p>
          </div>

          {tab === "synced" ? (
            <div className="flex flex-1 flex-col gap-6 px-0 py-6">
              <div className="mx-auto w-full max-w-xl rounded-[var(--pb-r-inner)] border border-[var(--pb-border)] bg-[var(--pb-paper)] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--pb-white)] text-[var(--pb-ink)]">
                    <Link2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-tight text-[var(--pb-ink)]">
                      Sync a skill from URL
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--pb-muted)]">
                      Paste a public skill link. It will show up in this list.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSync}
                  className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start"
                >
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Skill URL</span>
                    <input
                      type="url"
                      value={syncUrl}
                      onChange={(event) => {
                        setSyncUrl(event.target.value);
                        if (syncError) setSyncError(null);
                      }}
                      placeholder="https://skillbase.club/skills/…"
                      className="h-10 w-full rounded-md border border-[var(--pb-border)] bg-[var(--pb-white)] px-3 text-sm text-[var(--pb-ink)] placeholder:text-[var(--pb-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-blue)]/25"
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn-secondary h-10 shrink-0 gap-2 px-3.5 text-sm"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Sync
                  </button>
                </form>
                {syncError ? (
                  <p className="mt-2 text-sm text-[var(--pb-red)]" role="alert">
                    {syncError}
                  </p>
                ) : null}
              </div>

              {syncedSkills.length === 0 ? (
                <p className="text-center text-sm text-[var(--pb-muted)]">
                  No synced skills yet.
                </p>
              ) : (
                <ul className="mx-auto w-full max-w-xl divide-y divide-[var(--pb-border)] rounded-[var(--pb-r-inner)] border border-[var(--pb-border)] bg-[var(--pb-white)]">
                  {syncedSkills.map((skill) => (
                    <li
                      key={skill.id}
                      className="flex min-w-0 items-center gap-3 px-4 py-3"
                    >
                      <Link2
                        className="h-4 w-4 shrink-0 text-[var(--pb-muted)]"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--pb-ink)]">
                          {labelFromUrl(skill.url)}
                        </p>
                        <a
                          href={skill.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-xs text-[var(--pb-sky)] hover:underline"
                        >
                          {skill.url}
                        </a>
                      </div>
                      <button
                        type="button"
                        aria-label={`Disconnect ${labelFromUrl(skill.url)}`}
                        title="Disconnect skill"
                        onClick={() => setPendingDisconnect(skill)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--pb-muted)] transition hover:bg-[var(--pb-paper)] hover:text-[var(--pb-ink)]"
                      >
                        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : skillsForTab.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 py-20">
              <p
                className={cn(
                  "max-w-md text-center text-sm leading-relaxed text-[var(--pb-muted)]",
                )}
              >
                {EMPTY_COPY[tab]}
              </p>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--pb-border)] rounded-[var(--pb-r-inner)] border border-[var(--pb-border)] bg-[var(--pb-white)]">
              {skillsForTab.map((skill) => (
                <li
                  key={skill.id}
                  className="flex min-w-0 items-center gap-3 px-4 py-3"
                >
                  <FilePlus
                    className="h-4 w-4 shrink-0 text-[var(--pb-muted)]"
                    aria-hidden
                  />
                  <p className="truncate text-sm font-medium text-[var(--pb-ink)]">
                    {skill.name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>

      <Dialog.Root
        open={syncDialogOpen}
        onOpenChange={(open) => {
          setSyncDialogOpen(open);
          if (!open) setSyncError(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[#16161f]/40" />
          <Dialog.Content className="profile-balazs fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[var(--pb-border)] bg-[var(--pb-white)] shadow-xl focus:outline-none">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--pb-border)] px-5 py-4">
              <div>
                <Dialog.Title className="text-base font-semibold tracking-tight text-[var(--pb-ink)]">
                  Sync a skill
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[var(--pb-muted)]">
                  Paste a skill URL. It will appear under Synced skills.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--pb-muted)] transition hover:bg-[var(--pb-paper)] hover:text-[var(--pb-ink)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </Dialog.Close>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (trySyncUrl()) {
                  setSyncDialogOpen(false);
                  setTab("synced");
                }
              }}
              className="px-5 py-4"
            >
              <label className="block">
                <span className="text-sm font-medium text-[var(--pb-ink)]">
                  Skill URL
                </span>
                <input
                  type="url"
                  autoFocus
                  value={syncUrl}
                  onChange={(event) => {
                    setSyncUrl(event.target.value);
                    if (syncError) setSyncError(null);
                  }}
                  placeholder="https://skillbase.club/skills/…"
                  className="mt-1.5 h-10 w-full rounded-md border border-[var(--pb-border)] bg-[var(--pb-white)] px-3 text-sm text-[var(--pb-ink)] placeholder:text-[var(--pb-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-blue)]/25"
                />
              </label>
              {syncError ? (
                <p className="mt-2 text-sm text-[var(--pb-red)]" role="alert">
                  {syncError}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--pb-border)] bg-[var(--pb-white)] px-3 py-1.5 text-sm font-medium text-[var(--pb-ink)] transition hover:bg-[var(--pb-paper)]"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="rounded-md bg-[var(--pb-blue)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={pendingDisconnect !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDisconnect(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[#16161f]/40" />
          <Dialog.Content className="profile-balazs fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[var(--pb-border)] bg-[var(--pb-white)] shadow-xl focus:outline-none">
            <div className="px-5 py-4">
              <Dialog.Title className="text-base font-semibold tracking-tight text-[var(--pb-ink)]">
                Disconnect skill?
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-[var(--pb-muted)]">
                This removes{" "}
                <span className="font-medium text-[var(--pb-ink)]">
                  {pendingLabel}
                </span>{" "}
                from your synced skills. You can sync it again later from the
                URL.
              </Dialog.Description>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--pb-border)] bg-[var(--pb-paper)] px-5 py-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-[var(--pb-border)] bg-[var(--pb-white)] px-3 py-1.5 text-sm font-medium text-[var(--pb-ink)] transition hover:bg-[var(--pb-paper)]"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="rounded-md bg-[var(--pb-red)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
                onClick={() => {
                  if (!pendingDisconnect) return;
                  setSyncedSkills((prev) =>
                    prev.filter((item) => item.id !== pendingDisconnect.id),
                  );
                  setPendingDisconnect(null);
                }}
              >
                Disconnect
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
