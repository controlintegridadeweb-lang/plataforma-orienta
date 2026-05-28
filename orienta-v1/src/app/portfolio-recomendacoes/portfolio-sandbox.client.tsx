"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PortfolioRow = {
  recommendationId: string;
  recommendationType: string;
  recommendationText: string;
  priority: "high" | "medium" | "low";
  status: string;
  axisName: string;
  sectionName: string;
  questionPrompt: string;
  createdAt: string;
};

type PortfolioPayload = {
  rows: PortfolioRow[];
  kpis: {
    total: number;
    byAxis: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  };
};

const defaults = {
  formId: "fb1ac8ae-0e9e-4084-9675-d1988868acaa",
  organizationId: "ce7c3c15-4cf4-47d3-b202-0017f1685c91",
};

export default function PortfolioRecomendacoesSandboxClient() {
  const [ids, setIds] = useState(defaults);
  const [payload, setPayload] = useState<PortfolioPayload | null>(null);
  const [message, setMessage] = useState(
    "Carregue o portfolio para visualizar KPIs e filtros executivos.",
  );
  const [filters, setFilters] = useState({
    axis: "all",
    type: "all",
    priority: "all",
    status: "all",
  });

  async function loadPortfolio() {
    const url = `/api/dev/recommendations-portfolio?formId=${ids.formId}&organizationId=${ids.organizationId}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Falha ao carregar portfolio.");
      return;
    }
    setPayload(data);
    setMessage("Portfolio carregado com sucesso.");
  }

  const filteredRows = useMemo(() => {
    const rows = payload?.rows ?? [];
    return rows.filter((row) => {
      if (filters.axis !== "all" && row.axisName !== filters.axis) return false;
      if (filters.type !== "all" && row.recommendationType !== filters.type) return false;
      if (filters.priority !== "all" && row.priority !== filters.priority) return false;
      if (filters.status !== "all" && row.status !== filters.status) return false;
      return true;
    });
  }, [payload, filters]);

  function uniqueValues<K extends keyof PortfolioRow>(key: K): string[] {
    return [...new Set((payload?.rows ?? []).map((row) => String(row[key] ?? "")))].filter(Boolean);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sandbox de desenvolvimento — em produção use{" "}
          <Link href="/respondente/portfolio-recomendacoes" className="font-semibold underline">
            /respondente/portfolio-recomendacoes
          </Link>
          .
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Portfolio de Recomendacoes (dev)</h1>
          <div className="flex gap-2 text-sm">
            <Link
              className="rounded border border-slate-300 px-3 py-1"
              href="/respondente/portfolio-recomendacoes"
            >
              Integrado
            </Link>
            <Link className="rounded border border-slate-300 px-3 py-1" href="/admin">
              Admin
            </Link>
            <Link className="rounded border border-slate-300 px-3 py-1" href="/plano-acao">
              Plano de Acao (dev)
            </Link>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={ids.formId}
            onChange={(event) => setIds((prev) => ({ ...prev, formId: event.target.value }))}
          />
          <input
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={ids.organizationId}
            onChange={(event) => setIds((prev) => ({ ...prev, organizationId: event.target.value }))}
          />
        </div>

        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={loadPortfolio}>
          Carregar portfolio
        </button>
        <p className="text-sm text-slate-700">{message}</p>

        {payload ? (
          <>
            <section className="grid gap-3 md:grid-cols-5">
              <article className="rounded border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Total de recomendacoes</p>
                <p className="text-2xl font-semibold">{payload.kpis.total}</p>
              </article>
              <article className="rounded border border-slate-200 bg-white p-3 md:col-span-4">
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {Object.entries(payload.kpis.byStatus).map(([key, value]) => (
                    <span key={key} className="rounded bg-slate-100 px-2 py-1">
                      {key}: {value}
                    </span>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-2 rounded border border-slate-200 bg-white p-3 md:grid-cols-4">
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={filters.axis}
                onChange={(event) => setFilters((prev) => ({ ...prev, axis: event.target.value }))}
              >
                <option value="all">Eixo: todos</option>
                {uniqueValues("axisName").map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={filters.type}
                onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="all">Tipo: todos</option>
                {uniqueValues("recommendationType").map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={filters.priority}
                onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))}
              >
                <option value="all">Prioridade: todas</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baixa</option>
              </select>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="all">Status: todos</option>
                {uniqueValues("status").map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-3">
              {filteredRows.map((row) => (
                <article key={row.recommendationId} className="rounded border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold">{row.recommendationText}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Eixo: {row.axisName} | Secao: {row.sectionName} | Tipo: {row.recommendationType} |
                    Prioridade: {row.priority} | Status: {row.status}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{row.questionPrompt}</p>
                </article>
              ))}
              {filteredRows.length === 0 ? (
                <p className="rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                  Nenhuma recomendacao encontrada com os filtros selecionados.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
