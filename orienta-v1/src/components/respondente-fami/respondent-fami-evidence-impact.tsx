"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Shield,
} from "lucide-react";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import { MetricCard } from "@/components/ui/metric-card";
import type { RespondentStatsResult } from "@/lib/evidences/respondent-service";
import { formSurface } from "@/lib/form-surface";

type Props = {
  stats: RespondentStatsResult | null;
  evidencesLink?: string;
};

function buildSummary(stats: RespondentStatsResult): string {
  const pendings = stats.aguardando + stats.complementacao;
  if (pendings === 0 && stats.reprovadas === 0) {
    return "Suas evidências estão em dia. A pontuação reflete o cenário atual.";
  }
  if (pendings > 0 && stats.reprovadas === 0) {
    return `${pendings} evidência(s) pendente(s) de validação podem alterar o resultado final.`;
  }
  if (stats.reprovadas > 0) {
    return `${stats.reprovadas} evidência(s) rejeitada(s) — substitua-as para preservar a maturidade.`;
  }
  return "Há ajustes pendentes nas evidências; revise para refletir o cenário real.";
}

export function RespondentFamiEvidenceImpact({
  stats,
  evidencesLink = "/respondente/evidencias-complementacoes",
}: Props) {
  if (!stats) {
    return (
      <section className={formSurface.empty.container}>
        <p className={formSurface.empty.description}>
          Estatísticas de evidências indisponíveis no momento.
        </p>
      </section>
    );
  }

  return (
    <section className={formSurface.card}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <Shield className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Impacto das evidências</p>
            <p className="text-xs leading-relaxed text-slate-600">{buildSummary(stats)}</p>
          </div>
        </div>
        <Link
          href={evidencesLink}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Abrir evidências
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>
      <ul className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <li className="flex min-h-0">
          <MetricCard
            className="h-full w-full"
            variant="success"
            density="compact"
            label="Aprovadas"
            value={stats.aprovadas}
            secondary="Contribuem para a maturidade"
            icon={CheckCircle2}
          />
        </li>
        <li className="flex min-h-0">
          <MetricCard
            className="h-full w-full"
            variant="warning"
            density="compact"
            label="Aguardando"
            value={stats.aguardando}
            secondary="Podem alterar o resultado"
            icon={Clock}
          />
        </li>
        <li className="flex min-h-0">
          <MetricCard
            className="h-full w-full"
            variant="info"
            density="compact"
            label={evidenceComplementation.statusShort}
            value={stats.complementacao}
            secondary="Aguardando reenvio"
            icon={AlertTriangle}
          />
        </li>
        <li className="flex min-h-0">
          <MetricCard
            className="h-full w-full"
            variant="danger"
            density="compact"
            label="Rejeitadas"
            value={stats.reprovadas}
            secondary="Substitua para preservar pontos"
            icon={AlertTriangle}
          />
        </li>
      </ul>
    </section>
  );
}
