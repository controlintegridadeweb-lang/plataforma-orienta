"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { describeError, notify } from "@/lib/notify";
import {
  downloadPdfBlob,
  generateOfficialReportPdf,
  loadReportOptions,
} from "@/lib/reports/client";
import type { RespondentReportFormat, RespondentReportKind } from "@/lib/reports/respondent-presentation";
import {
  canGenerateOfficialPdf,
  defaultReportKindForOfficialPdf,
} from "@/lib/reports/respondent-presentation";
import {
  deleteRespondentReport,
  listRespondentReports,
  loadProcessingVersions,
} from "@/lib/reports/respondent-client";
import type { RespondentReportHistoryRow } from "@/lib/reports/respondent-presentation";
import { RespondentReportsHero } from "./respondent-reports-hero";
import { RESPONDENT_PAGE_HERO_BLEED } from "@/lib/respondent-page-layout";
import type { ReportFormOption } from "./respondent-reports-export-center";
import { RespondentReportsExportCenter } from "./respondent-reports-export-center";
import {
  INITIAL_HISTORY_FILTERS,
  RespondentReportsFilters,
  type HistoryFilterState,
} from "./respondent-reports-filters";
import { RespondentReportsHistoryList } from "./respondent-reports-history-list";
import { RespondentReportsPreviewDrawer } from "./respondent-reports-preview-drawer";
import { RespondentReportsEmptyState } from "./respondent-reports-empty-state";
import { RespondentReportStatusBadge } from "./respondent-report-status-badge";
import { getCalendarYearBrt } from "@/lib/fami/fami-year";
import { PanelSection } from "@/components/ui/panel-section";
import { layout } from "@/lib/design-system";

export function RespondentReportsShell() {
  const historyAnchorRef = useRef<HTMLDivElement>(null);

  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [forms, setForms] = useState<ReportFormOption[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [formId, setFormId] = useState("");
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);

  const [processingVersions, setProcessingVersions] = useState<number[]>([]);
  const [processingVersion, setProcessingVersion] = useState<number | null>(null);

  const [history, setHistory] = useState<RespondentReportHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [reportKind, setReportKind] = useState<RespondentReportKind>(
    defaultReportKindForOfficialPdf(),
  );
  const [format, setFormat] = useState<RespondentReportFormat>("pdf_executive");

  const [generating, setGenerating] = useState(false);
  const [generationFinished, setGenerationFinished] = useState(false);

  const [filters, setFilters] = useState<HistoryFilterState>(INITIAL_HISTORY_FILTERS);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<RespondentReportHistoryRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const loadOrganizations = useCallback(async () => {
    setLoadingScopes(true);
    try {
      const { organizations: orgs } = await loadReportOptions();
      setOrganizations(orgs);
      if (orgs.length === 1) setOrganizationId(orgs[0]!.id);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Falha ao carregar escopo.");
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
      const { forms: list } = await loadReportOptions(orgId);
      setForms(list);
      setFormId(list[0]?.id ?? "");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Falha ao carregar formulários.");
      setForms([]);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { items } = await listRespondentReports();
      setHistory(items);
    } catch (e) {
      notify.error(describeError(e, "Falha ao carregar histórico."));
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!organizationId) return;
    void loadFormsForOrg(organizationId);
    void loadHistory();
  }, [organizationId, loadFormsForOrg, loadHistory]);

  useEffect(() => {
    if (!organizationId || !formId) {
      setProcessingVersions([]);
      setProcessingVersion(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const vers = await loadProcessingVersions(organizationId, formId);
        if (cancelled) return;
        setProcessingVersions(vers);
        setProcessingVersion(vers[0] ?? null);
      } catch {
        if (!cancelled) {
          setProcessingVersions([]);
          setProcessingVersion(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, formId]);

  const latestProcessingByForm = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of forms) m.set(f.id, f.latestProcessingVersion);
    return m;
  }, [forms]);

  const reportHistoryYears = useMemo(() => {
    const ys = new Set<number>();
    for (const row of history) {
      if (row.generatedAt) ys.add(getCalendarYearBrt(row.generatedAt));
    }
    return [...ys].sort((a, b) => b - a);
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      if (filters.search && !row.formName.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.kind && row.reportKind !== filters.kind) return false;
      if (filters.format) {
        if (filters.format !== "pdf_executive" || row.format !== "pdf") return false;
      }

      const latest = latestProcessingByForm.get(row.formId) ?? row.processingVersion;
      const outdated = row.processingVersion < latest;
      if (filters.status === "completed" && outdated) return false;
      if (filters.status === "outdated" && !outdated) return false;

      const t = new Date(row.generatedAt).getTime();
      if (filters.from) {
        const fromT = new Date(filters.from).setHours(0, 0, 0, 0);
        if (t < fromT) return false;
      }
      if (filters.to) {
        const toT = new Date(filters.to).setHours(23, 59, 59, 999);
        if (t > toT) return false;
      }
      return true;
    });
  }, [history, filters, latestProcessingByForm]);

  async function fetchOfficialBlob(params: {
    formId: string;
    organizationId: string;
    processingVersion?: number;
  }): Promise<Blob> {
    return generateOfficialReportPdf(params);
  }

  function triggerDownload(blob: Blob, filename: string) {
    downloadPdfBlob(blob, filename);
  }

  const runGenerate = useCallback(
    async (opts?: {
      formId?: string;
      processingVersion?: number;
      silent?: boolean;
      /** Ignora combinação tipo/formato da UI (ex.: ações no histórico). */
      forceOfficial?: boolean;
    }) => {
      const fId = opts?.formId ?? formId;
      const oId = organizationId;
      const pv = opts?.processingVersion ?? processingVersion;
      if (!fId || !oId || pv == null) {
        if (!opts?.silent) {
          notify.warning("Selecione formulário e versão de processamento.");
        }
        return;
      }
      if (
        !opts?.forceOfficial &&
        !canGenerateOfficialPdf(reportKind, format)
      ) {
        if (!opts?.silent) {
          notify.warning("Combinação tipo/formato ainda não disponível. Use Executivo + PDF executivo.");
        }
        return;
      }

      setGenerating(true);
      setGenerationFinished(false);
      const loadingId = opts?.silent ? undefined : notify.loading("Gerando PDF…");
      try {
        const blob = await fetchOfficialBlob({
          formId: fId,
          organizationId: oId,
          processingVersion: pv,
        });
        const safeName =
          (forms.find((f) => f.id === fId)?.name ?? "relatorio")
            .replace(/[^\w\d\-]+/g, "_")
            .slice(0, 48) || "relatorio";
        triggerDownload(blob, `relatorio-orienta-${safeName}-v${pv}.pdf`);
        if (loadingId) notify.success("PDF gerado com dados persistidos no servidor.", { id: loadingId });
        setGenerationFinished(true);
        await loadHistory();
      } catch (e) {
        if (loadingId) notify.error(describeError(e, "Falha ao gerar PDF."), { id: loadingId });
        else notify.error(describeError(e, "Falha ao gerar PDF."));
      } finally {
        setGenerating(false);
        setTimeout(() => setGenerationFinished(false), 1200);
      }
    },
    [formId, organizationId, processingVersion, reportKind, format, forms, loadHistory],
  );

  const handleExportAll = useCallback(async () => {
    if (!organizationId || forms.length === 0) {
      notify.warning("Não há formulários para exportar.");
      return;
    }
    const loadingId = notify.loading(`Gerando ${forms.length} relatório(s)…`);
    try {
      for (let i = 0; i < forms.length; i++) {
        const f = forms[i]!;
        const blob = await fetchOfficialBlob({
          formId: f.id,
          organizationId,
          processingVersion: f.latestProcessingVersion,
        });
        const safeName = f.name.replace(/[^\w\d\-]+/g, "_").slice(0, 48) || "relatorio";
        triggerDownload(blob, `relatorio-orienta-${safeName}-v${f.latestProcessingVersion}.pdf`);
        if (i < forms.length - 1) await new Promise((r) => setTimeout(r, 400));
      }
      notify.success("Exportação em lote concluída.", { id: loadingId });
      await loadHistory();
    } catch (e) {
      notify.error(describeError(e, "Falha na exportação em lote."), { id: loadingId });
    }
  }, [organizationId, forms, loadHistory]);

  const refreshAll = useCallback(async () => {
    await loadOrganizations();
    if (organizationId) {
      await loadFormsForOrg(organizationId);
      await loadHistory();
    }
  }, [loadOrganizations, loadFormsForOrg, loadHistory, organizationId]);

  const scrollHistory = useCallback(() => {
    historyAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openPreview = useCallback(async (row: RespondentReportHistoryRow) => {
    setPreviewRow(row);
    setPreviewOpen(true);
    setPreviewLoading(true);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    try {
      const blob = await fetchOfficialBlob({
        formId: row.formId,
        organizationId: row.organizationId,
        processingVersion: row.processingVersion,
      });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
      notify.error("Não foi possível carregar o PDF para pré-visualização.");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewRow(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const handleRemove = useCallback(
    async (row: RespondentReportHistoryRow) => {
      if (!window.confirm("Remover este registro do histórico? O PDF não é armazenado em arquivo.")) {
        return;
      }
      try {
        await deleteRespondentReport(row.id);
        setHistory((h) => h.filter((x) => x.id !== row.id));
        notify.success("Registro removido.");
        if (previewRow?.id === row.id) closePreview();
      } catch (e) {
        notify.error(describeError(e, "Falha ao remover."));
      }
    },
    [previewRow, closePreview],
  );

  const handleShare = useCallback(async (row: RespondentReportHistoryRow) => {
    try {
      const blob = await fetchOfficialBlob({
        formId: row.formId,
        organizationId: row.organizationId,
        processingVersion: row.processingVersion,
      });
      const file = new File([blob], `relatorio-${row.formName}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Relatório Orienta",
          text: `${row.formName} · versão FAMI v${row.processingVersion}`,
          files: [file],
        });
        notify.success("Compartilhamento iniciado.");
      } else {
        await navigator.clipboard.writeText(
          `Relatório: ${row.formName}\nVersão FAMI: v${row.processingVersion}\nGerado em: ${row.generatedAt}`,
        );
        notify.success("Resumo copiado para a área de transferência.");
      }
    } catch (e) {
      notify.error(describeError(e, "Não foi possível compartilhar."));
    }
  }, []);

  const busy = loadingScopes || loadingForms || loadingHistory;

  const heroProps = {
    loading: busy,
    onRefresh: () => void refreshAll(),
    onExportAll: () => void handleExportAll(),
    onScrollHistory: scrollHistory,
  };

  if (!loadingScopes && organizations.length === 0) {
    return (
      <div className={layout.pageStack}>
        <div className={RESPONDENT_PAGE_HERO_BLEED}>
          <RespondentReportsHero {...heroProps} loading={false} />
        </div>
        <section className={`${layout.sectionStack} pt-1`}>
          <RespondentReportsEmptyState variant="no-processing" />
        </section>
      </div>
    );
  }

  const orgName = organizations.find((o) => o.id === organizationId)?.name ?? "";

  return (
    <div className={layout.pageStack}>
      <div className={RESPONDENT_PAGE_HERO_BLEED}>
        <RespondentReportsHero {...heroProps} />
      </div>

      <section className={layout.panelStack}>
      {forms.length === 0 && !loadingForms ? (
        <RespondentReportsEmptyState variant="no-processing" />
      ) : (
        <PanelSection
          title="Gerar relatório"
          description="Escolha o diagnóstico, a versão de processamento e o documento oficial."
          variant="plain"
        >
        <RespondentReportsExportCenter
          organizationName={orgName}
          forms={forms}
          formId={formId}
          onFormChange={(id) => setFormId(id)}
          processingVersions={processingVersions}
          processingVersion={processingVersion}
          onProcessingVersionChange={setProcessingVersion}
          reportKind={reportKind}
          onReportKindChange={setReportKind}
          format={format}
          onFormatChange={setFormat}
          generating={generating}
          generationFinished={generationFinished}
          onGenerate={() => void runGenerate()}
        />
        </PanelSection>
      )}

      <PanelSection
        title="Histórico e status"
        description="Exportações gravadas na plataforma. Baixar ou visualizar regenera o PDF com os dados persistidos."
        variant="plain"
        id="relatorios-historico"
        contentClassName="space-y-4"
        actions={generating ? <RespondentReportStatusBadge status="processing" /> : undefined}
      >
      <div ref={historyAnchorRef} className="scroll-mt-4 space-y-4">

        <RespondentReportsFilters
          value={filters}
          onChange={setFilters}
          onClear={() => setFilters(INITIAL_HISTORY_FILTERS)}
          availableYears={reportHistoryYears}
        />

        {filteredHistory.length === 0 && history.length > 0 ? (
          <RespondentReportsEmptyState variant="no-filter-results" />
        ) : (
          <RespondentReportsHistoryList
            items={filteredHistory}
            latestProcessingByForm={latestProcessingByForm}
            onDownload={(row) =>
              void runGenerate({
                formId: row.formId,
                processingVersion: row.processingVersion,
                silent: true,
                forceOfficial: true,
              })
            }
            onPreview={(row) => void openPreview(row)}
            onRegenerate={(row) =>
              void runGenerate({
                formId: row.formId,
                processingVersion: row.processingVersion,
                silent: true,
                forceOfficial: true,
              })
            }
            onShare={(row) => void handleShare(row)}
            onRemove={(row) => void handleRemove(row)}
          />
        )}
      </div>
      </PanelSection>

      <RespondentReportsPreviewDrawer
        open={previewOpen}
        onClose={closePreview}
        row={previewRow}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        onDownload={() => {
          if (previewRow) {
            void runGenerate({
              formId: previewRow.formId,
              processingVersion: previewRow.processingVersion,
              silent: true,
              forceOfficial: true,
            });
          }
        }}
      />
      </section>
    </div>
  );
}
