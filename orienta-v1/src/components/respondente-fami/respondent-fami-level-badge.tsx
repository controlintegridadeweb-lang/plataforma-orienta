"use client";

import { statusPillBase } from "@/components/ui/status-pill";
import { LEVEL_META, levelMeta } from "@/lib/fami/respondent-presentation";

type Props = {
  level: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
};

export function RespondentFamiLevelBadge({
  level,
  size = "sm",
  showLabel = true,
  showIcon = false,
}: Props) {
  const meta = levelMeta(level);
  const Icon = meta.icon;
  const pad =
    size === "lg" ? "px-3 py-1.5" : size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const text =
    size === "lg" ? "text-sm" : size === "md" ? "text-xs" : "text-micro";
  return (
    <span
      className={`${statusPillBase} ${pad} ${text} ${meta.badgeClasses}`}
      title={meta.description}
    >
      {showIcon ? (
        <Icon className={size === "lg" ? "mr-1 h-4 w-4" : "mr-0.5 h-3 w-3"} aria-hidden />
      ) : null}
      {showLabel ? (
        <span>
          Nível {meta.level}
          {size !== "sm" ? ` · ${meta.shortLabel}` : ""}
        </span>
      ) : (
        <span>N{meta.level}</span>
      )}
    </span>
  );
}

export function RespondentFamiLevelLegend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.values(LEVEL_META).map((meta) => (
        <span
          key={meta.level}
          className={`${statusPillBase} px-2 py-0.5 text-2xs ${meta.badgeClasses}`}
          title={`${meta.description} · ${meta.range}`}
        >
          N{meta.level}
        </span>
      ))}
    </div>
  );
}
