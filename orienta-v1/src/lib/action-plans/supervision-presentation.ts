import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Scale,
  Send,
} from "lucide-react";
import type { SupervisionNoteType } from "./schemas";

export type SupervisionNoteMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClass: string;
};

export const SUPERVISION_NOTE_META: Record<SupervisionNoteType, SupervisionNoteMeta> = {
  comment: {
    label: "Comentário",
    description: "Observação geral de acompanhamento.",
    icon: MessageSquare,
    badgeClass: "bg-slate-100 text-slate-700",
  },
  adjustment_request: {
    label: "Solicitação de ajuste",
    description: "Pedido de correção ou complementação à organização.",
    icon: AlertCircle,
    badgeClass: "bg-amber-50 text-amber-800",
  },
  opinion: {
    label: "Parecer",
    description: "Análise ou posicionamento institucional.",
    icon: Scale,
    badgeClass: "bg-sky-50 text-sky-800",
  },
  approval: {
    label: "Aprovação",
    description: "Validação ou aceite formal do andamento.",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-800",
  },
  pending: {
    label: "Pendência",
    description: "Bloqueio ou item aguardando providência.",
    icon: AlertCircle,
    badgeClass: "bg-rose-50 text-rose-800",
  },
  forwarding: {
    label: "Encaminhamento",
    description: "Direcionamento para outra instância ou responsável.",
    icon: Send,
    badgeClass: "bg-violet-50 text-violet-800",
  },
};

export const SUPERVISION_NOTE_TYPE_ORDER: SupervisionNoteType[] = [
  "comment",
  "adjustment_request",
  "opinion",
  "approval",
  "pending",
  "forwarding",
];

export function supervisionRoleLabel(role: string | null | undefined): string {
  if (role === "admin") return "Administrador";
  return "Equipe de supervisão";
}
