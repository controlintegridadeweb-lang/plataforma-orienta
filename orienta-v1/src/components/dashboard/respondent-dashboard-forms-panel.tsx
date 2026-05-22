"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RespondentProgress } from "@/lib/dashboards/queries";
import { RespondentFormsYearEmptyState } from "@/components/respondente/respondent-forms-year-empty-state";
import { RespondentFormProgressItem } from "@/components/respondente/respondent-form-progress-item";
import { SectionHeader } from "@/components/ui/section-header";
import { typography } from "@/lib/design-system";

type Props = {
  forms: RespondentProgress[];
  year: number;
  loading?: boolean;
};

export function RespondentDashboardFormsPanel({ forms, year, loading = false }: Props) {
  return (
    <>
      <SectionHeader
        title="Meus formulários"
        description={`Progresso e pendências em ${year} (horário de Brasília).`}
        actions={
          <Link href="/respondente/formularios" className={typography.inlineNavLink}>
            Ver todos <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />

      {forms.length === 0 ? (
        <RespondentFormsYearEmptyState year={year} loading={loading} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {forms.map((form) => (
            <RespondentFormProgressItem key={form.formId} form={form} variant="row" />
          ))}
        </ul>
      )}
    </>
  );
}
