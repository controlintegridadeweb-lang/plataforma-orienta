import type { SupabaseClient } from "@supabase/supabase-js";

export type QuestionStructureSource = "library" | "structural" | "merged";

export type ResolvedQuestionStructure = {
  /**
   * Eixo estrutural FAMI (`axes.id`). Único identificador válido para FKs como `action_plans.axis_id`,
   * escopo FAMI, etc.
   */
  structuralAxisId: string | null;
  /** Referência em `library_axes` quando a origem é biblioteca (telemetria / UI). */
  libraryAxisRefId: string | null;
  sectionId: string | null;
  axisName: string;
  sectionName: string;
  source: QuestionStructureSource | null;
};

type BindingRow = {
  question_id: string;
  axis_id: string | null;
  section_id: string | null;
};

type SectionRow = { id: string; name: string; axis_id: string | null };
type AxisRow = { id: string; name: string };

const EMPTY: ResolvedQuestionStructure = {
  structuralAxisId: null,
  libraryAxisRefId: null,
  sectionId: null,
  axisName: "",
  sectionName: "",
  source: null,
};

function normalizeAxisLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Índice determinístico: primeiro nome normalizado ganha (catálogo `axes` é pequeno). */
function buildStructuralAxesNameIndex(rows: { id: string; name: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of rows) {
    const k = normalizeAxisLabel(row.name ?? "");
    if (k && !m.has(k)) m.set(k, row.id);
  }
  return m;
}

function structuralAxisIdFromLibraryRef(
  libraryAxisRefId: string | null,
  libraryAxisDisplayName: string,
  structuralAxisIds: Set<string>,
  axesNameIndex: Map<string, string>,
): string | null {
  if (libraryAxisRefId && structuralAxisIds.has(libraryAxisRefId)) {
    return libraryAxisRefId;
  }
  const fromNormalizedName = axesNameIndex.get(normalizeAxisLabel(libraryAxisDisplayName));
  if (fromNormalizedName) return fromNormalizedName;
  return null;
}

function resolveFromLibrary(
  binding: BindingRow,
  librarySections: Map<string, SectionRow>,
  libraryAxes: Map<string, AxisRow>,
  structuralAxisIds: Set<string>,
  axesNameIndex: Map<string, string>,
): ResolvedQuestionStructure {
  const section = binding.section_id ? librarySections.get(binding.section_id) : undefined;
  const libraryAxisRefId = binding.axis_id ?? section?.axis_id ?? null;
  const axisRow = libraryAxisRefId ? libraryAxes.get(libraryAxisRefId) : undefined;
  const axisNameDisplay = axisRow?.name ?? "";

  if (!binding.section_id && !libraryAxisRefId) return EMPTY;

  const structuralAxisId = structuralAxisIdFromLibraryRef(
    libraryAxisRefId,
    axisNameDisplay,
    structuralAxisIds,
    axesNameIndex,
  );

  return {
    structuralAxisId,
    libraryAxisRefId,
    sectionId: binding.section_id,
    axisName: axisNameDisplay,
    sectionName: section?.name ?? "",
    source: "library",
  };
}

function resolveFromStructural(
  sectionId: string,
  structuralSections: Map<string, SectionRow>,
  structuralAxes: Map<string, AxisRow>,
): ResolvedQuestionStructure {
  const section = structuralSections.get(sectionId);
  if (!section) return EMPTY;
  const axis = section.axis_id ? structuralAxes.get(section.axis_id) : undefined;
  return {
    structuralAxisId: section.axis_id ?? null,
    libraryAxisRefId: null,
    sectionId,
    axisName: axis?.name ?? "",
    sectionName: section.name,
    source: "structural",
  };
}

/**
 * Biblioteca define classificação quando resolve `structuralAxisId`;
 * caso contrário usa-se o eixo da seção do formulário (`questions.section_id` → `sections.axis_id`).
 */
function mergeLibraryAndStructural(
  library: ResolvedQuestionStructure,
  structural: ResolvedQuestionStructure,
): ResolvedQuestionStructure {
  if (library.source === null && structural.source === null) return EMPTY;
  if (library.source === null) return structural;
  /** Biblioteca sem `structuralAxisId` não é origem válida para FAMI/FK — não mascarar como resolvida. */
  if (structural.source === null) {
    return library.structuralAxisId ? library : EMPTY;
  }

  const structuralAxisId = library.structuralAxisId ?? structural.structuralAxisId;

  let mergedSource: QuestionStructureSource | null = null;
  if (library.structuralAxisId) {
    mergedSource = "library";
  } else if (structural.structuralAxisId) {
    mergedSource = "merged";
  }

  return {
    structuralAxisId,
    libraryAxisRefId: library.libraryAxisRefId,
    sectionId: library.sectionId ?? structural.sectionId,
    axisName: library.axisName || structural.axisName,
    sectionName: library.sectionName || structural.sectionName,
    source: mergedSource,
  };
}

/**
 * Resolve eixo/secao de perguntas a partir do vínculo da Biblioteca
 * (`question_library_binding`) e/ou do modelo do formulário (`questions.section_id` → `sections`/`axes`).
 *
 * Regra: `structuralAxisId` é sempre `axes.id` ou `null`. Referências `library_axes.id` nunca são
 * expostas como se fossem eixo estrutural — apenas mapeadas pelo nome para `axes`.
 */
export async function fetchQuestionStructures(
  supabase: SupabaseClient,
  questionIds: string[],
): Promise<Map<string, ResolvedQuestionStructure>> {
  const result = new Map<string, ResolvedQuestionStructure>();
  if (questionIds.length === 0) return result;

  const [{ data: questions, error: qErr }, { data: bindings, error: bErr }] =
    await Promise.all([
      supabase.from("questions").select("id, section_id").in("id", questionIds),
      supabase
        .from("question_library_binding")
        .select("question_id, axis_id, section_id")
        .in("question_id", questionIds),
    ]);
  if (qErr) throw qErr;
  if (bErr) throw bErr;

  const bindingByQuestion = new Map(
    (bindings ?? []).map((row) => [row.question_id as string, row as BindingRow]),
  );

  const librarySectionIds = new Set<string>();
  const libraryAxisIds = new Set<string>();
  const structuralSectionIds = new Set<string>();

  for (const binding of bindings ?? []) {
    if (binding.section_id) librarySectionIds.add(binding.section_id as string);
    if (binding.axis_id) libraryAxisIds.add(binding.axis_id as string);
  }

  for (const question of questions ?? []) {
    const sectionId = question.section_id as string | null;
    if (sectionId) structuralSectionIds.add(sectionId);
  }

  const { data: librarySections, error: libSecErr } =
    librarySectionIds.size > 0
      ? await supabase
          .from("library_sections")
          .select("id,name,axis_id")
          .in("id", Array.from(librarySectionIds))
      : { data: [], error: null };
  if (libSecErr) throw libSecErr;

  for (const section of librarySections ?? []) {
    if (section.axis_id) libraryAxisIds.add(section.axis_id as string);
  }

  const structuralAxisIdsPrefetch = new Set<string>();

  const { data: structuralSections, error: strSecErr } =
    structuralSectionIds.size > 0
      ? await supabase
          .from("sections")
          .select("id,name,axis_id")
          .in("id", Array.from(structuralSectionIds))
      : { data: [], error: null };
  if (strSecErr) throw strSecErr;

  for (const section of structuralSections ?? []) {
    if (section.axis_id) structuralAxisIdsPrefetch.add(section.axis_id as string);
  }

  const [{ data: libraryAxes, error: libAxisErr }, { data: structuralAxes, error: strAxisErr }] =
    await Promise.all([
      libraryAxisIds.size > 0
        ? supabase.from("library_axes").select("id,name").in("id", Array.from(libraryAxisIds))
        : Promise.resolve({ data: [], error: null }),
      structuralAxisIdsPrefetch.size > 0
        ? supabase.from("axes").select("id,name").in("id", Array.from(structuralAxisIdsPrefetch))
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (libAxisErr) throw libAxisErr;
  if (strAxisErr) throw strAxisErr;

  const { data: allStructuralAxes, error: allAxesErr } = await supabase
    .from("axes")
    .select("id,name");
  if (allAxesErr) throw allAxesErr;

  const axesCatalog = (allStructuralAxes ?? []) as { id: string; name: string }[];
  const structuralAxisIds = new Set(axesCatalog.map((a) => a.id));
  const axesNameIndex = buildStructuralAxesNameIndex(axesCatalog);

  const librarySectionsMap = new Map(
    (librarySections ?? []).map((row) => [row.id as string, row as SectionRow]),
  );
  const libraryAxesMap = new Map(
    (libraryAxes ?? []).map((row) => [row.id as string, row as AxisRow]),
  );
  const structuralSectionsMap = new Map(
    (structuralSections ?? []).map((row) => [row.id as string, row as SectionRow]),
  );
  const structuralAxesMap = new Map(
    (structuralAxes ?? []).map((row) => [row.id as string, row as AxisRow]),
  );

  for (const questionId of questionIds) {
    const binding = bindingByQuestion.get(questionId);
    const legacySectionId = (questions ?? []).find((q) => q.id === questionId)?.section_id as
      | string
      | null;

    const structuralResolved = legacySectionId
      ? resolveFromStructural(legacySectionId, structuralSectionsMap, structuralAxesMap)
      : EMPTY;

    if (binding?.section_id || binding?.axis_id) {
      const libraryResolved = resolveFromLibrary(
        binding,
        librarySectionsMap,
        libraryAxesMap,
        structuralAxisIds,
        axesNameIndex,
      );
      result.set(questionId, mergeLibraryAndStructural(libraryResolved, structuralResolved));
      continue;
    }

    if (legacySectionId) {
      result.set(questionId, structuralResolved);
      continue;
    }

    result.set(questionId, EMPTY);
  }

  return result;
}

/** Nomes de exibicao para IDs de escopo FAMI (library ou structural). */
export async function fetchScopeDisplayNames(
  supabase: SupabaseClient,
  sectionIds: string[],
  axisIds: string[],
): Promise<{ sectionNames: Map<string, string>; axisNames: Map<string, string> }> {
  const sectionNames = new Map<string, string>();
  const axisNames = new Map<string, string>();
  const uniqueSections = [...new Set(sectionIds.filter(Boolean))];
  const uniqueAxes = [...new Set(axisIds.filter(Boolean))];

  if (uniqueSections.length > 0) {
    const [{ data: lib }, { data: legacy }] = await Promise.all([
      supabase.from("library_sections").select("id,name").in("id", uniqueSections),
      supabase.from("sections").select("id,name").in("id", uniqueSections),
    ]);
    for (const row of lib ?? []) {
      sectionNames.set(row.id as string, (row.name as string) ?? "");
    }
    for (const row of legacy ?? []) {
      if (!sectionNames.has(row.id as string)) {
        sectionNames.set(row.id as string, (row.name as string) ?? "");
      }
    }
  }

  if (uniqueAxes.length > 0) {
    const [{ data: lib }, { data: legacy }] = await Promise.all([
      supabase.from("library_axes").select("id,name").in("id", uniqueAxes),
      supabase.from("axes").select("id,name").in("id", uniqueAxes),
    ]);
    for (const row of lib ?? []) {
      axisNames.set(row.id as string, (row.name as string) ?? "");
    }
    for (const row of legacy ?? []) {
      if (!axisNames.has(row.id as string)) {
        axisNames.set(row.id as string, (row.name as string) ?? "");
      }
    }
  }

  return { sectionNames, axisNames };
}

/**
 * IDs de perguntas vinculadas a um eixo do filtro admin (`axes.id`).
 * Inclui modelo legado (`sections`/`questions.section_id`) e Biblioteca
 * (`question_library_binding` + `library_sections` por nome de eixo).
 */
export async function questionIdsForAxisFilter(
  supabase: SupabaseClient,
  structuralAxisId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: structuralSections, error: sErr } = await supabase
    .from("sections")
    .select("id")
    .eq("axis_id", structuralAxisId);
  if (sErr) throw sErr;
  const structuralSectionIds = (structuralSections ?? []).map((s) => s.id as string);

  if (structuralSectionIds.length > 0) {
    const { data: legacyQuestions, error: qErr } = await supabase
      .from("questions")
      .select("id")
      .in("section_id", structuralSectionIds);
    if (qErr) throw qErr;
    for (const q of legacyQuestions ?? []) ids.add(q.id as string);
  }

  /** IDs em `library_axes` — nunca misturar com `axes.id`. */
  const libraryAxisIds = new Set<string>();
  const { data: axisRow } = await supabase
    .from("axes")
    .select("name")
    .eq("id", structuralAxisId)
    .maybeSingle();
  const axisName = (axisRow?.name as string | undefined)?.trim();
  if (axisName) {
    const { data: libAxes } = await supabase
      .from("library_axes")
      .select("id")
      .ilike("name", axisName);
    for (const row of libAxes ?? []) libraryAxisIds.add(row.id as string);
  }

  const librarySectionIds = new Set<string>(structuralSectionIds);
  if (libraryAxisIds.size > 0) {
    const { data: libSections } = await supabase
      .from("library_sections")
      .select("id")
      .in("axis_id", Array.from(libraryAxisIds));
    for (const row of libSections ?? []) librarySectionIds.add(row.id as string);
  }

  const bindingFilters: string[] = [];
  if (libraryAxisIds.size > 0) {
    bindingFilters.push(`axis_id.in.(${Array.from(libraryAxisIds).join(",")})`);
  }
  if (librarySectionIds.size > 0) {
    bindingFilters.push(`section_id.in.(${Array.from(librarySectionIds).join(",")})`);
  }
  if (bindingFilters.length > 0) {
    const { data: bindings, error: bErr } = await supabase
      .from("question_library_binding")
      .select("question_id")
      .or(bindingFilters.join(","));
    if (bErr) throw bErr;
    for (const row of bindings ?? []) ids.add(row.question_id as string);
  }

  return Array.from(ids);
}
