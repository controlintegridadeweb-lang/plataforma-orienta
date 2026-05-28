"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Archive,
  CheckCircle,
  ChevronDown,
  Inbox,
  Link2,
  Pencil,
  Rocket,
  Trash2,
} from "lucide-react";
import { Spinner } from "@/components/ui/loading";
import { formSurface } from "@/lib/form-surface";
import type { FormSummary } from "@/lib/forms/admin-service";
import { formCycleComplementation } from "@/lib/labels/complementation-terms";
import {
  FormPublishPendingError,
  listForms,
  setFormArchived,
  deleteForm,
  publishForm,
} from "@/lib/forms/client";

const STATE_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Publicado",
  under_review: "Em revisao",
  complementation_requested: formCycleComplementation.stateShort,
  resubmitted: "Reenviado",
  consolidated: "Consolidado",
  closed: "Encerrado",
};

const STATE_BADGE_VARIANT: Record<string, keyof typeof formSurface.badge> = {
  draft: "neutral",
  submitted: "success",
  under_review: "warning",
  complementation_requested: "warning",
  resubmitted: "info",
  consolidated: "muted",
  closed: "neutral",
};

type FormsListProps = {
  /** Base para links Perguntas / Vinculos (ex. /admin/formularios). */
  formBasePath?: string;
  /** Exclusao definitiva: apenas admin na API. */
  showDelete?: boolean;
};

function FormStateBadge({ state }: { state: string }) {
  const variant = STATE_BADGE_VARIANT[state] ?? "neutral";
  return (
    <span className={`${formSurface.badge.base} ${formSurface.badge[variant]}`}>
      {STATE_LABELS[state] ?? state}
    </span>
  );
}

type RowActionsProps = {
  form: FormSummary;
  formBasePath: string;
  showDelete: boolean;
  busy: boolean;
  onArchive: (form: FormSummary) => void;
  onDelete: (form: FormSummary) => void;
  onLifecycle: (form: FormSummary, action: "publish" | "approve") => void;
};

function FormRowActions({
  form,
  formBasePath,
  showDelete,
  busy,
  onArchive,
  onDelete,
  onLifecycle,
}: RowActionsProps) {
  const archived = Boolean(form.archivedAt);
  const canPublish =
    (form.state === "draft" || form.state === "under_review") && !archived;
  const canDelete = form.state === "draft" && showDelete;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`${formBasePath}/${form.id}/perguntas`}
        className={formSurface.primaryButtonSm}
      >
        Abrir perguntas
      </Link>

      <details className="relative">
        <summary
          className={`${formSurface.secondaryButtonSm} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
        >
          Mais
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </summary>
        <div
          className="absolute right-0 z-20 mt-1.5 min-w-50 rounded-lg border border-slate-200 bg-white py-1 text-left text-sm shadow-lg"
          role="menu"
        >
          <Link
            href={`${formBasePath}/${form.id}/vinculos`}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            <Link2 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            Vínculos
          </Link>
          <Link
            href={`${formBasePath}/${form.id}/configuracao`}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            Editar
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => onArchive(form)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Archive className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            {archived ? "Desarquivar" : "Arquivar"}
          </button>
          {canPublish ? (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() =>
                onLifecycle(form, form.state === "under_review" ? "approve" : "publish")
              }
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-brand-700 transition hover:bg-brand-50/80 disabled:opacity-50"
            >
              {form.state === "under_review" ? (
                <CheckCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              ) : (
                <Rocket className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              )}
              {form.state === "under_review" ? "Aprovar" : "Publicar"}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => onDelete(form)}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              Excluir
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function FormsList({ formBasePath = "/admin/formularios", showDelete = true }: FormsListProps) {
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<{
    formId: string;
    formName: string;
    pendingCount: number;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setForms(null);
    listForms({ includeArchived })
      .then((data) => {
        if (!cancelled) setForms(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [includeArchived]);

  async function handleArchive(form: FormSummary) {
    const target = !form.archivedAt;
    const verb = target ? "arquivar" : "desarquivar";
    if (!confirm(`Deseja ${verb} "${form.name}"?`)) return;
    setBusyId(form.id);
    setError(null);
    try {
      const updated = await setFormArchived(form.id, target);
      setForms((prev) =>
        (prev ?? []).map((f) => (f.id === form.id ? updated : f)),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Falha ao ${verb}.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(form: FormSummary) {
    if (
      !confirm(
        `Excluir "${form.name}" definitivamente? Isso remove o formulario e todas as perguntas exclusivas dele.`,
      )
    )
      return;
    setBusyId(form.id);
    setError(null);
    try {
      await deleteForm(form.id);
      setForms((prev) => (prev ?? []).filter((f) => f.id !== form.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLifecycleAction(
    form: FormSummary,
    action: "publish" | "approve",
  ) {
    const verb = action === "approve" ? "aprovar" : "publicar";
    const confirmMessage =
      action === "publish"
        ? `Deseja publicar "${form.name}"?\n\nO formulário ficará visível para todas as organizações cadastradas. Isso não preenche respostas — cada órgão finaliza o envio na área do respondente.`
        : `Deseja ${verb} "${form.name}" agora?`;
    if (!confirm(confirmMessage)) return;
    setBusyId(form.id);
    setError(null);
    setPendingNotice(null);
    try {
      const updated = await publishForm(form.id, action);
      setForms((prev) =>
        (prev ?? []).map((f) =>
          f.id === form.id ? { ...f, ...updated, questionCount: f.questionCount } : f,
        ),
      );
    } catch (e: unknown) {
      if (e instanceof FormPublishPendingError) {
        setPendingNotice({
          formId: form.id,
          formName: form.name,
          pendingCount: e.pending.length,
        });
      } else {
        setError(e instanceof Error ? e.message : `Falha ao ${verb}.`);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {forms === null
            ? "Carregando modelos…"
            : forms.length === 0
              ? "Nenhum modelo cadastrado"
              : `${forms.length} modelo${forms.length === 1 ? "" : "s"} no escopo`}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-slate-200 text-brand focus:ring-brand/30"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Mostrar arquivados
        </label>
      </div>

      {error ? <div className={formSurface.messageError}>{error}</div> : null}

      {pendingNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                Não foi possível publicar &ldquo;{pendingNotice.formName}&rdquo;.
              </p>
              <p className="mt-1 text-sm">
                {pendingNotice.pendingCount === 1
                  ? "1 pergunta está sem vínculo completo."
                  : `${pendingNotice.pendingCount} perguntas estão sem vínculo completo.`}{" "}
                Abra os Vínculos do formulário e preencha os cenários obrigatórios
                (Sim/Não e FAMI quando exige evidência) para liberar a publicação.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`${formBasePath}/${pendingNotice.formId}/vinculos`}
                className={formSurface.secondaryButtonSm}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                Abrir vínculos
              </Link>
              <button
                type="button"
                onClick={() => setPendingNotice(null)}
                className={formSurface.ghostButton}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {forms === null ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/40 px-6 py-10 text-center">
          <Spinner size="xl" className="text-brand" />
          <p className="text-sm font-medium text-slate-700">Carregando formulários…</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/40 px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
            <Inbox className="h-5 w-5 text-slate-400" aria-hidden />
          </span>
          <p className="text-sm font-medium text-slate-900">Nenhum formulário cadastrado</p>
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">
            Crie um novo formulário pelo botão no topo da página.
          </p>
        </div>
      ) : (
        <div className={formSurface.table.wrapper}>
          <table className={`${formSurface.table.table} min-w-190`}>
            <thead className={formSurface.table.head}>
              <tr>
                <th className={`${formSurface.table.headCell} py-3`}>Nome</th>
                <th className={`${formSurface.table.headCell} py-3`}>Versão</th>
                <th className={`${formSurface.table.headCell} py-3`}>Estado</th>
                <th className={`${formSurface.table.headCell} py-3 tabular-nums`}>Perguntas</th>
                <th className={`${formSurface.table.headCell} py-3`}>Criado em</th>
                <th className={`${formSurface.table.headCell} py-3 text-right`}>Ações</th>
              </tr>
            </thead>
            <tbody className={formSurface.table.body}>
              {forms.map((form) => {
                const archived = Boolean(form.archivedAt);
                const busy = busyId === form.id;

                return (
                  <tr
                    key={form.id}
                    className={`${formSurface.table.row} ${archived ? "bg-slate-50/50" : ""}`}
                  >
                    <td className={`${formSurface.table.cell} align-middle`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{form.name}</span>
                        {archived ? (
                          <span className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}>
                            Arquivado
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={`${formSurface.table.cellMuted} align-middle tabular-nums`}>
                      v{form.version}
                    </td>
                    <td className={`${formSurface.table.cell} align-middle`}>
                      <FormStateBadge state={form.state} />
                    </td>
                    <td className={`${formSurface.table.cellMuted} align-middle tabular-nums`}>
                      {form.questionCount}
                    </td>
                    <td className={`${formSurface.table.cellMuted} align-middle whitespace-nowrap`}>
                      {new Date(form.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className={`${formSurface.table.cell} align-middle text-right`}>
                      <FormRowActions
                        form={form}
                        formBasePath={formBasePath}
                        showDelete={showDelete}
                        busy={busy}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onLifecycle={handleLifecycleAction}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
