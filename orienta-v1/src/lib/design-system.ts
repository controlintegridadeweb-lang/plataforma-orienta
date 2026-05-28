/**
 * Plataforma Orienta — Etapa 2 · Mini design system
 *
 * Referência visual oficial: dashboard do administrador (`/admin`) — KPIs
 * (`MetricCard` / alias `KpiCard`), painéis (`formSurface.dashboardPanel`),
 * `SectionHeader`, shell
 * (`AppShell` + sidebar brand flat).
 *
 * Hierarquia de tokens:
 * 1. **Cores, sombras, radius, tipografia base do `body`:** `src/app/globals.css`
 *    (`:root`, `@theme`, comentários da escala tipográfica).
 * 2. **Superfícies, formulários, botões, tabelas, empty states:** `formSurface`
 *    em `./form-surface` (import `{ formSurface }` ou `{ ds }`).
 * 3. **Tipografia de interface e ritmo de página (esta API):** `typography`,
 *    `layout`. Preferir estes presets em páginas novas para não divergir do
 *    dashboard. O conteúdo logado fica em `PageShell` (`components/layout/page-shell.tsx`).
 * 4. **Sidebar (navegação):** `sidebar` — classes usadas em `SidebarNavLink`;
 *    o layout da coluna (cor sólida, collapse) permanece em `sidebar-shell.tsx`
 *    e `globals.css` (`aside[data-collapsed]`).
 *
 * **Etapa 3 (hierarquia / UX):** títulos dentro de painéis usam `panelHeroTitle`
 * (tipicamente `<h2>` porque o `<h1>` vem do header global); `panelStack` dá
 * respiro entre filtros, KPIs e lista. Componentes reutilizáveis:
 * `PanelHeroHeader` (cabeçalho de ferramenta) e `PanelSection` (bloco com
 * `SectionHeader` + conteúdo, variante `card` ou `plain`).
 */

import { formSurface } from "./form-surface";

export { formSurface, ds } from "./form-surface";

/** Tipografia alinhada a `AppShellPageHeader`, `SectionHeader` e dashboards. */
export const typography = {
  /** `<h1>` do cabeçalho sticky da área logada. */
  pageTitle:
    "truncate text-xl font-medium tracking-normal text-slate-900 sm:text-2xl lg:text-panel-hero lg:leading-snug",
  /** Subtítulo sob o título da página (header). */
  pageDescription:
    "mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600 sm:text-base",
  /**
   * Rótulo curto acima de um grupo de KPIs ou bloco principal no dashboard
   * (ex.: "Visão geral", "Sistema") — `text-slate-600`.
   */
  sectionLabel: formSurface.sectionKicker,
  /** Kicker opcional *dentro* de painéis, acima do `<h2>` (`SectionHeader`). */
  panelEyebrow: "text-sm font-medium text-slate-500",
  /** `<h2>` de seção em painéis e páginas de conteúdo. */
  sectionTitle: "text-xl font-medium tracking-normal text-slate-900 sm:text-panel-section",
  /** Parágrafo descritivo sob o título de seção. */
  sectionDescription: "mt-1 max-w-3xl text-base leading-relaxed text-slate-600",
  /**
   * Ícone em caixa ao lado do título de seção (opcional), como em
   * `SectionHeader`.
   */
  sectionTitleIconWrap:
    "flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600",
  /**
   * Link textual de ação secundária no canto do cabeçalho de seção
   * (ex.: "Ver todos", "Abrir validações").
   */
  inlineNavLink:
    "inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 transition hover:text-slate-900",
  /** Metadados em listas densas (tabelas, cards de fila). */
  meta: "text-xs text-slate-500",
  /** Texto auxiliar um pouco maior que `meta`. */
  auxiliary: "text-sm text-slate-600",
  /**
   * Título principal dentro de painel ou ferramenta (use `<h2>`: o `<h1>` é o
   * título da rota no `AppShellPageHeader`).
   */
  panelHeroTitle: "text-xl font-medium tracking-normal text-slate-900 sm:text-panel-section",
  /** Subtítulo sob o título do painel (1 linha ou poucas). */
  panelHeroLead: "mt-0.5 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-sm",
} as const;

/**
 * Ritmo vertical e grids usados nos dashboards (admin, respondente).
 * O `<main>` do `AppShell` aplica padding e `max-width`; o conteúdo da rota fica
 * dentro de `PageShell` (painel arredondado). Na raiz do filho use `pageStack`.
 */
export const layout = {
  /**
   * Área útil ao redor do painel principal (dentro de `<main>`): largura total e
   * ritmo vertical leve entre o painel e as bordas da viewport em telas altas.
   */
  pageShellOuter: "w-full min-w-0",
  /**
   * Painel SaaS: fundo elevado, borda suave, raio maior que cartões internos
   * (`rounded-xl` em `formSurface.dashboardPanel`).
   */
  pageShell:
    "w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-sm ring-1 ring-slate-900/[0.025]",
  /** Padding interno consistente do painel (título implícito no header global). */
  pageShellPadding: "p-4 sm:p-6 md:p-7 lg:p-8",
  /**
   * Barra de filtros / campos empilhados no mobile, alinhados em linha no desktop.
   * Preferir labels em coluna com inputs `w-full` até `sm:` (ver `inputToolbar`).
   */
  filterRow:
    "flex w-full min-w-0 flex-col gap-4 border-b border-slate-200/50 bg-slate-50/50 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4 sm:gap-y-3 sm:px-5 sm:py-3.5",
  /** Espaço entre grandes blocos da página (variável CSS `--space-section-y`). */
  pageStack: "space-y-[var(--space-section-y)]",
  /** Espaço interno típico de uma `<section>` (título + grid ou painel). */
  sectionStack: "space-y-4",
  /** Grid de KPIs do admin (4 colunas em XL). */
  kpiGrid4: "grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4",
  /** Grid de KPIs em três colunas (respondente / admin). */
  kpiGrid3: "grid gap-4 md:grid-cols-3 md:gap-5",
  /** Dois KPIs lado a lado (bloco “Sistema” no admin). */
  kpiGrid2: "grid gap-4 md:grid-cols-2 md:gap-5",
  /** Maturidade (3 col) + evidências (2 col) no dashboard admin. */
  maturityAndEvidenceGrid: "grid gap-4 xl:grid-cols-5 xl:gap-5",
  /** Dois painéis lado a lado (ex.: maturidade + evidências). */
  twoPanelGrid: "grid gap-4 xl:grid-cols-2 xl:gap-5",
  /**
   * Classes do `<main>` do `AppShell` (largura máx., padding, `min-w-0`).
   * Reutilize se montar layout fora do shell por engano; o padrão é o próprio
   * `AppShell`.
   */
  appMain: "min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-9 lg:px-10 lg:py-10 xl:mx-auto xl:w-full xl:max-w-360 2xl:max-w-390",
  /**
   * Espaço vertical entre blocos densos *dentro* de uma ferramenta (KPIs,
   * filtros, tabela) — um pouco mais ar que `sectionStack` para leitura.
   */
  panelStack: "space-y-6",
} as const;

/** Links da navegação lateral (fundo brand); ícone 18px + label. */
export const sidebar = {
  groupLabel:
    "sb-group px-3 text-micro font-semibold uppercase tracking-[0.08em] text-white/65",
  link: "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-white/88 transition hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white",
  linkActive:
    "sb-link-active flex items-center gap-3 rounded-lg bg-white/18 px-3.5 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.12)] ring-2 ring-white/35 backdrop-blur-xs",
} as const;

/** Superfícies e cartões (delegam a `formSurface`; uso opcional para um só import). */
export const cards = {
  dashboardPanel: formSurface.dashboardPanel,
  dashboardPanelPadding: formSurface.dashboardPanelPadding,
  entityList: formSurface.entityListCard,
  kanban: formSurface.kanban,
  default: formSurface.card,
  nested: formSurface.nestedCard,
  cardHeader: formSurface.cardHeader,
  cardTitle: formSurface.cardTitle,
  cardDescription: formSurface.cardDescription,
} as const;

/** Botões (mesmas strings que `formSurface.*Button*`). */
export const buttons = {
  primary: formSurface.primaryButton,
  primarySm: formSurface.primaryButtonSm,
  primaryXs: formSurface.primaryButtonXs,
  secondary: formSurface.secondaryButton,
  secondarySm: formSurface.secondaryButtonSm,
  ghost: formSurface.ghostButton,
  danger: formSurface.dangerButton,
} as const;

/** Agrupador único para importações de design (opcional). */
export const orientaDesign = {
  typography,
  layout,
  sidebar,
  cards,
  buttons,
  surface: formSurface,
} as const;
