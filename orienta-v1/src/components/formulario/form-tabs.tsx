"use client";

import { UnderlineTabs } from "@/components/ui/underline-tabs";

const SEGMENTS = ["perguntas", "vinculos", "configuracao", "respostas"] as const;

const SEGMENT_LABELS: Record<(typeof SEGMENTS)[number], string> = {
  perguntas: "Perguntas",
  vinculos: "Vínculos",
  configuracao: "Configuração",
  respostas: "Respostas",
};

const TABS = SEGMENTS.map((segment) => ({
  segment,
  label: SEGMENT_LABELS[segment],
}));

export function FormTabs({
  formId,
  scope = "admin",
  embedded = false,
}: {
  formId: string;
  /** Base do app (rotas de edicao de formulario replicam admin em /analista). */
  scope?: "admin" | "analista";
  embedded?: boolean;
}) {
  const base = `/${scope}/formularios/${formId}`;
  const tabs = TABS.map((t) => ({
    href: `${base}/${t.segment}`,
    label: t.label,
  }));

  return <UnderlineTabs aria-label="Seções do formulário" tabs={tabs} embedded={embedded} />;
}
