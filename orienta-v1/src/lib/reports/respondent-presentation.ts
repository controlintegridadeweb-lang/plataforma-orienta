import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileBarChart,
  FileStack,
  FileText,
  FolderGit2,
  GitCompare,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

/** Tipos de relatório institucional (catálogo escalável). */
export type RespondentReportKind =
  | "executive"
  | "technical"
  | "analytical"
  | "consolidated"
  | "comparative"
  | "fami_evolution"
  | "action_plan"
  | "recommendations"
  | "evidences";

export type RespondentReportFormat =
  | "pdf_executive"
  | "pdf_analytical"
  | "xlsx"
  | "csv"
  | "dashboard_summary"
  | "technical_pdf";

export type RespondentReportJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "outdated"
  | "available";

export type ReportKindMeta = {
  id: RespondentReportKind;
  label: string;
  shortDescription: string;
  scope: string;
  icon: LucideIcon;
  /** Se o backend atual gera PDF oficial para este tipo. */
  pdfSupported: boolean;
};

export const REPORT_KIND_META: Record<RespondentReportKind, ReportKindMeta> = {
  executive: {
    id: "executive",
    label: "Executivo",
    shortDescription: "Resumo para alta gestão: FAMI, maturidade e contagens.",
    scope: "Organização · formulário · última versão de processamento",
    icon: FileBarChart,
    pdfSupported: true,
  },
  technical: {
    id: "technical",
    label: "Técnico",
    shortDescription: "Detalhamento operacional e trilhas de evidência.",
    scope: "Profundidade técnica e auditoria",
    icon: FileText,
    pdfSupported: false,
  },
  analytical: {
    id: "analytical",
    label: "Analítico",
    shortDescription: "Cortes por eixo, seção e indicadores derivados.",
    scope: "Análise e benchmark interno",
    icon: BarChart3,
    pdfSupported: false,
  },
  consolidated: {
    id: "consolidated",
    label: "Consolidado",
    shortDescription: "Visão única consolidada do diagnóstico (mesmo núcleo do executivo).",
    scope: "Organização · formulário selecionado",
    icon: FolderGit2,
    pdfSupported: true,
  },
  comparative: {
    id: "comparative",
    label: "Comparativo",
    shortDescription: "Comparar versões ou ciclos de processamento.",
    scope: "Multi-versão / multi-período",
    icon: GitCompare,
    pdfSupported: false,
  },
  fami_evolution: {
    id: "fami_evolution",
    label: "Evolução FAMI",
    shortDescription: "Linha do tempo da maturidade e mudanças por eixo.",
    scope: "Histórico FAMI",
    icon: Activity,
    pdfSupported: false,
  },
  action_plan: {
    id: "action_plan",
    label: "Plano de ação",
    shortDescription: "Status, prazos e responsáveis das ações vinculadas.",
    scope: "Planos e execução",
    icon: ShieldCheck,
    pdfSupported: false,
  },
  recommendations: {
    id: "recommendations",
    label: "Recomendações",
    shortDescription: "Carteira priorizada com severidade e vínculos.",
    scope: "Recomendações abertas e resolvidas",
    icon: ClipboardList,
    pdfSupported: false,
  },
  evidences: {
    id: "evidences",
    label: "Evidências",
    shortDescription: "Validações, complementações e rastreabilidade documental.",
    scope: "Evidências e validação",
    icon: FileStack,
    pdfSupported: false,
  },
};

export const REPORT_KIND_ORDER: RespondentReportKind[] = [
  "executive",
  "technical",
  "analytical",
  "consolidated",
  "comparative",
  "fami_evolution",
  "action_plan",
  "recommendations",
  "evidences",
];

export type FormatMeta = {
  id: RespondentReportFormat;
  label: string;
  /** Extensão sugerida para download. */
  extension: string;
  available: boolean;
  comingSoonHint: string | null;
};

export const REPORT_FORMAT_META: Record<RespondentReportFormat, FormatMeta> = {
  pdf_executive: {
    id: "pdf_executive",
    label: "PDF executivo",
    extension: "pdf",
    available: true,
    comingSoonHint: null,
  },
  pdf_analytical: {
    id: "pdf_analytical",
    label: "PDF analítico",
    extension: "pdf",
    available: false,
    comingSoonHint: "Em breve",
  },
  xlsx: {
    id: "xlsx",
    label: "XLSX",
    extension: "xlsx",
    available: false,
    comingSoonHint: "Em breve",
  },
  csv: {
    id: "csv",
    label: "CSV",
    extension: "csv",
    available: false,
    comingSoonHint: "Em breve",
  },
  dashboard_summary: {
    id: "dashboard_summary",
    label: "Dashboard resumido",
    extension: "html",
    available: false,
    comingSoonHint: "Em breve",
  },
  technical_pdf: {
    id: "technical_pdf",
    label: "Relatório técnico (PDF)",
    extension: "pdf",
    available: false,
    comingSoonHint: "Em breve",
  },
};

export type StatusMeta = {
  id: RespondentReportJobStatus;
  label: string;
  badgeClass: string;
  icon: LucideIcon;
};

export const REPORT_JOB_STATUS_META: Record<RespondentReportJobStatus, StatusMeta> = {
  queued: {
    id: "queued",
    label: "Em fila",
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    icon: Clock,
  },
  processing: {
    id: "processing",
    label: "Processando",
    badgeClass: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
    icon: Loader2,
  },
  completed: {
    id: "completed",
    label: "Concluído",
    badgeClass: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    icon: CheckCircle2,
  },
  failed: {
    id: "failed",
    label: "Falhou",
    badgeClass: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
    icon: AlertCircle,
  },
  outdated: {
    id: "outdated",
    label: "Desatualizado",
    badgeClass: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    icon: RefreshCw,
  },
  available: {
    id: "available",
    label: "Disponível",
    badgeClass: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200",
    icon: HelpCircle,
  },
};

/** Histórico alinhado à tabela `reports` + metadados de UI. */
export type RespondentReportHistoryRow = {
  id: string;
  formId: string;
  formName: string;
  formTemplateVersion: number | null;
  organizationId: string;
  processingVersion: number;
  generatedBy: string;
  generatedByLabel: string;
  filePath: string;
  generatedAt: string;
  /** Sempre PDF oficial nesta fase. */
  format: "pdf";
  reportKind: RespondentReportKind;
  /** Linha persistida = geração concluída no servidor. */
  status: "completed";
};

export function defaultReportKindForOfficialPdf(): RespondentReportKind {
  return "executive";
}

export function canGenerateOfficialPdf(
  kind: RespondentReportKind,
  format: RespondentReportFormat,
): boolean {
  if (!REPORT_FORMAT_META[format].available) return false;
  if (format !== "pdf_executive") return false;
  return REPORT_KIND_META[kind].pdfSupported;
}

export const GENERATION_STEPS = [
  { id: "prepare", label: "Preparando dados" },
  { id: "fami", label: "Sincronizando FAMI" },
  { id: "evidence", label: "Consolidando evidências" },
  { id: "pdf", label: "Gerando PDF" },
  { id: "done", label: "Concluído" },
] as const;
