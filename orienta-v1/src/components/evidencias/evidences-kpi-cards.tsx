"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Files, Hourglass, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EvidenceStatsResult } from "@/lib/evidences/admin-service";
import { getEvidenceStats, type EvidenceStatsFilters } from "@/lib/evidences/client";
import { describeError, notify } from "@/lib/notify";
import { MetricCard, MetricCardSkeleton, type MetricCardVariant } from "@/components/ui/metric-card";

type Props = {
  filters: EvidenceStatsFilters;
  /** Incrementado para forcar novo fetch (botao Atualizar). */
  refreshSignal?: number;
};

export function EvidencesKpiCards({ filters, refreshSignal = 0 }: Props) {
  const [stats, setStats] = useState<EvidenceStatsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEvidenceStats(filters)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e: unknown) => {
        notify.error(describeError(e, "Falha ao carregar indicadores."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.formId, filters.organizationId, filters.search, filters.from, filters.to, refreshSignal]);

  if (loading && !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards: {
    key: string;
    label: string;
    value: number;
    variant: MetricCardVariant;
    icon: LucideIcon;
  }[] = [
    { key: "total", label: "Total", value: stats.total, variant: "neutral", icon: Files },
    { key: "em", label: "Em analise", value: stats.em_analise, variant: "warning", icon: Hourglass },
    { key: "ok", label: "Aprovadas", value: stats.aprovadas, variant: "success", icon: CheckCircle2 },
    { key: "bad", label: "Rejeitadas", value: stats.rejeitadas, variant: "danger", icon: XCircle },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <MetricCard
          key={c.key}
          variant={c.variant}
          label={c.label}
          value={c.value}
          icon={c.icon}
          density="compact"
        />
      ))}
    </div>
  );
}
