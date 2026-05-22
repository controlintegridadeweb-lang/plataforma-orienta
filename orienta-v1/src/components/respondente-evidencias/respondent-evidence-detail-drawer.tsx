"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, FileText, Pencil, RefreshCw } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import type { RespondentEvidenceItem } from "@/lib/evidences/respondent-service";
import { respondentStatusNeedsAction } from "@/lib/evidences/respondent-status";
import { normalizeWorkbenchText } from "@/lib/evidences/normalize-workbench-text";
import { formSurface } from "@/lib/form-surface";
import { RespondentStatusBadge } from "./respondent-evidence-status-badge";
import { RespondentEvidenceTimeline } from "./respondent-evidence-timeline";

type Props = {
  open: boolean;
  item: RespondentEvidenceItem | null;
  onClose: () => void;
};

function actionFor(status: RespondentEvidenceItem["respondentStatus"]) {
  switch (status) {
    case "complementacao_solicitada":
      return { label: "Responder complementação", icon: ArrowRight };
    case "reprovada":
      return { label: "Reenviar evidência", icon: RefreshCw };
    case "aprovada":
      return null;
    default:
      return { label: "Editar envio", icon: Pencil };
  }
}

export function RespondentEvidenceDetailDrawer({ open, item, onClose }: Props) {
  if (!item) return null;
  const action = actionFor(item.respondentStatus);
  const formHref = `/respondente/formularios/${item.formId}?questionId=${item.questionId}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={normalizeWorkbenchText(item.title)}
      description={`${item.formName} · ${item.questionPrompt}`}
      footer={
        action ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={onClose} className={formSurface.secondaryButtonSm}>
              Fechar
            </button>
            <Link href={formHref} className={formSurface.primaryButtonSm}>
              {action.icon ? <action.icon className="h-3.5 w-3.5" aria-hidden /> : null}
              {action.label}
            </Link>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <RespondentStatusBadge status={item.respondentStatus} showDescription />
            {respondentStatusNeedsAction(item.respondentStatus) ? (
              <span className={`${formSurface.badge.base} ${formSurface.badge.warning}`}>
                Ação necessária
              </span>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <p className={formSurface.label}>Pergunta</p>
          <p className="text-sm text-slate-700">{item.questionPrompt}</p>
        </section>

        {item.description ? (
          <section className="space-y-2">
            <p className={formSurface.label}>Resposta enviada</p>
            <p className="text-sm text-slate-700">{normalizeWorkbenchText(item.description)}</p>
          </section>
        ) : null}

        <section className="space-y-2">
          <p className={formSurface.label}>Evidência</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {item.externalLink ? (
              <a
                href={item.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Abrir link enviado
              </a>
            ) : item.storagePath ? (
              <span className="inline-flex items-center gap-1 text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" aria-hidden />
                Arquivo: <span className="font-mono text-xs">{item.storagePath}</span>
              </span>
            ) : (
              <span className="text-sm text-slate-500">Sem anexo registrado.</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Tipo: {item.evidenceType} · Enviada em{" "}
            <time dateTime={item.submittedAt}>
              {new Date(item.submittedAt).toLocaleString("pt-BR")}
            </time>
          </p>
        </section>

        {item.lastJustification ? (
          <section className="space-y-2">
            <p className={formSurface.label}>Observação do analista</p>
            <p className={formSurface.messageNeutral}>{item.lastJustification}</p>
          </section>
        ) : null}

        <section className="space-y-2">
          <p className={formSurface.label}>Histórico</p>
          <RespondentEvidenceTimeline
            submittedAt={item.submittedAt}
            history={item.history}
          />
        </section>
      </div>
    </Drawer>
  );
}
