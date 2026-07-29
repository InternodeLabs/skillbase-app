"use client";

import { useEffect, useState } from "react";

import { BrandIcon } from "@/components/Brand";
import { loginApiHref } from "@/lib/auth/urls";

const DELAY_MS = 3000;

export function AuthenticatingClient({
  returnTo,
}: {
  returnTo?: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(DELAY_MS / 1000));

  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      const remaining = Math.max(0, DELAY_MS - (Date.now() - started));
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 250);

    const redirectTimer = window.setTimeout(() => {
      window.location.assign(loginApiHref(returnTo));
    }, DELAY_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(redirectTimer);
    };
  }, [returnTo]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <BrandIcon size={44} className="mx-auto mb-4 h-11 w-11" />
        <h1 className="text-lg font-semibold tracking-tight">Authenticating</h1>
        <p className="mt-2 text-sm text-muted">
          Checking for Internode credentials
          {secondsLeft > 1 ? "…" : ``}
        </p>
        <div
          className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-skeleton"
          aria-hidden
        >
          <div className="authenticating-bar h-full rounded-full bg-accent" />
        </div>
      </div>
    </main>
  );
}
