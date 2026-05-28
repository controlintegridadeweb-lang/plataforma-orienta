"use client";

import Link from "next/link";
import { ExternalLink, FileText, ListFilter } from "lucide-react";
import type { EvidenceListItem, EvidenceValidationEntry } from "@/lib/evidences/admin-service";
import { adminEvidenceQueueHref } from "@/lib/admin/queue-links";
import { normalizeWorkbenchText } from "@/lib/evidences/normalize-workbench-text";
import { formSurface } from "@/lib/form-surface";
import { Drawer } from "@/components/ui/drawer";
import { EvidenceHistory } from "./evidence-history";
import { EvidenceValidatePanel } from "./evidence-validate-panel";
import { StatusBadge } from "./status-badge";

type Props = {
  item: EvidenceListItem | null;
  open: boolean;
  onClose: () => void;
  onValidated: (evidenceId: string, entry: EvidenceValidationEntry) => void;
  formsAreaPrefix: "admin";
};

export function EvidenceDetailDrawer({
  item,
  open,
  onClose,
  onValidated,
  formsAreaPrefix,
}: Props) {
  if (!item) return null;

  const formLink = `/${formsAreaPrefix}/formularios/${item.formId}/perguntas?questionId=${item.questionId}`;
  const queueLink = adminEvidenceQueueHref({
    organizationId: item.organizationId,
    formId: item.formId,
    status: item.currentStatus,
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={normalizeWorkbenchText(item.title)}
      description={`${item.organizationName} · ${item.formName}`}
    >
      <div className="space-y-5">
        <section className={`${formSurface.nestedCard} space-y-4`}>
          <header>
            <p className={formSurface.label}>Contexto</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={item.currentStatus} />
              {item.requiresEvidence ? (
                <span className={`${formSurface.badge.base} ${formSurface.badge.info}`}>
                  Exige evidência
                </span>
              ) : null}
            </div>
          </header>
          <div className={formSurface.fieldGroup}>
            <p className={formSurface.label}>Pergunta</p>
            <p className="text-sm leading-relaxed text-slate-700">{item.questionPrompt}</p>
          </div>
          {item.lastJustification ? (
            <div className={formSurface.fieldGroup}>
              <p className={formSurface.label}>Última justificativa</p>
              <p className={formSurface.messageNeutral}>{item.lastJustification}</p>
            </div>
          ) : null}
        </section>

        <section className={`${formSurface.nestedCard} space-y-4`}>
          <p className={formSurface.label}>Conteúdo</p>
          <dl className="space-y-4 text-sm">
            <div className={formSurface.fieldGroup}>
              <dt className={formSurface.label}>Texto ou descrição</dt>
              <dd className="text-slate-700">
                {item.description ? (
                  normalizeWorkbenchText(item.description)
                ) : (
                  <span className="text-slate-500">Sem descrição adicional.</span>
                )}
              </dd>
            </div>
            {item.externalLink ? (
              <div className={formSurface.fieldGroup}>
                <dt className={formSurface.label}>Link externo</dt>
                <dd>
                  <a
                    href={item.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-sky-700 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                    Abrir link externo
                  </a>
                </dd>
              </div>
            ) : null}
            {item.storagePath ? (
              <div className={formSurface.fieldGroup}>
                <dt className={formSurface.label}>Arquivo no storage</dt>
                <dd className="inline-flex flex-wrap items-center gap-1.5 text-slate-700">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="font-mono text-xs">{item.storagePath}</span>
                </dd>
              </div>
            ) : null}
            {item.exceptionReason ? (
              <div className={formSurface.fieldGroup}>
                <dt className={formSurface.label}>Motivo da exceção</dt>
                <dd className="text-slate-700">{normalizeWorkbenchText(item.exceptionReason)}</dd>
              </div>
            ) : null}
            <div className={formSurface.fieldGroup}>
              <dt className={formSurface.label}>Envio</dt>
              <dd className="text-xs text-slate-500">
                Enviada em{" "}
                <time dateTime={item.submittedAt}>
                  {new Date(item.submittedAt).toLocaleString("pt-BR")}
                </time>{" "}
                · por {item.submittedBy}
              </dd>
            </div>
          </dl>
        </section>

        <section className={`${formSurface.nestedCard} space-y-4`}>
          <p className={formSurface.label}>Validação</p>
          <EvidenceValidatePanel
            evidenceId={item.id}
            onValidated={(entry) => onValidated(item.id, entry)}
          />
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className={formSurface.label}>Atalhos</p>
            <Link
              href={queueLink}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
              Ver na fila (mesma organização e formulário)
            </Link>
            <Link
              href={formLink}
              className="block text-sm font-semibold text-brand-700 hover:underline"
            >
              Abrir pergunta no formulário
            </Link>
          </div>
        </section>

        <section className="space-y-2">
          <p className={formSurface.label}>Histórico</p>
          <EvidenceHistory history={item.history} />
        </section>
      </div>
    </Drawer>
  );
}
