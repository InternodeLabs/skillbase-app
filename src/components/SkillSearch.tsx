"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useEffectEvent } from "react";

const DEBOUNCE_MS = 250;

export function SkillSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const commitQuery = useEffectEvent((next: string) => {
    const q = next.trim();
    const current = (searchParams.get("q") ?? "").trim();
    if (q === current && (q === "" || pathname === "/")) return;

    if (pathname !== "/") {
      router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      commitQuery(value);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <label className="relative min-w-0 flex-1 sm:flex-none">
      <span className="sr-only">Search skills</span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitQuery(value);
          }
        }}
        placeholder="Search skills…"
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-56"
      />
    </label>
  );
}
