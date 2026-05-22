import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchQuestionStructures } from "@/lib/workbench/resolve-question-structure";

export type PortfolioRow = {
  recommendationId: string;
  recommendationType: string;
  recommendationText: string;
  status: string;
  axisName: string;
  sectionName: string;
  questionPrompt: string;
  createdAt: string;
};

export type PortfolioPayload = {
  rows: PortfolioRow[];
  kpis: {
    total: number;
    byAxis: Record<string, number>;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type JoinedQuestion = {
  prompt: string | null;
  sections:
    | { name: string | null; axes: { name: string | null } | { name: string | null }[] | null }
    | {
        name: string | null;
        axes: { name: string | null } | { name: string | null }[] | null;
      }[]
    | null;
};

export async function loadRecommendationsPortfolio(
  supabase: SupabaseClient,
  formId: string,
  organizationId: string,
): Promise<PortfolioPayload> {
  const { data, error } = await supabase
    .from("recommendations")
    .select(
      `id, question_id, recommendation_type, current_text, status, created_at,
       questions:questions!inner(prompt, sections(name, axes(name)))`,
    )
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rawRows = (data ?? []) as Array<Record<string, unknown>>;
  const questionIds = [
    ...new Set(
      rawRows
        .map((row) => row.question_id as string | undefined)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const structures = await fetchQuestionStructures(supabase, questionIds);

  const rows: PortfolioRow[] = rawRows.map((row: Record<string, unknown>) => {
    const question = pickOne(row.questions as JoinedQuestion | JoinedQuestion[] | null);
    const section = question ? pickOne(question.sections) : null;
    const axis = section ? pickOne(section.axes) : null;
    const questionId = row.question_id as string;
    const structure = structures.get(questionId);

    return {
      recommendationId: row.id as string,
      recommendationType: row.recommendation_type as string,
      recommendationText: row.current_text as string,
      status: row.status as string,
      axisName: structure?.axisName || axis?.name || "",
      sectionName: structure?.sectionName || section?.name || "",
      questionPrompt: question?.prompt ?? "",
      createdAt: row.created_at as string,
    };
  });

  const countBy = (key: keyof PortfolioRow) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      const value = String(r[key] ?? "N/A");
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});

  return {
    rows,
    kpis: {
      total: rows.length,
      byAxis: countBy("axisName"),
      byType: countBy("recommendationType"),
      byStatus: countBy("status"),
    },
  };
}
