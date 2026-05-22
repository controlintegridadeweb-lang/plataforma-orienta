import type { LucideIcon } from "lucide-react";
import { MetricCard, type MetricCardVariant } from "@/components/ui/metric-card";

type Tone = "emerald" | "amber" | "blue" | "rose" | "slate";

const TONE_VARIANT: Record<Tone, MetricCardVariant> = {
  emerald: "success",
  amber: "warning",
  blue: "info",
  rose: "danger",
  slate: "neutral",
};

/** Alias de `MetricCard` com `tone` legado (dashboards existentes). */
export function KpiCard({
  label,
  value,
  icon,
  tone = "emerald",
  hint,
  status = "neutral",
  statusLabel,
  href,
  ctaLabel,
  valueClassName,
  title,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  status?: "ok" | "attention" | "critical" | "neutral";
  statusLabel?: string;
  href?: string;
  ctaLabel?: string;
  valueClassName?: string;
  title?: string;
}) {
  return (
    <MetricCard
      variant={TONE_VARIANT[tone]}
      label={label}
      value={value}
      secondary={hint}
      icon={icon}
      status={status}
      statusLabel={statusLabel}
      href={href}
      ctaLabel={ctaLabel}
      valueClassName={valueClassName}
      htmlTitle={title}
    />
  );
}
