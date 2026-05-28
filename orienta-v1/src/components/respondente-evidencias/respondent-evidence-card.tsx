"use client";

import Link from "next/link";
import { ArrowRight, Calendar, ExternalLink, FileText, Pencil, RefreshCw } from "lucide-react";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import type { RespondentEvidenceItem } from "@/lib/evidences/respondent-service";
import { respondentStatusNeedsAction } from "@/lib/evidences/respondent-status";
import { normalizeWorkbenchText } from "@/lib/evidences/normalize-workbench-text";
import { formSurface } from "@/lib/form-surface";
import { RespondentStatusBadge } from "./respondent-evidence-status-badge";

type Props = {
  item: RespondentEvidenceItem;
  onOpenDetail: (item: RespondentEvidenceItem) => void;
};

function buildFormHref(item: RespondentEvidenceItem): string {
  return `/respondente/formularios/${item.formId}?questionId=${item.questionId}`;
}

/**
 * Acoes contextuais por status. Sempre teremos "Ver detalhes"; as demais
 * dependem do status atual e nao aparecem fora de contexto.
 */
function actionsFor(status: RespondentEvidenceItem["respondentStatus"]) {
  switch (status) {
    case "complementacao_solicitada":
      return { primaryLabel: evidenceComplementation.respondCta, primaryIcon: ArrowRight };
    case "reprovada":
      return { primaryLabel: "Reenviar evidência", primaryIcon: RefreshCw };
    case "aprovada":
      return { primaryLabel: null, primaryIcon: null };
    case "ajustada_e_reenviada":
    case "aguardando_analise":
    case "enviada":
    default:
      return { primaryLabel: "Editar envio", primaryIcon: Pencil };
  }
}

function formatSubmittedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function RespondentEvidenceCard({ item, onOpenDetail }: Props) {
  const needsAction = respondentStatusNeedsAction(item.respondentStatus);
  const actions = actionsFor(item.respondentStatus);
  const formHref = buildFormHref(item);

  const contextLine = `${item.formName} v${item.formVersion} · ${item.questionPrompt}`;

  return (
    <article
      className={`group ${formSurface.entityListCard} ${
        needsAction ? "border-l-3 border-l-amber-400" : ""
      }`}
    >
      <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:pt-5">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="line-clamp-2 text-micro leading-snug text-slate-500" title={contextLine}>
            {contextLine}
          </p>
          <h4 className="text-base font-semibold leading-snug text-slate-900">
            {normalizeWorkbenchText(item.title)}
          </h4>
          {item.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
              {normalizeWorkbenchText(item.description)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 sm:pt-0.5">
          <RespondentStatusBadge status={item.respondentStatus} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 bg-slate-50/60 px-4 py-3.5 sm:px-5">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-0.5">
            <dt className="text-micro font-medium uppercase tracking-wider text-slate-500">
              Enviada
            </dt>
            <dd className="flex items-center gap-1.5 text-sm tabular-nums text-slate-800">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              {formatSubmittedDate(item.submittedAt)}
            </dd>
          </div>
          {item.lastValidatedAt ? (
            <div className="space-y-0.5">
              <dt className="text-micro font-medium uppercase tracking-wider text-slate-500">
                Última atualização
              </dt>
              <dd className="flex items-center gap-1.5 text-sm tabular-nums text-slate-800">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                {formatSubmittedDate(item.lastValidatedAt)}
              </dd>
            </div>
          ) : null}
          {item.externalLink ? (
            <div className="space-y-0.5 sm:col-span-2 lg:col-span-1">
              <dt className="text-micro font-medium uppercase tracking-wider text-slate-500">
                Anexo
              </dt>
              <dd>
                <a
                  href={item.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Link enviado
                </a>
              </dd>
            </div>
          ) : item.storagePath ? (
            <div className="space-y-0.5 sm:col-span-2 lg:col-span-1">
              <dt className="text-micro font-medium uppercase tracking-wider text-slate-500">
                Anexo
              </dt>
              <dd className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                Arquivo enviado
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {item.lastJustification ? (
        <div className="mt-3 px-4 sm:px-5">
          <div
            className={`rounded-lg border px-3 py-2.5 ${
              item.respondentStatus === "complementacao_solicitada"
                ? "border-amber-200/80 bg-amber-50/60"
                : item.respondentStatus === "reprovada"
                  ? "border-rose-200 bg-rose-50/60"
                  : "border-slate-200 bg-slate-50/90"
            }`}
          >
            <p className="text-micro font-semibold uppercase tracking-wider text-slate-600">
              Observação da validação
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{item.lastJustification}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          className={formSurface.secondaryButtonSm}
        >
          Ver detalhes
        </button>
        {actions.primaryLabel ? (
          <Link href={formHref} className={formSurface.primaryButtonSm}>
            {actions.primaryIcon ? (
              <actions.primaryIcon className="h-3.5 w-3.5" aria-hidden />
            ) : null}
            {actions.primaryLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
