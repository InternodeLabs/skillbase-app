"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type TabUnderlineOption<T extends string = string> = {
  id: T;
  label: string;
};

export function TabUnderlineSwitch<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly TabUnderlineOption<T>[];
  value: T;
  onChange?: (tab: T) => void;
  className?: string;
}) {
  const [active, setActive] = useState<T>(value);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    setActive(value);
  }, [value]);

  useEffect(() => {
    const update = () => {
      const el = tabRefs.current.get(active);
      const list = listRef.current;
      if (!el || !list) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active, tabs]);

  function select(tab: T) {
    setActive(tab);
    onChange?.(tab);
  }

  return (
    <div className={cn("relative", className)} ref={listRef}>
      <div className="flex items-center gap-5" role="tablist">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              ref={(node) => {
                if (node) tabRefs.current.set(tab.id, node);
                else tabRefs.current.delete(tab.id);
              }}
              onClick={() => select(tab.id)}
              className={cn(
                "pb-2.5 text-sm transition-colors",
                selected
                  ? "font-medium text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden />
      <div
        className="absolute bottom-0 h-0.5 bg-foreground transition-[left,width] duration-200 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden
      />
    </div>
  );
}
