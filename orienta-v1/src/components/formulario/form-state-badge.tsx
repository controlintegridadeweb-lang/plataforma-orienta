import { formSurface } from "@/lib/form-surface";
import { FORM_WORKFLOW_REGISTRY } from "@/lib/domain/status-registry";

const STATE_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Publicado",
  under_review: "Em revisão",
  complementation_requested: "Aguardando ajuste",
  resubmitted: "Reenviado",
  consolidated: "Consolidado",
  closed: "Encerrado",
  published: "Publicado",
};

const STATE_BADGE_VARIANT: Record<string, keyof typeof formSurface.badge> = {
  draft: "neutral",
  submitted: "success",
  under_review: "warning",
  complementation_requested: "warning",
  resubmitted: "info",
  consolidated: "muted",
  closed: "neutral",
  published: "success",
};

type Props = {
  state: string;
  size?: "sm" | "md";
};

export function FormStateBadge({ state, size = "md" }: Props) {
  const variant = STATE_BADGE_VARIANT[state] ?? "neutral";
  const label = STATE_LABELS[state] ?? state;
  const title =
    state === "complementation_requested"
      ? FORM_WORKFLOW_REGISTRY.complementation_requested.description
      : undefined;

  return (
    <span
      className={`${formSurface.badge.base} ${formSurface.badge[variant]} ${
        size === "md" ? "px-2.5 py-1 text-xs" : ""
      }`}
      aria-label={`Estado: ${label}`}
      title={title}
    >
      {label}
    </span>
  );
}
