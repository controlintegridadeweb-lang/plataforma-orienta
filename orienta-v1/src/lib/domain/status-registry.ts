import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Award,
  CheckCircle2,
  Circle,
  CircleOff,
  CircleSlash,
  ClipboardList,
  Clock,
  Compass,
  Eye,
  FileQuestion,
  Flame,
  HelpCircle,
  Hourglass,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import type {
  ActionPlanView,
  AdminPlanView,
  AdminRecommendationView,
  RespondentRecommendationView,
} from "@/lib/domain/workflow-status-keys";
import type { RecommendationType, WorkflowState } from "@/lib/domain/types";
import type { ValidationStatus } from "@/lib/evidences/schemas";
import type { RespondentEvidenceStatus } from "@/lib/evidences/respondent-status";
import { formSurface } from "@/lib/form-surface";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import type { RespondentReportJobStatus } from "@/lib/reports/respondent-presentation";

/**
 * SSOT de metadados visuais para status de workflow (rótulo, cor, ícone, prioridade de ordenação).
 * Valores canônicos de API/DB devem permanecer nos schemas Zod existentes; este arquivo apenas
 * agrega apresentação e prioridade para filtros/dashboards.
 *
 * Legados / visões derivadas ficam explícitas em domínios separados (`action_plan_admin_view`, …).
 */
export type StatusRegistryEntry = {
  /** Igual à chave no mapa — útil para telemetria e exports CSV */
  key: string;
  label: string;
  description?: string;
  /** Classes Tailwind (fundo, texto, anel). Layout base é aplicado pelo badge. */
  colorClass: string;
  /** Variante “chip” para linhas de tabela (`WorkflowStatusBadge` presentation="chip"). */
  chipColorClass?: string;
  /** Fundo suave para colunas de board / filtros admin/respondente. */
  columnBg?: string;
  icon?: LucideIcon;
  /** Nome estável do ícone (Lucide) para dashboards/APIs que não carregam componentes React */
  iconName?: string;
  /** Menor número = mais urgente em ordenação de filas operacionais */
  priority: number;
  /**
   * Quando true, indica que o valor ainda aparece em dados históricos mas
   * não é mais gerado pelo sistema. UI pode optar por escondê-lo de filtros
   * "default" ou exibir um marcador de descontinuado.
   */
  legacy?: boolean;
};

/** Superfícies discretas para badges (SSOT — alinhado a `formSurface.badge`). */
export const STATUS_BADGE_SURFACE = {
  neutral: formSurface.badge.neutral,
  brand: formSurface.badge.brand,
  success: formSurface.badge.success,
  warning: formSurface.badge.warning,
  danger: formSurface.badge.danger,
  info: formSurface.badge.info,
  muted: formSurface.badge.muted,
} as const;

const badgeTone = {
  validationNeutral: STATUS_BADGE_SURFACE.neutral,
  validationSuccess: STATUS_BADGE_SURFACE.success,
  validationDanger: STATUS_BADGE_SURFACE.danger,
  validationWarning: STATUS_BADGE_SURFACE.warning,
  validationInfo: STATUS_BADGE_SURFACE.info,
  validationMuted: STATUS_BADGE_SURFACE.muted,
} as const;

function entry(p: Omit<StatusRegistryEntry, "key"> & { key?: string }): StatusRegistryEntry {
  const key = p.key ?? p.label;
  return {
    key,
    label: p.label,
    description: p.description,
    colorClass: p.colorClass,
    chipColorClass: p.chipColorClass,
    columnBg: p.columnBg,
    icon: p.icon,
    iconName: p.iconName,
    priority: p.priority,
    legacy: p.legacy,
  };
}

/** Status `evidence_validations.status` — alinhado a `validationStatusSchema`. */
export const EVIDENCE_VALIDATION_REGISTRY: Record<ValidationStatus, StatusRegistryEntry> = {
  pending: entry({
    key: "pending",
    label: "Pendente",
    description: "Aguardando análise.",
    colorClass: badgeTone.validationNeutral,
    icon: Clock,
    iconName: "Clock",
    priority: 40,
  }),
  valid: entry({
    key: "valid",
    label: "Valida",
    description: "Evidência aceita.",
    colorClass: badgeTone.validationSuccess,
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  invalid: entry({
    key: "invalid",
    label: "Invalida",
    description: "Evidência rejeitada.",
    colorClass: badgeTone.validationDanger,
    icon: XCircle,
    iconName: "XCircle",
    priority: 15,
  }),
  partially_valid: entry({
    key: "partially_valid",
    label: "Parcial",
    description: "Validação parcial — requer atenção.",
    colorClass: badgeTone.validationWarning,
    icon: AlertCircle,
    iconName: "AlertCircle",
    priority: 25,
  }),
  complementation_requested: entry({
    key: "complementation_requested",
    label: "Complementação",
    description: "Aguardando complementação do respondente.",
    colorClass: badgeTone.validationInfo,
    icon: FileQuestion,
    iconName: "FileQuestion",
    priority: 20,
  }),
  waived: entry({
    key: "waived",
    label: "Dispensada",
    description: "Dispensada com justificativa.",
    colorClass: badgeTone.validationMuted,
    icon: ShieldOff,
    iconName: "ShieldOff",
    priority: 90,
  }),
};

/** Linguagem do respondente — derivação em `deriveRespondentStatus`. */
export const EVIDENCE_RESPONDENT_REGISTRY: Record<RespondentEvidenceStatus, StatusRegistryEntry> = {
  enviada: entry({
    key: "enviada",
    label: "Enviada",
    description: "Sua evidência foi recebida pela plataforma.",
    colorClass: badgeTone.validationNeutral,
    icon: Clock,
    iconName: "Clock",
    priority: 45,
  }),
  aguardando_analise: entry({
    key: "aguardando_analise",
    label: "Aguardando análise",
    description: "O analista ainda não revisou esta evidência.",
    colorClass: badgeTone.validationInfo,
    icon: Clock,
    iconName: "Clock",
    priority: 42,
  }),
  aprovada: entry({
    key: "aprovada",
    label: "Aprovada",
    description: "Evidência considerada válida pelo analista.",
    colorClass: badgeTone.validationSuccess,
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  reprovada: entry({
    key: "reprovada",
    label: "Reprovada",
    description: "Evidência rejeitada — veja o motivo e reenvie.",
    colorClass: badgeTone.validationDanger,
    icon: XCircle,
    iconName: "XCircle",
    priority: 12,
  }),
  complementacao_solicitada: entry({
    key: "complementacao_solicitada",
    label: "Complementação solicitada",
    description: "O analista pediu ajustes.",
    colorClass: badgeTone.validationWarning,
    icon: FileQuestion,
    iconName: "FileQuestion",
    priority: 18,
  }),
  ajustada_e_reenviada: entry({
    key: "ajustada_e_reenviada",
    label: "Ajustada e reenviada",
    description: "Aguarde nova revisão após complementação.",
    colorClass: badgeTone.validationInfo,
    icon: RefreshCw,
    iconName: "RefreshCw",
    priority: 38,
  }),
};

/** `recommendations.status` — schema em `recommendationStatusSchema`. */
export const RECOMMENDATION_REGISTRY: Record<RecommendationStatus, StatusRegistryEntry> = {
  open: entry({
    key: "open",
    label: "Aberta",
    description: "Recomendação ainda não foi iniciada.",
    colorClass: STATUS_BADGE_SURFACE.neutral,
    icon: Clock,
    iconName: "Clock",
    priority: 50,
  }),
  in_progress: entry({
    key: "in_progress",
    label: "Em andamento",
    description: "Já existe um plano de ação em execução.",
    colorClass: STATUS_BADGE_SURFACE.info,
    icon: PlayCircle,
    iconName: "PlayCircle",
    priority: 35,
  }),
  resolved: entry({
    key: "resolved",
    label: "Concluída",
    description: "Recomendação atendida e finalizada.",
    colorClass: STATUS_BADGE_SURFACE.success,
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  dismissed: entry({
    key: "dismissed",
    label: "Descartada",
    description: "Marcada como não aplicável.",
    colorClass: STATUS_BADGE_SURFACE.muted,
    icon: CircleSlash,
    iconName: "CircleSlash",
    priority: 95,
  }),
};

/**
 * Mesmo enum DB que `recommendation` — visual idêntico ao registry principal.
 *
 * Historicamente o status `resolved` exibia o rótulo "Resolvida" aqui (em
 * tabelas administrativas), enquanto o resto da plataforma usava "Concluída".
 * Padronizado: o rótulo passa a ser "Concluída" em todas as superfícies,
 * alinhado com o vocabulário de planos/relatórios (`completed`).
 */
export const RECOMMENDATION_TABLE_REGISTRY: Record<RecommendationStatus, StatusRegistryEntry> = {
  ...RECOMMENDATION_REGISTRY,
};

/** Rótulos do enum `RecommendationStatus` para selects e histórico. */
export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> =
  Object.fromEntries(
    (Object.keys(RECOMMENDATION_TABLE_REGISTRY) as RecommendationStatus[]).map((k) => [
      k,
      RECOMMENDATION_TABLE_REGISTRY[k].label,
    ]),
  ) as Record<RecommendationStatus, string>;

/**
 * `recommendations.recommendation_type` — cenários que disparam recomendação oficial.
 * Inclui chaves canônicas (`RecommendationType`) e legados ainda presentes no banco.
 */
export const RECOMMENDATION_TYPE_REGISTRY: Record<string, StatusRegistryEntry> = {
  not_implemented: entry({
    key: "not_implemented",
    label: "Não implementado",
    description: "Resposta negativa à prática recomendada.",
    colorClass: "bg-rose-50 text-rose-700",
    icon: XCircle,
    iconName: "XCircle",
    priority: 20,
  }),
  partial_implementation: entry({
    key: "partial_implementation",
    label: "Implementação parcial",
    description: "Prática adotada de forma incompleta.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: AlertTriangle,
    iconName: "AlertTriangle",
    priority: 30,
  }),
  /**
   * @deprecated `missing_evidence` não é mais gerado a partir de 2026-05.
   * Resposta positiva sem comprovante é tratada como pendência de evidência
   * no fluxo de validação (não recomendação). Mantemos o entry apenas para
   * renderizar dados históricos que ainda estejam em `recommendations`.
   */
  missing_evidence: entry({
    key: "missing_evidence",
    label: "Ausência de evidência",
    description:
      "Legado (descontinuado): resposta positiva sem comprovante. Trate como pendência de evidência.",
    colorClass: "bg-orange-50 text-orange-700",
    icon: FileQuestion,
    iconName: "FileQuestion",
    priority: 25,
    legacy: true,
  }),
  insufficient_evidence: entry({
    key: "insufficient_evidence",
    label: "Evidência insuficiente",
    description: "Comprovante rejeitado ou parcialmente aceito.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: AlertCircle,
    iconName: "AlertCircle",
    priority: 22,
  }),
  nao: entry({
    key: "nao",
    label: "Não implementado",
    description: "Legado: resposta negativa.",
    colorClass: "bg-rose-50 text-rose-700",
    icon: XCircle,
    iconName: "XCircle",
    priority: 20,
  }),
  parcialmente: entry({
    key: "parcialmente",
    label: "Implementação parcial",
    description: "Legado: resposta parcial.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: AlertTriangle,
    iconName: "AlertTriangle",
    priority: 30,
  }),
  sim_sem_evidencia: entry({
    key: "sim_sem_evidencia",
    label: "Sim, sem evidência",
    description: "Legado: resposta positiva sem anexo.",
    colorClass: "bg-orange-50 text-orange-700",
    icon: FileQuestion,
    iconName: "FileQuestion",
    priority: 25,
  }),
  sim_evidencia_invalida: entry({
    key: "sim_evidencia_invalida",
    label: "Evidência inválida",
    description: "Legado: comprovante não aceito.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: AlertCircle,
    iconName: "AlertCircle",
    priority: 22,
  }),
  sim_com_evidencia_valida: entry({
    key: "sim_com_evidencia_valida",
    label: "Sim, com evidência válida",
    description: "Legado: cenário sem recomendação ativa.",
    colorClass: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 90,
  }),
  nao_se_aplica: entry({
    key: "nao_se_aplica",
    label: "Não se aplica",
    description: "Pergunta marcada como não aplicável.",
    colorClass: "bg-slate-50 text-slate-700",
    icon: CircleSlash,
    iconName: "CircleSlash",
    priority: 95,
  }),
};

/** Visão analítica admin/analista — derivação em `deriveAdminRecommendationView`. */
export const ADMIN_RECOMMENDATION_VIEW_REGISTRY: Record<
  AdminRecommendationView,
  StatusRegistryEntry
> = {
  open: entry({
    key: "open",
    label: "Aberta",
    description: "Gerada e ainda não tratada pela organização.",
    colorClass: "bg-slate-50 text-slate-700",
    columnBg: "bg-slate-50/70",
    icon: Circle,
    iconName: "Circle",
    priority: 50,
  }),
  awaiting_plan: entry({
    key: "awaiting_plan",
    label: "Aguardando plano",
    description: "Recomendação ativa sem plano de ação cadastrado.",
    colorClass: "bg-brand-50 text-brand-700",
    columnBg: "bg-brand-50/40",
    icon: Hourglass,
    iconName: "Hourglass",
    priority: 42,
  }),
  plan_submitted: entry({
    key: "plan_submitted",
    label: "Plano enviado",
    description: "Plano cadastrado pelo respondente, ainda não iniciado.",
    colorClass: "bg-brand-50/70 text-brand-700",
    columnBg: "bg-brand-50/50",
    icon: Send,
    iconName: "Send",
    priority: 36,
  }),
  in_execution: entry({
    key: "in_execution",
    label: "Em execução",
    description: "Plano em execução pela organização.",
    colorClass: "bg-brand-50/70 text-brand-700",
    columnBg: "bg-brand-50/50",
    icon: PlayCircle,
    iconName: "PlayCircle",
    priority: 34,
  }),
  overdue: entry({
    key: "overdue",
    label: "Atrasada",
    description: "Plano ativo com prazo vencido.",
    colorClass: "bg-rose-50 text-rose-700",
    columnBg: "bg-rose-50/50",
    icon: AlertTriangle,
    iconName: "AlertTriangle",
    priority: 14,
  }),
  in_review: entry({
    key: "in_review",
    label: "Em revisão",
    description: "Plano concluído pela organização; aguarda revisão do analista.",
    colorClass: "bg-amber-50 text-amber-700",
    columnBg: "bg-amber-50/60",
    icon: Eye,
    iconName: "Eye",
    priority: 30,
  }),
  completed: entry({
    key: "completed",
    label: "Concluída",
    description: "Recomendação tratada e validada.",
    colorClass: "bg-brand-50 text-brand-700",
    columnBg: "bg-brand-50/50",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  dismissed: entry({
    key: "dismissed",
    label: "Descartada",
    description: "Marcada como não aplicável.",
    colorClass: "bg-slate-50/70 text-slate-600",
    columnBg: "bg-slate-100/60",
    icon: CircleSlash,
    iconName: "CircleSlash",
    priority: 96,
  }),
};

/** `action_plans.status` — `planStatusSchema` (badges compactos em tabela — mesmas cores que `plan-status-badge`). */
export const ACTION_PLAN_REGISTRY: Record<PlanStatus, StatusRegistryEntry> = {
  to_implement: entry({
    key: "to_implement",
    label: "A implementar",
    description: "Ainda não iniciada.",
    colorClass: STATUS_BADGE_SURFACE.neutral,
    icon: Hourglass,
    iconName: "Hourglass",
    priority: 48,
  }),
  in_progress: entry({
    key: "in_progress",
    label: "Em andamento",
    description: "Execução em curso.",
    colorClass: STATUS_BADGE_SURFACE.info,
    icon: PlayCircle,
    iconName: "PlayCircle",
    priority: 36,
  }),
  completed: entry({
    key: "completed",
    label: "Concluída",
    description: "Finalizada.",
    colorClass: STATUS_BADGE_SURFACE.success,
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  cancelled: entry({
    key: "cancelled",
    label: "Cancelada",
    description: "Cancelada pelo fluxo.",
    colorClass: STATUS_BADGE_SURFACE.muted,
    icon: CircleOff,
    iconName: "CircleOff",
    priority: 90,
  }),
};

/** Visão extendida do monitoramento admin — derivação em `derivePlanView`. */
export const ACTION_PLAN_ADMIN_VIEW_REGISTRY: Record<AdminPlanView, StatusRegistryEntry> = {
  not_started: entry({
    key: "not_started",
    label: "Não iniciado",
    description: "Plano cadastrado, ainda sem execução iniciada.",
    colorClass: "bg-slate-50 text-slate-700",
    columnBg: "bg-slate-50/70",
    icon: Hourglass,
    iconName: "Hourglass",
    priority: 48,
  }),
  in_progress: entry({
    key: "in_progress",
    label: "Em andamento",
    description: "Plano em execução pela organização.",
    colorClass: "bg-brand-50/70 text-brand-700",
    columnBg: "bg-brand-50/50",
    icon: PlayCircle,
    iconName: "PlayCircle",
    priority: 36,
  }),
  awaiting_update: entry({
    key: "awaiting_update",
    label: "Aguardando atualização",
    description: "Sem atualização recente. Requer follow-up.",
    colorClass: "bg-amber-50 text-amber-700",
    columnBg: "bg-amber-50/50",
    icon: Clock,
    iconName: "Clock",
    priority: 32,
  }),
  completed: entry({
    key: "completed",
    label: "Concluído",
    description: "Execução finalizada pela organização.",
    colorClass: "bg-brand-50 text-brand-700",
    columnBg: "bg-brand-50/50",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  overdue: entry({
    key: "overdue",
    label: "Atrasado",
    description: "Prazo de execução vencido.",
    colorClass: "bg-rose-50 text-rose-700",
    columnBg: "bg-rose-50/50",
    icon: AlertTriangle,
    iconName: "AlertTriangle",
    priority: 14,
  }),
  critical: entry({
    key: "critical",
    label: "Crítico",
    description: "Atrasado, com baixo progresso.",
    colorClass: "bg-slate-50/70 text-slate-700",
    columnBg: "bg-rose-100/60",
    icon: AlertOctagon,
    iconName: "AlertOctagon",
    priority: 8,
  }),
};

/** Jobs de relatório no painel do respondente (`RespondentReportJobStatus`). */
export const REPORT_JOB_REGISTRY: Record<RespondentReportJobStatus, StatusRegistryEntry> = {
  queued: entry({
    key: "queued",
    label: "Em fila",
    description: "Aguardando processamento.",
    colorClass: "bg-slate-50/70 text-slate-700",
    icon: Clock,
    iconName: "Clock",
    priority: 44,
  }),
  processing: entry({
    key: "processing",
    label: "Processando",
    description: "Geração em andamento.",
    colorClass: "bg-sky-50 text-sky-700",
    icon: Loader2,
    iconName: "Loader2",
    priority: 40,
  }),
  completed: entry({
    key: "completed",
    label: "Concluído",
    description: "Relatório disponível.",
    colorClass: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  failed: entry({
    key: "failed",
    label: "Falhou",
    description: "Erro ao gerar — tentar novamente.",
    colorClass: "bg-rose-50 text-rose-700",
    icon: AlertCircle,
    iconName: "AlertCircle",
    priority: 10,
  }),
  outdated: entry({
    key: "outdated",
    label: "Desatualizado",
    description: "Dados base mudaram após a geração.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: RefreshCw,
    iconName: "RefreshCw",
    priority: 28,
  }),
  available: entry({
    key: "available",
    label: "Disponível",
    description: "Pronto para download quando aplicável.",
    colorClass: "bg-indigo-50 text-indigo-700",
    icon: HelpCircle,
    iconName: "HelpCircle",
    priority: 92,
  }),
};

/** Ciclo institucional do formulário — `WorkflowState` em `domain/types`. */
export const FORM_WORKFLOW_REGISTRY: Record<WorkflowState, StatusRegistryEntry> = {
  draft: entry({
    key: "draft",
    label: "Rascunho",
    description: "Respostas não formalizadas.",
    colorClass: "bg-slate-50 text-slate-700",
    icon: ClipboardList,
    iconName: "ClipboardList",
    priority: 60,
  }),
  submitted: entry({
    key: "submitted",
    label: "Enviado",
    description: "Formalizado para análise.",
    colorClass: "bg-sky-50 text-sky-700",
    icon: Send,
    iconName: "Send",
    priority: 45,
  }),
  under_review: entry({
    key: "under_review",
    label: "Em análise",
    description: "Equipe analítica revisando.",
    colorClass: "bg-indigo-50 text-indigo-700",
    icon: Eye,
    iconName: "Eye",
    priority: 38,
  }),
  complementation_requested: entry({
    key: "complementation_requested",
    label: "Complementação solicitada",
    description: "Respondente deve complementar.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: FileQuestion,
    iconName: "FileQuestion",
    priority: 22,
  }),
  resubmitted: entry({
    key: "resubmitted",
    label: "Reenviado",
    description: "Retorno após complementação.",
    colorClass: "bg-sky-50 text-sky-700",
    icon: RefreshCw,
    iconName: "RefreshCw",
    priority: 35,
  }),
  consolidated: entry({
    key: "consolidated",
    label: "Consolidado",
    description: "Diagnóstico consolidado.",
    colorClass: "bg-emerald-50 text-emerald-700",
    icon: ShieldCheck,
    iconName: "ShieldCheck",
    priority: 85,
  }),
  closed: entry({
    key: "closed",
    label: "Encerrado",
    description: "Ciclo fechado institucionalmente.",
    colorClass: "bg-slate-50/70 text-slate-600",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
};

/** Respondente — recomendações (`deriveRespondentView`). */
export const RESPONDENT_RECOMMENDATION_VIEW_REGISTRY: Record<
  RespondentRecommendationView,
  StatusRegistryEntry
> = {
  open: entry({
    key: "open",
    label: "Aberta",
    description: "Recomendação ainda não foi iniciada.",
    colorClass: "bg-slate-50 text-slate-700",
    columnBg: "bg-slate-50/60",
    icon: Clock,
    iconName: "Clock",
    priority: 50,
  }),
  in_progress: entry({
    key: "in_progress",
    label: "Em andamento",
    description: "Já existe um plano de ação em execução.",
    colorClass: "bg-sky-50 text-sky-700",
    columnBg: "bg-sky-50/50",
    icon: PlayCircle,
    iconName: "PlayCircle",
    priority: 35,
  }),
  awaiting_action: entry({
    key: "awaiting_action",
    label: "Aguardando ação",
    description: "Recomendação aberta sem plano de ação cadastrado.",
    colorClass: "bg-amber-50 text-amber-700",
    columnBg: "bg-amber-50/40",
    icon: Hourglass,
    iconName: "Hourglass",
    priority: 43,
  }),
  resolved: entry({
    key: "resolved",
    label: "Concluída",
    description: "Recomendação atendida e finalizada.",
    colorClass: "bg-emerald-50 text-emerald-700",
    columnBg: "bg-emerald-50/40",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  dismissed: entry({
    key: "dismissed",
    label: "Descartada",
    description: "Marcada como não aplicável.",
    colorClass: "bg-violet-50 text-violet-700",
    columnBg: "bg-violet-50/40",
    icon: CircleSlash,
    iconName: "CircleSlash",
    priority: 95,
  }),
};

/** Respondente — plano de ação (`deriveActionPlanView`). */
export const RESPONDENT_ACTION_PLAN_VIEW_REGISTRY: Record<ActionPlanView, StatusRegistryEntry> = {
  no_plan: entry({
    key: "no_plan",
    label: "Sem plano",
    description: "Recomendação aberta sem plano de ação cadastrado.",
    colorClass: "bg-violet-50 text-violet-700",
    columnBg: "bg-violet-50/50",
    icon: Hourglass,
    iconName: "Hourglass",
    priority: 44,
  }),
  not_started: entry({
    key: "not_started",
    label: "Não iniciada",
    description: "Plano criado; execução ainda não começou.",
    colorClass: "bg-slate-50 text-slate-700",
    columnBg: "bg-slate-50/70",
    icon: Circle,
    iconName: "Circle",
    priority: 48,
  }),
  in_progress: entry({
    key: "in_progress",
    label: "Em andamento",
    description: "Plano em execução.",
    colorClass: "bg-sky-50 text-sky-700",
    columnBg: "bg-sky-50/60",
    icon: PlayCircle,
    iconName: "PlayCircle",
    priority: 36,
  }),
  overdue: entry({
    key: "overdue",
    label: "Atrasada",
    description: "Plano ativo com prazo vencido.",
    colorClass: "bg-rose-50 text-rose-700",
    columnBg: "bg-rose-50/50",
    icon: AlertTriangle,
    iconName: "AlertTriangle",
    priority: 14,
  }),
  completed: entry({
    key: "completed",
    label: "Concluída",
    description: "Ação executada e finalizada.",
    colorClass: "bg-emerald-50 text-emerald-700",
    columnBg: "bg-emerald-50/60",
    icon: CheckCircle2,
    iconName: "CheckCircle2",
    priority: 100,
  }),
  paused: entry({
    key: "paused",
    label: "Pausada",
    description: "Plano cancelado/pausado pela organização.",
    colorClass: "bg-amber-50 text-amber-700",
    columnBg: "bg-amber-50/60",
    icon: PauseCircle,
    iconName: "PauseCircle",
    priority: 88,
  }),
};

/** Níveis FAMI (1–5) — apresentação no painel do respondente (`LEVEL_META`). */
export type FamiMaturityLevel = 1 | 2 | 3 | 4 | 5;

export const FAMI_MATURITY_LEVEL_REGISTRY: Record<FamiMaturityLevel, StatusRegistryEntry> = {
  1: entry({
    key: "fami_level_1",
    label: "Nível 1 · Inicial",
    description:
      "Maturidade inicial: práticas pontuais, sem estruturação institucional ou evidências consistentes.",
    colorClass: "bg-rose-50 text-rose-700",
    icon: Flame,
    iconName: "Flame",
    priority: 10,
  }),
  2: entry({
    key: "fami_level_2",
    label: "Nível 2 · Em desenvolvimento",
    description:
      "Maturidade em desenvolvimento: processos parcialmente formalizados, com evidências em construção.",
    colorClass: "bg-amber-50 text-amber-700",
    icon: Compass,
    iconName: "Compass",
    priority: 20,
  }),
  3: entry({
    key: "fami_level_3",
    label: "Nível 3 · Intermediário",
    description:
      "Maturidade intermediária: práticas regulares, evidências disponíveis, ajustes pontuais necessários.",
    colorClass: "bg-sky-50 text-sky-700",
    icon: Target,
    iconName: "Target",
    priority: 30,
  }),
  4: entry({
    key: "fami_level_4",
    label: "Nível 4 · Avançado",
    description:
      "Maturidade avançada: práticas consolidadas, evidências auditáveis, refinamentos contínuos.",
    colorClass: "bg-indigo-50 text-indigo-700",
    icon: Sparkles,
    iconName: "Sparkles",
    priority: 40,
  }),
  5: entry({
    key: "fami_level_5",
    label: "Nível 5 · Maduro",
    description:
      "Maturidade plena: governança institucionalizada, métricas, evidências e ciclos de melhoria.",
    colorClass: "bg-emerald-50 text-emerald-700",
    icon: Award,
    iconName: "Award",
    priority: 50,
  }),
};

export type WorkflowStatusDomain =
  | "evidence_validation"
  | "evidence_respondent"
  | "recommendation"
  | "recommendation_table"
  | "respondent_recommendation_view"
  | "admin_recommendation_view"
  | "action_plan"
  | "action_plan_admin_view"
  | "respondent_action_plan_view"
  | "report_job"
  | "form_workflow"
  | "fami_maturity_level";

export type WorkflowStatusMap = {
  evidence_validation: ValidationStatus;
  evidence_respondent: RespondentEvidenceStatus;
  recommendation: RecommendationStatus;
  recommendation_table: RecommendationStatus;
  respondent_recommendation_view: RespondentRecommendationView;
  admin_recommendation_view: AdminRecommendationView;
  action_plan: PlanStatus;
  action_plan_admin_view: AdminPlanView;
  respondent_action_plan_view: ActionPlanView;
  report_job: RespondentReportJobStatus;
  form_workflow: WorkflowState;
  fami_maturity_level: FamiMaturityLevel;
};

export const WORKFLOW_STATUS_REGISTRY: {
  [K in WorkflowStatusDomain]: Record<WorkflowStatusMap[K], StatusRegistryEntry>;
} = {
  evidence_validation: EVIDENCE_VALIDATION_REGISTRY,
  evidence_respondent: EVIDENCE_RESPONDENT_REGISTRY,
  recommendation: RECOMMENDATION_REGISTRY,
  recommendation_table: RECOMMENDATION_TABLE_REGISTRY,
  respondent_recommendation_view: RESPONDENT_RECOMMENDATION_VIEW_REGISTRY,
  admin_recommendation_view: ADMIN_RECOMMENDATION_VIEW_REGISTRY,
  action_plan: ACTION_PLAN_REGISTRY,
  action_plan_admin_view: ACTION_PLAN_ADMIN_VIEW_REGISTRY,
  respondent_action_plan_view: RESPONDENT_ACTION_PLAN_VIEW_REGISTRY,
  report_job: REPORT_JOB_REGISTRY,
  form_workflow: FORM_WORKFLOW_REGISTRY,
  fami_maturity_level: FAMI_MATURITY_LEVEL_REGISTRY,
};

const FALLBACK_ENTRY: StatusRegistryEntry = entry({
  key: "unknown",
  label: "Indefinido",
  description: "Status não catalogado — verificar dados.",
  colorClass: "bg-slate-50/70 text-slate-600",
  icon: HelpCircle,
  iconName: "HelpCircle",
  priority: 999,
});

/** Rótulo amigável para `recommendation_type` (canônico ou legado). */
export function recommendationTypeEntry(type: string): StatusRegistryEntry {
  const key = type.trim();
  if (!key) return FALLBACK_ENTRY;
  return RECOMMENDATION_TYPE_REGISTRY[key] ?? { ...FALLBACK_ENTRY, key };
}

export function recommendationTypeLabel(type: string | null | undefined): string {
  if (type == null || type.trim() === "") return "—";
  return recommendationTypeEntry(type).label;
}

export function workflowStatusLabel<D extends WorkflowStatusDomain>(
  domain: D,
  status: WorkflowStatusMap[D] | string | null | undefined,
): string {
  if (status == null || String(status).trim() === "") return "—";
  return workflowStatusEntry(domain, status as WorkflowStatusMap[D]).label;
}

export function workflowStatusEntry<D extends WorkflowStatusDomain>(
  domain: D,
  status: WorkflowStatusMap[D],
): StatusRegistryEntry {
  const map = WORKFLOW_STATUS_REGISTRY[domain] as Record<string, StatusRegistryEntry>;
  const key = String(status);
  const hit = map[key];
  if (hit) return hit;
  const asRecommendationType = RECOMMENDATION_TYPE_REGISTRY[key];
  if (asRecommendationType) return asRecommendationType;
  return { ...FALLBACK_ENTRY, key };
}

export type WorkflowStatusFilterOption<D extends WorkflowStatusDomain> = {
  value: WorkflowStatusMap[D];
  label: string;
};

/**
 * Gera as opções de `<select>` para filtros a partir do registry — preserva a
 * ordem declarada no registry e permite excluir chaves específicas. NÃO inclui
 * a opção “vazia” (use `emptyLabel` no componente para o `<option value="">`).
 */
export function workflowStatusFilterOptions<D extends WorkflowStatusDomain>(
  domain: D,
  options?: { exclude?: ReadonlyArray<WorkflowStatusMap[D]> },
): WorkflowStatusFilterOption<D>[] {
  const map = WORKFLOW_STATUS_REGISTRY[domain] as Record<string, StatusRegistryEntry>;
  const exclude = new Set<string>((options?.exclude ?? []).map((v) => String(v)));
  return (Object.keys(map) as Array<WorkflowStatusMap[D]>)
    .filter((k) => !exclude.has(String(k)))
    .map((k) => ({ value: k, label: map[String(k)].label }));
}
