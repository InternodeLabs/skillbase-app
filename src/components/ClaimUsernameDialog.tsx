"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { ClaimUsernameForm } from "@/components/ClaimUsernameForm";

export function ClaimUsernameDialog({
  open,
  onOpenChange,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: (username: string) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-5 py-4">
            <ClaimUsernameForm
              description=""
              onClaimed={(username) => {
                onOpenChange(false);
                onClaimed(username);
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
