"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { toast } from "sonner";

import { ClaimUsernameDialog } from "@/components/ClaimUsernameDialog";
import type { VersionHistoryEntry } from "@/components/VersionHistoryPanel";
import { composeSkillMarkdown } from "@/lib/skills/markdown";
import { skillBrowsePath } from "@/lib/skills/params";
import { buildSkillSharePath } from "@/lib/skills/share-access";
import type { Skill, SkillVisibility } from "@/lib/skills/types";

const AUTOSAVE_MS = 800;

type DraftStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type SkillOwner = {
  name: string | null;
  image: string | null;
  isViewer: boolean;
};

type SkillDetailContextValue = {
  skill: Skill;
  versions: VersionHistoryEntry[];
  selectedVersionNumber: number;
  isLatestVersion: boolean;
  liveVersionCount: number;
  loginHref: string;
  signedIn: boolean;
  canEdit: boolean;
  owner: SkillOwner | null;
  templateParams: Record<string, string>;

  skillId: string;
  editorRef: RefObject<MDXEditorMethods | null>;
  publishedMarkdown: string;
  showDraft: boolean;
  viewMarkdownSource: string;
  initialEditorMarkdown: string;

  editing: boolean;
  draft: string;
  setDraft: (value: string) => void;
  queueAutosave: (markdown: string) => void;
  draftStatus: DraftStatus;
  draftStatusLabel: string | null;
  publishVisibility: SkillVisibility;
  setPublishVisibility: (value: SkillVisibility) => void;
  publishing: boolean;
  updatingVisibility: boolean;
  forking: boolean;
  deleting: boolean;
  shareLockedVersion: boolean;
  setShareLockedVersion: (value: boolean) => void;
  currentVisibility: SkillVisibility;
  canDeleteCurrent: boolean;
  deletesWholeSkill: boolean;

  startEditing: () => void;
  stopEditing: () => Promise<void>;
  discardDraft: () => Promise<void>;
  publishVersion: () => Promise<void>;
  forkAndEdit: () => Promise<void>;
  toggleLatestVisibility: () => Promise<void>;
  copyShareLink: (forAgent: boolean) => Promise<void>;
  deleteCurrentVersion: () => Promise<void>;
};

const SkillDetailContext = createContext<SkillDetailContextValue | null>(null);

export function useSkillDetail(): SkillDetailContextValue {
  const value = useContext(SkillDetailContext);
  if (!value) {
    throw new Error("useSkillDetail must be used within SkillDetailProvider");
  }
  return value;
}

export function SkillDetailProvider({
  skill,
  versions,
  selectedVersionNumber,
  isLatestVersion,
  liveVersionCount,
  initialEditing = false,
  loginHref,
  signedIn,
  canEdit,
  owner = null,
  templateParams = {},
  initialUsername = null,
  children,
}: {
  skill: Skill;
  versions: VersionHistoryEntry[];
  selectedVersionNumber: number;
  isLatestVersion: boolean;
  liveVersionCount: number;
  initialEditing?: boolean;
  loginHref: string;
  signedIn: boolean;
  canEdit: boolean;
  owner?: SkillOwner | null;
  templateParams?: Record<string, string>;
  /** Null until the signed-in user claims a vanity URL. */
  initialUsername?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const editorRef = useRef<MDXEditorMethods>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef("");
  const [username, setUsername] = useState<string | null>(initialUsername);
  const [claimOpen, setClaimOpen] = useState(false);
  const pendingForkAfterClaim = useRef(false);

  const publishedMarkdown = useMemo(() => composeSkillMarkdown(skill), [skill]);
  const hasUnpublishedDraft = Boolean(skill.draftMarkdown?.trim());
  const showDraft = canEdit && isLatestVersion && hasUnpublishedDraft;
  const initialEditorMarkdown = showDraft
    ? (skill.draftMarkdown as string)
    : publishedMarkdown;
  const viewMarkdownSource = showDraft
    ? (skill.draftMarkdown as string)
    : publishedMarkdown;

  const currentVisibility: SkillVisibility = skill.visibility ?? "private";
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState(initialEditorMarkdown);
  const [publishVisibility, setPublishVisibility] =
    useState<SkillVisibility>(currentVisibility);
  const [publishing, setPublishing] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [forking, setForking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareLockedVersion, setShareLockedVersion] = useState(
    !isLatestVersion,
  );
  const [draftStatus, setDraftStatus] = useState<DraftStatus>(
    showDraft ? "saved" : "idle",
  );

  const versionKey = `${isLatestVersion}:${selectedVersionNumber}`;
  const [prevVersionKey, setPrevVersionKey] = useState(versionKey);
  if (versionKey !== prevVersionKey) {
    setPrevVersionKey(versionKey);
    setShareLockedVersion(!isLatestVersion);
  }

  const [prevVisibility, setPrevVisibility] = useState(currentVisibility);
  if (currentVisibility !== prevVisibility) {
    setPrevVisibility(currentVisibility);
    setPublishVisibility(currentVisibility);
  }

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!initialEditing) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("edit")) return;
    url.searchParams.delete("edit");
    const next = url.searchParams.toString();
    window.history.replaceState(
      null,
      "",
      next ? `${url.pathname}?${next}` : url.pathname,
    );
  }, [initialEditing]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  const persistDraft = useCallback(
    async (markdown: string) => {
      if (!canEdit) return;
      setDraftStatus("saving");
      try {
        const response = await fetch(`/api/skills/${skill.id}/draft`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Draft save failed.");
        }
        if (latestDraftRef.current === markdown) {
          setDraftStatus("saved");
        }
      } catch {
        setDraftStatus("error");
        toast.error(
          "Could not save draft. Your latest changes may be unsaved.",
        );
      }
    },
    [canEdit, skill.id],
  );

  const queueAutosave = useCallback(
    (markdown: string) => {
      if (!canEdit) return;
      setDraftStatus("dirty");
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void persistDraft(markdown);
      }, AUTOSAVE_MS);
    },
    [canEdit, persistDraft],
  );

  const startEditing = useCallback(() => {
    if (!isLatestVersion) {
      router.push(
        skillBrowsePath({
          skillId: skill.id,
          slug: skill.slug,
          ownerUsername: skill.ownerUsername ?? username,
        }),
      );
      return;
    }
    const next = skill.draftMarkdown?.trim()
      ? skill.draftMarkdown
      : publishedMarkdown;
    setDraft(next);
    setPublishVisibility(currentVisibility);
    setDraftStatus(skill.draftMarkdown?.trim() ? "saved" : "idle");
    setEditing(true);
  }, [
    currentVisibility,
    isLatestVersion,
    publishedMarkdown,
    router,
    skill.draftMarkdown,
    skill.id,
    skill.ownerUsername,
    skill.slug,
    username,
  ]);

  const performFork = useCallback(async () => {
    setForking(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber: selectedVersionNumber }),
      });
      const data = (await response.json()) as {
        skill?: {
          id: string;
          slug?: string;
          ownerUsername?: string | null;
        };
        error?: string;
        code?: string;
      };
      if (!response.ok || !data.skill?.id) {
        if (data.code === "USERNAME_REQUIRED") {
          pendingForkAfterClaim.current = true;
          setClaimOpen(true);
          setForking(false);
          return;
        }
        throw new Error(data.error || "Could not fork skill.");
      }
      toast.success("Forked — opened your new copy.");
      router.push(
        skillBrowsePath({
          skillId: data.skill.id,
          slug: data.skill.slug,
          ownerUsername: data.skill.ownerUsername ?? username,
          edit: true,
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not fork skill.",
      );
      setForking(false);
    }
  }, [router, selectedVersionNumber, skill.id, username]);

  const forkAndEdit = useCallback(async () => {
    if (forking) return;
    if (!username) {
      pendingForkAfterClaim.current = true;
      setClaimOpen(true);
      return;
    }
    await performFork();
  }, [forking, performFork, username]);

  const stopEditing = useCallback(async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    const markdown = editorRef.current?.getMarkdown() ?? draft;
    if (canEdit) {
      await persistDraft(markdown);
    }
    setEditing(false);
    router.refresh();
  }, [canEdit, draft, persistDraft, router]);

  const discardDraft = useCallback(async () => {
    if (!canEdit) return;
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    try {
      const response = await fetch(`/api/skills/${skill.id}/draft`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Could not discard draft.");
      }
      setDraft(publishedMarkdown);
      setDraftStatus("idle");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not discard draft.",
      );
    }
  }, [canEdit, publishedMarkdown, router, skill.id]);

  const toggleLatestVisibility = useCallback(async () => {
    if (!canEdit || !isLatestVersion || updatingVisibility) return;
    const next: SkillVisibility =
      currentVisibility === "public" ? "private" : "public";
    setUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not update visibility.");
      }
      toast.success(next === "public" ? "Made public." : "Made private.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update visibility.",
      );
    } finally {
      setUpdatingVisibility(false);
    }
  }, [
    canEdit,
    currentVisibility,
    isLatestVersion,
    router,
    skill.id,
    updatingVisibility,
  ]);

  const publishVersion = useCallback(async () => {
    const markdown = (editorRef.current?.getMarkdown() ?? draft).trim();
    if (!markdown) {
      toast.error("Markdown content can’t be empty.");
      return;
    }

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    setPublishing(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, visibility: publishVisibility }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error || "Could not publish version.");
        setPublishing(false);
        return;
      }

      toast.success(
        publishVisibility === "public"
          ? "Published as a public version."
          : "Published as a private version.",
      );
      setDraftStatus("idle");
      setEditing(false);
      setPublishing(false);
      router.refresh();
    } catch {
      toast.error("Could not publish version.");
      setPublishing(false);
    }
  }, [draft, publishVisibility, router, skill.id]);

  const draftStatusLabel =
    draftStatus === "saving" || draftStatus === "dirty"
      ? "Saving draft…"
      : draftStatus === "saved"
        ? "Draft saved"
        : draftStatus === "error"
          ? "Draft save failed"
          : null;

  const copyShareLink = useCallback(
    async (forAgent: boolean) => {
      const path = buildSkillSharePath({
        skillId: skill.id,
        visibility: currentVisibility,
        selectedVersionNumber,
        shareForAgent: forAgent,
        shareLockedVersion,
      });
      const url =
        typeof window === "undefined"
          ? path
          : new URL(path, window.location.origin).toString();
      try {
        await navigator.clipboard.writeText(url);
        const versionLabel = shareLockedVersion
          ? `version ${selectedVersionNumber}.0`
          : "latest version";
        toast.success(
          forAgent
            ? `Copied markdown link (${versionLabel}).`
            : `Copied page link (${versionLabel}).`,
        );
      } catch {
        toast.error("Could not copy link.");
      }
    },
    [
      currentVisibility,
      selectedVersionNumber,
      shareLockedVersion,
      skill.id,
    ],
  );

  const currentVersionEntry = versions.find(
    (version) => version.versionNumber === selectedVersionNumber,
  );
  const deletesWholeSkill = liveVersionCount <= 1;
  const canDeleteCurrent =
    canEdit &&
    Boolean(currentVersionEntry) &&
    !currentVersionEntry?.deleted &&
    !currentVersionEntry?.isForked;

  const deleteCurrentVersion = useCallback(async () => {
    if (deleting) return;
    if (
      deletesWholeSkill &&
      !window.confirm(
        "Delete this skill? This removes its only version and it will no longer appear in the library.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/versions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber: selectedVersionNumber }),
      });
      const data = (await response.json()) as {
        error?: string;
        redirectToVersionNumber?: number | null;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not delete version.");
      }

      const remainingLive = versions.filter(
        (version) =>
          !version.deleted && version.versionNumber !== selectedVersionNumber,
      );
      if (remainingLive.length === 0) {
        toast.success("Skill deleted");
        router.push("/");
        return;
      }

      const newLatest =
        remainingLive[remainingLive.length - 1]?.versionNumber ?? null;
      const redirectTo = data.redirectToVersionNumber;
      toast.success(`Version ${selectedVersionNumber}.0 deleted`);
      router.push(
        skillBrowsePath({
          skillId: skill.id,
          slug: skill.slug,
          ownerUsername: skill.ownerUsername ?? username,
          versionNumber: redirectTo ?? newLatest ?? undefined,
          latestVersionNumber: newLatest ?? undefined,
        }),
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete version.",
      );
      setDeleting(false);
    }
  }, [
    deleting,
    deletesWholeSkill,
    router,
    selectedVersionNumber,
    skill.id,
    skill.ownerUsername,
    skill.slug,
    username,
    versions,
  ]);

  const value = useMemo<SkillDetailContextValue>(
    () => ({
      skill,
      versions,
      selectedVersionNumber,
      isLatestVersion,
      liveVersionCount,
      loginHref,
      signedIn,
      canEdit,
      owner,
      templateParams,
      skillId: skill.id,
      editorRef,
      publishedMarkdown,
      showDraft,
      viewMarkdownSource,
      initialEditorMarkdown,
      editing,
      draft,
      setDraft,
      queueAutosave,
      draftStatus,
      draftStatusLabel,
      publishVisibility,
      setPublishVisibility,
      publishing,
      updatingVisibility,
      forking,
      deleting,
      shareLockedVersion,
      setShareLockedVersion,
      currentVisibility,
      canDeleteCurrent,
      deletesWholeSkill,
      startEditing,
      stopEditing,
      discardDraft,
      publishVersion,
      forkAndEdit,
      toggleLatestVisibility,
      copyShareLink,
      deleteCurrentVersion,
    }),
    [
      skill,
      versions,
      selectedVersionNumber,
      isLatestVersion,
      liveVersionCount,
      loginHref,
      signedIn,
      canEdit,
      owner,
      templateParams,
      publishedMarkdown,
      showDraft,
      viewMarkdownSource,
      initialEditorMarkdown,
      editing,
      draft,
      queueAutosave,
      draftStatus,
      draftStatusLabel,
      publishVisibility,
      publishing,
      updatingVisibility,
      forking,
      deleting,
      shareLockedVersion,
      currentVisibility,
      canDeleteCurrent,
      deletesWholeSkill,
      startEditing,
      stopEditing,
      discardDraft,
      publishVersion,
      forkAndEdit,
      toggleLatestVisibility,
      copyShareLink,
      deleteCurrentVersion,
    ],
  );

  return (
    <SkillDetailContext.Provider value={value}>
      {children}
      <ClaimUsernameDialog
        open={claimOpen}
        onOpenChange={(open) => {
          setClaimOpen(open);
          if (!open) pendingForkAfterClaim.current = false;
        }}
        onClaimed={(next) => {
          setUsername(next);
          router.refresh();
          if (pendingForkAfterClaim.current) {
            pendingForkAfterClaim.current = false;
            void performFork();
          }
        }}
      />
    </SkillDetailContext.Provider>
  );
}
