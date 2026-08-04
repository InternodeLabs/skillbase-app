"use client";

import { useId, useState } from "react";

import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  normalizeUsername,
  validateUsername,
} from "@/lib/users/username";

export function ClaimUsernameForm({
  onClaimed,
  submitLabel = "Continue",
  description = "Pick a username. This becomes your public Skillbase address.",
}: {
  onClaimed: (username: string) => void;
  submitLabel?: string;
  description?: string;
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = normalizeUsername(value);
  const localCheck = value.trim() ? validateUsername(value) : null;

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

      onClaimed(data.profile.username);
    } catch {
      setError("Could not claim that username. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {description ? <p className="text-sm text-muted">{description}</p> : null}

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

      <button
        type="button"
        disabled={!value.trim() || submitting}
        onClick={() => void onSubmit()}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
