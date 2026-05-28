"use client";

import Link from "next/link";
import { useState } from "react";

type PlanRow = {
  recommendationId: string;
  recommendationType: string;
  recommendationText: string;
  recommendationPriority: "high" | "medium" | "low";
  recommendationStatus: string;
  axisName: string;
  sectionName: string;
  questionPrompt: string;
  plan: {
    id: string;
    actionText: string;
    dueDate: string;
    responsibleSector: string;
    responsibleName: string;
    priority: "high" | "medium" | "low";
    status: "to_implement" | "in_progress" | "completed" | "cancelled";
    observations: string | null;
    updatedAt: string;
  } | null;
};

const defaults = {
  formId: "fb1ac8ae-0e9e-4084-9675-d1988868acaa",
  organizationId: "ce7c3c15-4cf4-47d3-b202-0017f1685c91",
};

export default function PlanoAcaoSandboxClient() {
  const [ids, setIds] = useState(defaults);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [message, setMessage] = useState("Carregue as recomendacoes para montar o plano de acao.");

  async function loadData() {
    const url = `/api/dev/action-plan-data?formId=${ids.formId}&organizationId=${ids.organizationId}`;
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Falha ao carregar dados.");
    setRows(payload.rows ?? []);
    setMessage("Recomendacoes carregadas.");
  }

  async function savePlan(row: PlanRow, formData: FormData) {
    const response = await fetch("/api/dev/action-plan-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recommendationId: row.recommendationId,
        actionText: String(formData.get("actionText") ?? ""),
        dueDate: String(formData.get("dueDate") ?? ""),
        responsibleSector: String(formData.get("responsibleSector") ?? ""),
        responsibleName: String(formData.get("responsibleName") ?? ""),
        priority: String(formData.get("priority") ?? "medium"),
        status: String(formData.get("status") ?? "to_implement"),
        observations: String(formData.get("observations") ?? ""),
      }),
    });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Falha ao salvar plano.");
    setMessage(`Plano ${payload.mode === "created" ? "criado" : "atualizado"} com sucesso.`);
    await loadData();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <section className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sandbox de desenvolvimento — em produção use{" "}
          <Link href="/respondente/plano-acao" className="font-semibold underline">
            /respondente/plano-acao
          </Link>
          .
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Plano de Acao (dev)</h1>
          <div className="flex gap-2 text-sm">
            <Link className="rounded border border-slate-300 px-3 py-1" href="/respondente/plano-acao">
              Integrado
            </Link>
            <Link className="rounded border border-slate-300 px-3 py-1" href="/respondente">
              Respondente
            </Link>
            <Link className="rounded border border-slate-300 px-3 py-1" href="/admin">
              Admin
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

        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={loadData}>
          Carregar recomendacoes
        </button>
        <p className="text-sm text-slate-700">{message}</p>

        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.recommendationId} className="rounded border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold">{row.recommendationText}</p>
              <p className="mt-1 text-xs text-slate-600">
                Eixo: {row.axisName} | Secao: {row.sectionName} | Tipo: {row.recommendationType}
              </p>
              <form
                className="mt-3 grid gap-2 md:grid-cols-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await savePlan(row, new FormData(event.currentTarget));
                }}
              >
                <input
                  name="actionText"
                  className="rounded border border-slate-300 px-2 py-1 text-sm md:col-span-2"
                  defaultValue={row.plan?.actionText ?? ""}
                  placeholder="Acao a ser adotada"
                  required
                />
                <input
                  name="dueDate"
                  type="date"
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  defaultValue={row.plan?.dueDate ?? ""}
                  required
                />
                <input
                  name="responsibleSector"
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  defaultValue={row.plan?.responsibleSector ?? ""}
                  placeholder="Setor responsavel"
                  required
                />
                <input
                  name="responsibleName"
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  defaultValue={row.plan?.responsibleName ?? ""}
                  placeholder="Responsavel nominal"
                  required
                />
                <select
                  name="priority"
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  defaultValue={row.plan?.priority ?? row.recommendationPriority}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baixa</option>
                </select>
                <select
                  name="status"
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  defaultValue={row.plan?.status ?? "to_implement"}
                >
                  <option value="to_implement">A implementar</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="completed">Concluida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
                <textarea
                  name="observations"
                  className="rounded border border-slate-300 px-2 py-1 text-sm md:col-span-2"
                  defaultValue={row.plan?.observations ?? ""}
                  placeholder="Observacoes"
                  rows={2}
                />
                <button
                  type="submit"
                  className="rounded bg-blue-700 px-3 py-2 text-sm text-white md:col-span-2"
                >
                  Salvar plano desta recomendacao
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
