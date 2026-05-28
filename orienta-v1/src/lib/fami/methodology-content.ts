import type { FamiLevel } from "@/lib/fami/respondent-presentation";

/** Faixas de percentual → nível (espelha `lib/domain/fami.ts`). */
export const FAMI_LEVEL_THRESHOLDS: { level: FamiLevel; min: number; max: number }[] = [
  { level: 1, min: 0, max: 25 },
  { level: 2, min: 26, max: 50 },
  { level: 3, min: 51, max: 75 },
  { level: 4, min: 76, max: 90 },
  { level: 5, min: 91, max: 100 },
];

/** Resumo curto por nível (jornada visual). */
export const FAMI_MATURITY_JOURNEY_SUMMARY: Record<FamiLevel, string> = {
  1: "Práticas pontuais e pouca estrutura institucional.",
  2: "Processos em formalização e evidências em construção.",
  3: "Práticas regulares e governança mais consistente.",
  4: "Processos consolidados, evidências auditáveis e monitoramento.",
  5: "Governança institucionalizada, métricas e melhoria contínua.",
};

/** PNG por nível em `public/assets/fami-levels/`. */
export function famiLevelIllustrationPath(level: FamiLevel): string {
  return `/assets/fami-levels/level-${level}.png`;
}

export const FAMI_GUIDE_INTRO =
  "Entenda em poucos passos como a maturidade da sua organização é medida e atualizada.";

/** Cards didáticos principais. */
export const FAMI_EXPLAIN_CARDS = [
  {
    id: "what",
    title: "O que é o FAMI",
    description: "Índice de maturidade institucional da sua organização.",
    bullets: [
      "Traduz diagnósticos em um percentual único",
      "Classifica a evolução em cinco níveis",
    ],
    tone: "brand" as const,
  },
  {
    id: "how",
    title: "Como a pontuação é calculada",
    description: "Percentual com base nos pontos obtidos e possíveis.",
    formula: "(Obtidos ÷ Possíveis) × 100",
    tone: "sky" as const,
  },
  {
    id: "influence",
    title: "O que influencia o resultado",
    description: "Fatores que alteram o percentual exibido.",
    bullets: [
      "Respostas elegíveis (Sim / Não)",
      "Evidências validadas ou dispensadas",
      "Escopo: instituição ou um formulário",
      "Recálculo após cada alteração",
    ],
    tone: "violet" as const,
  },
  {
    id: "sync",
    title: "Atualização automática",
    description: "Sem necessidade de recalcular manualmente.",
    bullets: [
      "Ao salvar respostas",
      "Ao enviar evidências",
      "Ao validar ou ajustar itens",
    ],
    tone: "emerald" as const,
  },
] as const;

export type FamiExplainCardTone = (typeof FAMI_EXPLAIN_CARDS)[number]["tone"];

/** Detalhe de pontuação (expansível no card “Como”). */
export const FAMI_SCORING_DETAIL = [
  { points: "1,0", label: "Sim, sem evidência" },
  { points: "1,5", label: "Sim, com evidência validada ou dispensada" },
  { points: "0", label: "Não, pendente ou não aplicável" },
] as const;

/** Legado */
export const FAMI_GUIDE_HERO = {
  title: "FAMI — Maturidade institucional",
  subtitle: FAMI_EXPLAIN_CARDS[0].description,
};
export const FAMI_GUIDE_HIGHLIGHTS = [
  { id: "formula", label: "Cálculo", value: "Obtidos ÷ possíveis" },
  { id: "levels", label: "Escala", value: "5 níveis" },
  { id: "sync", label: "Atualização", value: "Automática" },
] as const;
export const FAMI_TIMELINE_STEPS = [] as const;
export const FAMI_INFLUENCE_BULLETS =
  FAMI_EXPLAIN_CARDS.find((c) => c.id === "influence")?.bullets ?? [];
export const FAMI_INTRO = { title: "Framework de Avaliação de Maturidade Institucional", lead: FAMI_GUIDE_INTRO };
export const FAMI_FORMULA_STEPS = FAMI_TIMELINE_STEPS;
export const FAMI_SCORING_RULES = FAMI_SCORING_DETAIL;
export const FAMI_INFLUENCERS = FAMI_INFLUENCE_BULLETS.map((body, i) => ({
  id: String(i),
  title: body,
  body,
}));
