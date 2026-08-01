"use client";

import { startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { TabUnderlineSwitch } from "@/components/TabUnderlineSwitch";

const TABS = [
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
] as const;

export function SkillsFilterTabs({
  value,
  className,
}: {
  value: "public" | "private";
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <TabUnderlineSwitch
      className={className}
      tabs={TABS}
      value={value}
      onChange={(tab) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "public") params.delete("visibility");
        else params.set("visibility", tab);
        const qs = params.toString();
        startTransition(() => {
          router.replace(qs ? `/?${qs}` : "/");
        });
      }}
    />
  );
}
