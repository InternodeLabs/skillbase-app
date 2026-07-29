"use client";

import { useState } from "react";

import type { SkillScenario } from "@/lib/skills/data";

export function ScenarioPreview({ scenarios }: { scenarios: SkillScenario[] }) {
  const [selected, setSelected] = useState(scenarios[0]?.id ?? "");

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Scenario:</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-6 w-6 rounded border border-border" />
          <span className="h-6 w-6 rounded border border-border" />
        </div>
      </div>

      {/* Skeleton preview — placeholder for the rendered scenario output. */}
      <div className="flex-1 space-y-4 p-5" aria-hidden>
        <div className="h-6 w-2/3 rounded skeleton" />
        <div className="h-3 w-full rounded skeleton" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-md bg-accent/90" />
          <div className="h-8 w-20 rounded-md border border-border" />
        </div>

        <div className="flex aspect-16/7 items-center justify-center rounded-lg bg-skeleton text-xs text-muted">
          Image placeholder
        </div>

        <div className="h-3 w-24 rounded skeleton" />

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="h-5 w-5 rounded skeleton" />
              <div className="h-3 w-full rounded skeleton" />
              <div className="h-3 w-2/3 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
