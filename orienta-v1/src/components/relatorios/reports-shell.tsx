"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PanelHeroHeader } from "@/components/ui/panel-hero-header";
import { PanelSection } from "@/components/ui/panel-section";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";
import { notify } from "@/lib/notify";

type Props = {
  mode: "admin" | "analyst";
};

function ModeBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm"
      title="Nível de acesso ao relatório"
    >
      <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
      {label}
    </span>
  );
}

export function ReportsShell({ mode }: Props) {
  const modeBadge = mode === "admin" ? "Administrativo" : "Analista";
  const heroDescription =
    mode === "admin"
      ? "Exportações e visões executivas: gere PDFs oficiais com dados persistidos no servidor."
      : "Relatórios da sua organização com base no processamento FAMI e planos de ação.";

  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [formId, setFormId] = useState("");
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadOrganizations = useCallback(async () => {
    setLoadingScopes(true);
    try {
      const res = await fetch("/api/reports/options", { credentials: "include" });
      const payload = await res.json();
      if (!res.ok) {
        notify.error(
          typeof payload.error === "string" ? payload.error : "Falha ao carregar escopo.",
        );
        return;
      }
      const orgs = (payload.organizations ?? []) as { id: string; name: string }[];
      setOrganizations(orgs);
      if (orgs.length === 1) setOrganizationId(orgs[0].id);
    } finally {
      setLoadingScopes(false);
    }
  }, []);

  const loadFormsForOrg = useCallback(async (orgId: string) => {
    if (!orgId) {
      setForms([]);
      setFormId("");
      return;
    }
    setLoadingForms(true);
    try {
      const res = await fetch(
        `/api/reports/options?organizationId=${encodeURIComponent(orgId)}`,
        { credentials: "include" },
      );
      const payload = await res.json();
      if (!res.ok) {
        notify.error(
          typeof payload.error === "string"
            ? payload.error
            : "Falha ao carregar formulários.",
        );
        setForms([]);
        return;
      }
      const list = (payload.forms ?? []) as { id: string; name: string }[];
      setForms(list);
      setFormId("");
    } finally {
      setLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!organizationId) return;
    void loadFormsForOrg(organizationId);
  }, [organizationId, loadFormsForOrg]);

  async function handleGenerate() {
    if (!organizationId || !formId) {
      notify.warning("Selecione organização e formulário com processamento FAMI disponível.");
      return;
    }

    setGenerating(true);
    const loadingId = notify.loading("Gerando PDF…");
    try {
      const res = await fetch("/api/reports/official", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, organizationId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const err =
          typeof j.error === "string"
            ? j.error
            : typeof j.error === "object" && j.error !== null && "_errors" in (j.error as object)
              ? "Parâmetros inválidos."
              : "Falha ao gerar PDF.";
        notify.error(err, { id: loadingId });
        return;
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "relatorio-orienta-v1.pdf";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      notify.success("PDF gerado com dados persistidos no servidor.", { id: loadingId });
    } catch {
      notify.error("Erro de rede ao solicitar o relatório.", { id: loadingId });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className={layout.panelStack}>
      <PanelHeroHeader title="Relatórios" description={heroDescription} />

      <PanelSection
        title="Gerar PDF oficial"
        description="Usa apenas dados já gravados: resultado FAMI global, plano por eixo (recomendações e ações) e resumo antes do quadro final do FAMI."
        variant="card"
        actions={<ModeBadge label={modeBadge} />}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={formSurface.fieldGroup}>
            <label htmlFor="report-organization" className={formSurface.label}>
              Organização
            </label>
            <select
              id="report-organization"
              className={formSurface.inputSelect}
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              aria-label="Organização"
              disabled={loadingScopes || generating}
            >
              <option value="">{loadingScopes ? "Carregando..." : "Selecione"}</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className={formSurface.fieldGroup}>
            <label htmlFor="report-form" className={formSurface.label}>
              Formulário
            </label>
            <select
              id="report-form"
              className={formSurface.inputSelect}
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              aria-label="Formulário"
              disabled={
                loadingScopes || loadingForms || generating || !organizationId || forms.length === 0
              }
            >
              <option value="">
                {!organizationId
                  ? "Selecione a organização"
                  : loadingForms
                    ? "Carregando..."
                    : forms.length === 0
                      ? "Nenhum com FAMI processado"
                      : "Selecione"}
              </option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`${formSurface.fieldGroup} flex flex-col justify-end`}>
            <p className={formSurface.label}>Formato</p>
            <div className={formSurface.readOnlyField}>PDF oficial (único disponível)</div>
          </div>

          <div className="flex min-h-10 items-end">
            <button
              type="button"
              className={`${formSurface.primaryButton} w-full sm:w-full`}
              onClick={() => void handleGenerate()}
              disabled={generating || loadingScopes || !organizationId || !formId}
            >
              {generating ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </div>
      </PanelSection>
    </div>
  );
}

