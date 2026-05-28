"use client";

import Link from "next/link";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import { ArrowRight, Eye, FileQuestion } from "lucide-react";
import type { RespondentEvidenceItem } from "@/lib/evidences/respondent-service";
import { normalizeWorkbenchText } from "@/lib/evidences/normalize-workbench-text";
import { formSurface } from "@/lib/layout/form-surface";

type Props = {
  items: RespondentEvidenceItem[];
  onOpenDetail: (item: RespondentEvidenceItem) => void;
};

/** Conteúdo da seção; título e descrição vêm do `PanelSection` no shell. */
export function RespondentComplementationRequests({ items, onOpenDetail }: Props) {
  if (items.length === 0) {
    return (
      <div className={formSurface.card}>
        <div className={formSurface.body}>
          <p className={`${formSurface.messageSuccess} border-dashed px-4 py-6 text-sm`}>
            Nenhuma complementação de evidência pendente. Continue acompanhando as validações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={formSurface.card}>
      <div className={formSurface.body}>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`${formSurface.entityListCard} border-l-3 border-l-amber-400`}
            >
              <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:pt-5">
                <div className="min-w-0 flex-1 space-y-2">
                  <p
                    className="line-clamp-2 text-micro leading-snug text-slate-500"
                    title={`${item.formName} v${item.formVersion} · ${item.questionPrompt}`}
                  >
                    {item.formName} v{item.formVersion} · {item.questionPrompt}
                  </p>
                  <h3 className="text-base font-semibold leading-snug text-slate-900">
                    {normalizeWorkbenchText(item.title)}
                  </h3>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 self-start sm:pt-0.5 ${formSurface.badge.base} ${formSurface.badge.warning}`}
                >
                  <FileQuestion className="h-3 w-3" aria-hidden />
                  {evidenceComplementation.statusShort}
                </span>
              </div>
              {item.lastJustification ? (
                <div className={`mx-4 mt-3 sm:mx-5 ${formSurface.messageWarning}`}>
                  <p className="text-micro font-semibold uppercase tracking-wider text-amber-900/80">
                    O que a equipe pediu
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-950">
                    {item.lastJustification}
                  </p>
                </div>
              ) : null}
              <div className="mt-4 border-t border-amber-100/80 bg-slate-50/50 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <dl className="space-y-0.5">
                    <dt className="text-micro font-medium uppercase tracking-wider text-slate-500">
                      Solicitada em
                    </dt>
                    <dd className="text-sm font-medium tabular-nums text-slate-800">
                      {item.lastComplementationAt
                        ? new Date(item.lastComplementationAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </dd>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item)}
                      className={formSurface.secondaryButtonSm}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      Ver detalhes
                    </button>
                    <Link
                      href={`/respondente/formularios/${item.formId}?questionId=${item.questionId}`}
                      className={formSurface.primaryButtonSm}
                    >
                      {evidenceComplementation.respondCta}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
