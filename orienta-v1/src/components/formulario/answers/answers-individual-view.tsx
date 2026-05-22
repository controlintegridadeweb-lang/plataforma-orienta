"use client";

import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  Inbox,
  Users,
} from "lucide-react";
import type {
  AnswerValue,
  RespondentAnswerCell,
  RespondentDetail,
} from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/form-surface";
import { AnswersStatusBadge } from "./answers-status-badge";

const ANSWER_LABEL: Record<AnswerValue, string> = {
  yes: "Sim",
  no: "Nao",
  partial: "Parcial",
};

const ANSWER_BADGE: Record<AnswerValue, string> = {
  yes: `${formSurface.badge.base} ${formSurface.badge.success}`,
  no: `${formSurface.badge.base} ${formSurface.badge.danger}`,
  partial: `${formSurface.badge.base} ${formSurface.badge.warning}`,
};

const VALIDATION_LABEL: Record<string, string> = {
  valid: "Validada",
  invalid: "Invalida",
  partially_valid: "Parcialmente valida",
  pending: "Pendente",
  complementation_requested: "Em complementacao",
  waived: "Dispensada",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AnswerBadge({ value }: { value: AnswerValue | null }) {
  if (!value) {
    return (
      <span className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}>
        Sem resposta
      </span>
    );
  }
  return <span className={ANSWER_BADGE[value]}>{ANSWER_LABEL[value]}</span>;
}

function WaiverBadge({ cell }: { cell: RespondentAnswerCell }) {
  if (cell.isWaived) {
    return (
      <span
        className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}
        title={cell.waiverReason ?? "Dispensada para o orgao"}
      >
        Dispensada para o orgao
      </span>
    );
  }
  if (cell.isNotApplicable) {
    return (
      <span className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}>
        Nao se aplica
      </span>
    );
  }
  return null;
}

function NotApplicableHint({ cell }: { cell: RespondentAnswerCell }) {
  if (cell.isWaived || cell.isNotApplicable) return null;
  if (cell.answer !== "no" || !cell.hasNotApplicableScenario) return null;
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Esta pergunta tem cenário &quot;Não se aplica&quot;. Se a resposta
      &quot;Não&quot; reflete uma exceção institucional, configure a dispensa na
      aba Vínculos ou oriente o respondente a marcar &quot;Não se aplica&quot; no
      preenchimento.
    </p>
  );
}

function AnswerCellView({ cell }: { cell: RespondentAnswerCell }) {
  const isText = cell.answerType === "text";
  return (
    <article className={`${formSurface.nestedCardWithHeader}`}>
      <header className={`${formSurface.cardHeader} space-y-1`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-100 px-1.5 text-xs font-semibold text-brand-800">
            {cell.orderIndex + 1}
          </span>
          {!isText ? <AnswerBadge value={cell.answer} /> : null}
          <WaiverBadge cell={cell} />
          {cell.updatedAt ? (
            <span className="ml-auto text-xs text-slate-500">
              {formatDate(cell.updatedAt)}
            </span>
          ) : null}
        </div>
        <h3 className={`${formSurface.cardTitle} leading-snug`}>{cell.prompt}</h3>
      </header>
      <div className="space-y-3 px-5 py-4 sm:px-6">
        <NotApplicableHint cell={cell} />
        {isText ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resposta
            </p>
            {cell.notes && cell.notes.trim().length > 0 ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {cell.notes}
              </p>
            ) : (
              <p className="mt-1 text-sm italic text-slate-500">
                {cell.answer
                  ? "Sem texto adicional."
                  : "Esta pergunta nao foi respondida."}
              </p>
            )}
          </div>
        ) : cell.notes && cell.notes.trim().length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observacoes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {cell.notes}
            </p>
          </div>
        ) : null}

        {cell.evidence ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start gap-2">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {cell.evidence.title}
                </p>
                {cell.evidence.description ? (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {cell.evidence.description}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {cell.evidence.validationStatus ? (
                    <span
                      className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}
                    >
                      {VALIDATION_LABEL[cell.evidence.validationStatus] ??
                        cell.evidence.validationStatus}
                    </span>
                  ) : null}
                  {cell.evidence.externalLink ? (
                    <a
                      href={cell.evidence.externalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                    >
                      Abrir link
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {cell.createdByName ? (
          <p className="text-xs text-slate-500">
            Preenchido por <span className="font-medium">{cell.createdByName}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

type Props = {
  detail: RespondentDetail;
  position: { current: number; total: number };
  onBack: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
};

export function AnswersIndividualView({
  detail,
  position,
  onBack,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className={`${formSurface.ghostButton} text-brand-700`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar para a lista
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 tabular-nums">
            {position.current} / {position.total}
          </span>
          <button
            type="button"
            onClick={onPrev ?? undefined}
            disabled={!onPrev}
            aria-label="Resposta anterior"
            className={`${formSurface.secondaryButtonSm} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Anterior
          </button>
          <button
            type="button"
            onClick={onNext ?? undefined}
            disabled={!onNext}
            aria-label="Proxima resposta"
            className={`${formSurface.secondaryButtonSm} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Proxima
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <article className={formSurface.nestedCardWithHeader}>
        <header className={`${formSurface.cardHeader} space-y-2`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={formSurface.cardTitle}>
              {detail.organizationName || "Orgao sem nome"}
            </h2>
            <AnswersStatusBadge status={detail.status} />
          </div>
          <p className={formSurface.cardDescription}>
            {detail.answeredQuestions} de {detail.applicableQuestions} perguntas
            aplicaveis respondidas
            {detail.waivedQuestions > 0
              ? ` (${detail.waivedQuestions} dispensada${detail.waivedQuestions === 1 ? "" : "s"} para o orgao)`
              : ""}
            .
          </p>
        </header>
        <dl className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Ultima atualizacao
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {formatDate(detail.lastUpdatedAt)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Primeira resposta
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {formatDate(detail.firstAnsweredAt)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Contribuintes
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {detail.contributors.length === 0
                ? "—"
                : detail.contributors
                    .map((c) => c.fullName ?? "Usuario sem nome")
                    .join(", ")}
            </dd>
          </div>
        </dl>
      </article>

      {detail.answers.length === 0 ? (
        <div className={formSurface.empty.container}>
          <span className={formSurface.empty.iconWrap}>
            <Inbox className="h-5 w-5" aria-hidden />
          </span>
          <p className={formSurface.empty.title}>Sem perguntas vinculadas</p>
          <p className={formSurface.empty.description}>
            Este formulario nao possui perguntas para exibir.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {detail.answers.map((cell) => (
            <AnswerCellView key={cell.questionId} cell={cell} />
          ))}
        </div>
      )}
    </div>
  );
}
