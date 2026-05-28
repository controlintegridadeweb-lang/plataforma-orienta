"use client";

import { FAMI_ALL_FORMS } from "@/lib/fami/constants";
import type { InstitutionalFormScore } from "@/lib/fami/constants";
import { formSurface } from "@/lib/form-surface";
import { RespondentFamiLevelBadge } from "./respondent-fami-level-badge";

type FormOpt = { id: string; name: string; version: number };

type Props = {
  forms: FormOpt[];
  scores: InstitutionalFormScore[];
  selectedFormId: string;
  onSelectForm: (formId: string) => void;
};

export function RespondentFamiFormBreakdown({
  forms,
  scores,
  selectedFormId,
  onSelectForm,
}: Props) {
  const byId = new Map(scores.map((s) => [s.formId, s]));

  return (
    <div className={`${formSurface.dashboardPanel} overflow-hidden`}>
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-medium text-slate-900">Panorama por formulário</h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Pontuação mais recente de cada diagnóstico. Clique para ver o detalhamento.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-128 text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5 sm:px-5">Formulário</th>
              <th className="px-4 py-2.5">Pontuação</th>
              <th className="px-4 py-2.5">Nível</th>
              <th className="hidden px-4 py-2.5 sm:table-cell">Ação</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => {
              const score = byId.get(f.id);
              return (
                <tr
                  key={f.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 sm:px-5">
                    {f.name}
                    <span className="ml-1 text-xs font-normal text-slate-500">v{f.version}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">
                    {score ? `${score.percentage.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {score ? (
                      <RespondentFamiLevelBadge level={score.maturityLevel} size="sm" />
                    ) : (
                      <span className="text-xs text-slate-500">Sem cálculo</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <button
                      type="button"
                      onClick={() => onSelectForm(f.id)}
                      className={formSurface.secondaryButtonSm}
                    >
                      Ver detalhe
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedFormId === FAMI_ALL_FORMS ? (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5">
          Selecione um formulário no filtro ou use &quot;Ver detalhe&quot; para abrir o diagnóstico.
        </p>
      ) : null}
    </div>
  );
}
