"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState } from "react";

import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  normalizeUsername,
  validateUsername,
} from "@/lib/users/username";

export function ClaimUsernameDialog({
  open,
  onOpenChange,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: (username: string) => void;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = normalizeUsername(value);
  const localCheck = value.trim() ? validateUsername(value) : null;

  const reset = () => {
    setValue("");
    setError(null);
    setSubmitting(false);
  };

  const onSubmit = async () => {
    const validated = validateUsername(value);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: validated.username }),
      });
      const data = (await response.json()) as {
        profile?: { username: string };
        error?: string;
      };

      if (!response.ok || !data.profile?.username) {
        setError(data.error || "Could not claim that username.");
        setSubmitting(false);
        return;
      }

      reset();
      onOpenChange(false);
      onClaimed(data.profile.username);
    } catch {
      setError("Could not claim that username. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                Choose your URL
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Pick a username before you add a skill. This becomes your
                Skillbase address.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                disabled={submitting}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-background hover:text-foreground disabled:opacity-40"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div>
              <label
                htmlFor={inputId}
                className="text-xs font-medium tracking-wide text-muted uppercase"
              >
                Username
              </label>
              <div className="mt-1.5 flex items-center rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-accent/20">
                <span className="shrink-0 pl-3 text-sm text-muted select-none">
                  skillbase.club/
                </span>
                <input
                  id={inputId}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={USERNAME_MAX_LENGTH}
                  value={value}
                  disabled={submitting}
                  onChange={(event) => {
                    setValue(event.target.value);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void onSubmit();
                    }
                  }}
                  placeholder="your-name"
                  className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm text-foreground outline-none disabled:opacity-60"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters · letters,
                numbers, hyphens
              </p>
              {preview ? (
                <p className="mt-2 text-sm text-foreground">
                  Your URL:{" "}
                  <span className="font-medium">skillbase.club/{preview}</span>
                </p>
              ) : null}
            </div>

            {error || (localCheck && !localCheck.ok && value.trim()) ? (
              <p className="text-sm text-red-600" role="alert">
                {error ?? (localCheck && !localCheck.ok ? localCheck.error : null)}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={submitting}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-40"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={!value.trim() || submitting}
              onClick={() => void onSubmit()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Saving…" : "Continue"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
