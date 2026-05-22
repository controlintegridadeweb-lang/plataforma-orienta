import { describe, expect, it } from "vitest";
import {
  fetchQuestionStructures,
  fetchScopeDisplayNames,
} from "./resolve-question-structure";

type TableData = Record<string, unknown[]>;

function createMockSupabase(tables: TableData) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      return {
        select() {
          return {
            in(_col: string, ids: string[]) {
              const key =
                table === "question_library_binding"
                  ? "question_id"
                  : _col === "question_id"
                    ? "question_id"
                    : "id";
              const filtered = rows.filter((r) =>
                ids.includes(String((r as Record<string, unknown>)[key])),
              );
              return Promise.resolve({ data: filtered, error: null });
            },
            then(onFulfilled: (v: unknown) => unknown) {
              return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof fetchQuestionStructures>[0];
}

describe("fetchQuestionStructures", () => {
  it("resolves library binding axis and section via nome → axes.id", async () => {
    const qId = "00000000-0000-4000-8000-000000000001";
    const libraryAxisRef = "00000000-0000-4000-8000-0000000000a1";
    const structuralAxisId = "00000000-0000-4000-8000-0000000000a9";
    const sectionId = "00000000-0000-4000-8000-0000000000a2";

    const supabase = createMockSupabase({
      questions: [{ id: qId, section_id: null }],
      question_library_binding: [
        { question_id: qId, axis_id: libraryAxisRef, section_id: sectionId },
      ],
      library_sections: [{ id: sectionId, name: "Secao Biblioteca", axis_id: libraryAxisRef }],
      library_axes: [{ id: libraryAxisRef, name: "Eixo Biblioteca" }],
      sections: [],
      axes: [{ id: structuralAxisId, name: "Eixo Biblioteca" }],
    });

    const map = await fetchQuestionStructures(supabase, [qId]);
    const s = map.get(qId)!;
    expect(s.source).toBe("library");
    expect(s.axisName).toBe("Eixo Biblioteca");
    expect(s.sectionName).toBe("Secao Biblioteca");
    expect(s.structuralAxisId).toBe(structuralAxisId);
    expect(s.libraryAxisRefId).toBe(libraryAxisRef);
    expect(s.sectionId).toBe(sectionId);
  });

  it("resolves legacy structural section when binding is absent", async () => {
    const qId = "00000000-0000-4000-8000-000000000002";
    const axisId = "00000000-0000-4000-8000-0000000000b1";
    const sectionId = "00000000-0000-4000-8000-0000000000b2";

    const supabase = createMockSupabase({
      questions: [{ id: qId, section_id: sectionId }],
      question_library_binding: [],
      library_sections: [],
      library_axes: [],
      sections: [{ id: sectionId, name: "Secao Legado", axis_id: axisId }],
      axes: [{ id: axisId, name: "Governanca" }],
    });

    const map = await fetchQuestionStructures(supabase, [qId]);
    const s = map.get(qId)!;
    expect(s.source).toBe("structural");
    expect(s.axisName).toBe("Governanca");
    expect(s.sectionName).toBe("Secao Legado");
    expect(s.structuralAxisId).toBe(axisId);
    expect(s.libraryAxisRefId).toBeNull();
  });

  it("alinha biblioteca ao eixo do formulário quando o nome da biblioteca não casa com axes", async () => {
    const qId = "00000000-0000-4000-8000-000000000003";
    const libraryAxisRef = "00000000-0000-4000-8000-0000000000c1";
    const structuralAxisId = "00000000-0000-4000-8000-0000000000c2";
    const librarySectionId = "00000000-0000-4000-8000-0000000000c3";
    const formSectionId = "00000000-0000-4000-8000-0000000000c4";

    const supabase = createMockSupabase({
      questions: [{ id: qId, section_id: formSectionId }],
      question_library_binding: [
        { question_id: qId, axis_id: libraryAxisRef, section_id: librarySectionId },
      ],
      library_sections: [{ id: librarySectionId, name: "Sec Lib", axis_id: libraryAxisRef }],
      library_axes: [{ id: libraryAxisRef, name: "Nome so Biblioteca" }],
      sections: [{ id: formSectionId, name: "Sec Form", axis_id: structuralAxisId }],
      axes: [{ id: structuralAxisId, name: "Ambiental" }],
    });

    const map = await fetchQuestionStructures(supabase, [qId]);
    const s = map.get(qId)!;
    expect(s.source).toBe("merged");
    expect(s.structuralAxisId).toBe(structuralAxisId);
    expect(s.libraryAxisRefId).toBe(libraryAxisRef);
  });
});

describe("fetchScopeDisplayNames", () => {
  it("loads names from library and structural tables", async () => {
    const libSection = "00000000-0000-4000-8000-0000000000c1";
    const legacyAxis = "00000000-0000-4000-8000-0000000000c2";

    const supabase = createMockSupabase({
      library_sections: [{ id: libSection, name: "Lib Sec" }],
      sections: [],
      library_axes: [],
      axes: [{ id: legacyAxis, name: "Ambiental" }],
    });

    const { sectionNames, axisNames } = await fetchScopeDisplayNames(
      supabase,
      [libSection],
      [legacyAxis],
    );
    expect(sectionNames.get(libSection)).toBe("Lib Sec");
    expect(axisNames.get(legacyAxis)).toBe("Ambiental");
  });
});
