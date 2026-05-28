import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecommendationsAdminService,
  RecommendationsConflictError,
  RecommendationsNotFoundError,
  RecommendationsValidationError,
  type RegenerateFn,
} from "./admin-service";

// --- Tipagem de dados fake ------------------------------------------------

type RecommendationRow = {
  id: string;
  form_id: string;
  organization_id: string;
  question_id: string;
  recommendation_type: string;
  original_text: string;
  current_text: string;
  status: "open" | "in_progress" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
};

type FormRow = { id: string; name: string; version: number; archived_at: string | null };
type OrgRow = { id: string; name: string };
type QuestionRow = { id: string; prompt: string; section_id: string };
type SectionRow = { id: string; name: string; axis_id: string };
type AxisRow = { id: string; name: string };

type ChangeRow = {
  id: string;
  recommendation_id: string;
  changed_by: string;
  changed_at: string;
  field: "status" | "current_text";
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
};

type ProfileRow = { user_id: string; full_name: string | null };

type QuestionLibraryBindingRow = {
  question_id: string;
  axis_id: string | null;
  section_id: string | null;
};
type LibrarySectionRow = { id: string; name: string; axis_id: string | null };
type LibraryAxisRow = { id: string; name: string };

type Db = {
  recommendations: RecommendationRow[];
  recommendation_changes: ChangeRow[];
  forms: FormRow[];
  organizations: OrgRow[];
  questions: QuestionRow[];
  sections: SectionRow[];
  axes: AxisRow[];
  profiles: ProfileRow[];
  question_library_binding: QuestionLibraryBindingRow[];
  library_sections: LibrarySectionRow[];
  library_axes: LibraryAxisRow[];
};

// --- Util ids ------------------------------------------------------------

let idCounter = 0;
function genId() {
  idCounter += 1;
  return "00000000-0000-4000-8000-" + idCounter.toString(16).padStart(12, "0");
}

// --- Mock supabase -------------------------------------------------------

type Row = Record<string, unknown>;
type Filter = { col: string; op: "eq" | "in" | "is"; val: unknown };

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    const v = row[f.col];
    if (f.op === "eq") return v === f.val;
    if (f.op === "is") return v === f.val;
    if (f.op === "in") return (f.val as unknown[]).includes(v);
    return true;
  });
}

function buildMock(db: Db): SupabaseClient {
  function clone<T>(x: T): T {
    return JSON.parse(JSON.stringify(x)) as T;
  }

  function makeBuilder(table: keyof Db) {
    const state: {
      op: "select" | "insert" | "update" | "delete";
      rootFilters: Filter[];
      selectColumns: string;
      orderBy?: { col: string; asc: boolean };
      rangeFrom?: number;
      rangeTo?: number;
      single?: "single" | "maybe";
      payload?: Row | Row[];
      count?: "exact";
    } = { op: "select", rootFilters: [], selectColumns: "*" };

    const api = {
      select(cols?: string, opts?: { count?: "exact" }) {
        state.selectColumns = cols ?? "*";
        if (opts?.count) state.count = opts.count;
        return api;
      },
      insert(payload: Row | Row[]) {
        state.op = "insert";
        state.payload = payload;
        return api;
      },
      update(payload: Row) {
        state.op = "update";
        state.payload = payload;
        return api;
      },
      delete() {
        state.op = "delete";
        return api;
      },
      eq(col: string, val: unknown) {
        state.rootFilters.push({ col, op: "eq", val });
        return api;
      },
      in(col: string, val: unknown[]) {
        state.rootFilters.push({ col, op: "in", val });
        return api;
      },
      is(col: string, val: unknown) {
        state.rootFilters.push({ col, op: "is", val });
        return api;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        state.orderBy = { col, asc: opts?.ascending !== false };
        return api;
      },
      range(from: number, to: number) {
        state.rangeFrom = from;
        state.rangeTo = to;
        return api;
      },
      single() {
        state.single = "single";
        return run();
      },
      maybeSingle() {
        state.single = "maybe";
        return run();
      },
      then<TResult>(
        onFulfilled: (value: { data: unknown; error: unknown; count?: number | null }) => TResult,
      ) {
        return run().then(onFulfilled);
      },
    };

    function hydrateRecommendation(row: RecommendationRow): Row {
      const question = db.questions.find((q) => q.id === row.question_id);
      const section = question
        ? db.sections.find((s) => s.id === question.section_id)
        : undefined;
      const axis = section ? db.axes.find((a) => a.id === section.axis_id) : undefined;
      const form = db.forms.find((f) => f.id === row.form_id);
      const org = db.organizations.find((o) => o.id === row.organization_id);
      return {
        ...row,
        questions: question
          ? {
              id: question.id,
              prompt: question.prompt,
              section_id: question.section_id,
              sections: section
                ? {
                    name: section.name,
                    axes: axis ? { name: axis.name } : null,
                  }
                : null,
            }
          : null,
        forms: form ? { id: form.id, name: form.name, version: form.version } : null,
        organizations: org ? { id: org.id, name: org.name } : null,
      };
    }

    function run() {
      return Promise.resolve().then(() => {
        const rows = db[table] as unknown as Row[];
        if (state.op === "insert") {
          const toInsert = Array.isArray(state.payload)
            ? (state.payload as Row[])
            : [state.payload as Row];
          const created = toInsert.map((p) => {
            const r: Row = { ...p };
            r.id = r.id ?? genId();
            if (table === "recommendation_changes") {
              r.changed_at = r.changed_at ?? new Date().toISOString();
            }
            return r;
          });
          rows.push(...created);
          const data = state.single ? created[0] : created;
          return { data: clone(data), error: null };
        }
        if (state.op === "update") {
          const matched = rows.filter((r) => matches(r, state.rootFilters));
          for (const r of matched) Object.assign(r, state.payload as Row);
          const data = state.single ? matched[0] ?? null : matched;
          return { data: clone(data), error: null };
        }
        if (state.op === "delete") {
          const keep: Row[] = [];
          for (const r of rows) if (!matches(r, state.rootFilters)) keep.push(r);
          (db[table] as unknown as Row[]).length = 0;
          (db[table] as unknown as Row[]).push(...keep);
          return { data: null, error: null };
        }
        // select
        let result = rows.filter((r) => matches(r, state.rootFilters));
        if (table === "recommendations") {
          result = result.map((r) => hydrateRecommendation(r as RecommendationRow));
        }
        if (state.orderBy) {
          const { col, asc } = state.orderBy;
          result = [...result].sort((a, b) => {
            const av = a[col];
            const bv = b[col];
            if (av === bv) return 0;
            const cmp = (av as number | string) > (bv as number | string) ? 1 : -1;
            return asc ? cmp : -cmp;
          });
        }
        const totalCount = result.length;
        if (state.rangeFrom !== undefined && state.rangeTo !== undefined) {
          result = result.slice(state.rangeFrom, state.rangeTo + 1);
        }
        if (state.single === "single") {
          return result.length > 0
            ? { data: clone(result[0]), error: null }
            : { data: null, error: { message: "not found" } };
        }
        if (state.single === "maybe") {
          return {
            data: result.length > 0 ? clone(result[0]) : null,
            error: null,
          };
        }
        return {
          data: clone(result),
          error: null,
          count: state.count === "exact" ? totalCount : undefined,
        };
      });
    }

    return api;
  }

  return {
    from(table: string) {
      return makeBuilder(table as keyof Db);
    },
  } as unknown as SupabaseClient;
}

// --- Seed ---------------------------------------------------------------

function emptyDb(): Db {
  return {
    recommendations: [],
    recommendation_changes: [],
    forms: [],
    organizations: [],
    questions: [],
    sections: [],
    axes: [],
    profiles: [],
    question_library_binding: [],
    library_sections: [],
    library_axes: [],
  };
}

function seed(db: Db) {
  const orgA: OrgRow = { id: genId(), name: "Org A" };
  const orgB: OrgRow = { id: genId(), name: "Org B" };
  db.organizations.push(orgA, orgB);

  const form1: FormRow = { id: genId(), name: "Form 1", version: 1, archived_at: null };
  const form2: FormRow = { id: genId(), name: "Form 2", version: 1, archived_at: null };
  db.forms.push(form1, form2);

  const axis1: AxisRow = { id: genId(), name: "Eixo 1" };
  db.axes.push(axis1);
  const section1: SectionRow = { id: genId(), name: "Secao 1", axis_id: axis1.id };
  db.sections.push(section1);
  const q1: QuestionRow = { id: genId(), prompt: "Q1", section_id: section1.id };
  const q2: QuestionRow = { id: genId(), prompt: "Q2", section_id: section1.id };
  db.questions.push(q1, q2);

  const base = {
    original_text: "original",
    current_text: "original",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  } as const;

  const recA1: RecommendationRow = {
    id: genId(),
    form_id: form1.id,
    organization_id: orgA.id,
    question_id: q1.id,
    recommendation_type: "sim_com_evidencia_valida",
        status: "open",
    ...base,
  };
  const recA2: RecommendationRow = {
    id: genId(),
    form_id: form2.id,
    organization_id: orgA.id,
    question_id: q2.id,
    recommendation_type: "nao",
        status: "in_progress",
    ...base,
  };
  const recB1: RecommendationRow = {
    id: genId(),
    form_id: form1.id,
    organization_id: orgB.id,
    question_id: q1.id,
    recommendation_type: "sim_sem_evidencia",
        status: "open",
    ...base,
  };
  db.recommendations.push(recA1, recA2, recB1);

  return { orgA, orgB, form1, form2, recA1, recA2, recB1 };
}

// --- Tests --------------------------------------------------------------

describe("RecommendationsAdminService", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("admin lista recomendacoes de todas as organizacoes", async () => {
    const db = emptyDb();
    seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    const result = await svc.list({}, { role: "admin", organizationId: null });
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(3);
  });

  it("admin org-scoped ignora organizationId passado e usa o proprio", async () => {
    const db = emptyDb();
    const { orgA, orgB } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    const result = await svc.list(
      { organizationId: orgB.id },
      { role: "admin", organizationId: orgA.id },
    );
    expect(result.total).toBe(2);
    expect(result.items.every((i) => i.organizationId === orgA.id)).toBe(true);
  });

  it("filtra por formId, status e type", async () => {
    const db = emptyDb();
    const { form1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));

    const byForm = await svc.list(
      { formId: form1.id },
      { role: "admin", organizationId: null },
    );
    expect(byForm.items.every((i) => i.formId === form1.id)).toBe(true);

    const byStatus = await svc.list(
      { status: "in_progress" },
      { role: "admin", organizationId: null },
    );
    expect(byStatus.items.map((i) => i.status)).toEqual(["in_progress"]);

    const byType = await svc.list(
      { type: "nao" },
      { role: "admin", organizationId: null },
    );
    expect(byType.items.map((i) => i.recommendationType)).toEqual(["nao"]);
  });

  it("update com 2 campos distintos gera 2 linhas em recommendation_changes", async () => {
    const db = emptyDb();
    const { recA1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));

    const result = await svc.update(
      recA1.id,
      { status: "resolved", comment: "feito" },
      "user-admin",
      { role: "admin", organizationId: null },
    );

    expect(result.changes).toHaveLength(1);
    const fields = result.changes.map((c) => c.field);
    expect(fields).toEqual(["status"]);
    const statusRow = result.changes.find((c) => c.field === "status");
    expect(statusRow?.oldValue).toBe("open");
    expect(statusRow?.newValue).toBe("resolved");
    expect(statusRow?.comment).toBe("feito");
    expect(db.recommendation_changes).toHaveLength(1);
    const stored = db.recommendations.find((r) => r.id === recA1.id);
    expect(stored?.status).toBe("resolved");
  });

  it("update sem nenhum campo dispara RecommendationsValidationError", async () => {
    const db = emptyDb();
    const { recA1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    await expect(
      svc.update(recA1.id, {}, "user-admin", { role: "admin", organizationId: null }),
    ).rejects.toBeInstanceOf(RecommendationsValidationError);
  });

  it("update sem mudanca efetiva nao grava change row", async () => {
    const db = emptyDb();
    const { recA1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    const before = db.recommendation_changes.length;
    const result = await svc.update(
      recA1.id,
      { status: "open" },
      "user-admin",
      { role: "admin", organizationId: null },
    );
    expect(result.changes).toHaveLength(0);
    expect(db.recommendation_changes.length).toBe(before);
  });

  it("update edita current_text mantendo original_text intacto", async () => {
    const db = emptyDb();
    const { recA1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    await svc.update(
      recA1.id,
      { currentText: "texto novo" },
      "user-admin",
      { role: "admin", organizationId: null },
    );
    const stored = db.recommendations.find((r) => r.id === recA1.id);
    expect(stored?.current_text).toBe("texto novo");
    expect(stored?.original_text).toBe("original");
    expect(db.recommendation_changes.at(-1)?.field).toBe("current_text");
  });

  it("admin org-scoped nao pode editar recomendacao de outra organizacao", async () => {
    const db = emptyDb();
    const { orgA, recB1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    await expect(
      svc.update(
        recB1.id,
        { status: "resolved" },
        "user-admin-org",
        { role: "admin", organizationId: orgA.id },
      ),
    ).rejects.toBeInstanceOf(RecommendationsNotFoundError);
  });

  it("regenerate admin org-scoped em outra organizacao dispara conflito", async () => {
    const db = emptyDb();
    const { orgA, orgB, form1 } = seed(db);
    const regen = vi.fn<RegenerateFn>();
    const svc = new RecommendationsAdminService(buildMock(db), regen);
    await expect(
      svc.regenerateForForm(
        { formId: form1.id, organizationId: orgB.id },
        { role: "admin", organizationId: orgA.id },
      ),
    ).rejects.toBeInstanceOf(RecommendationsConflictError);
    expect(regen).not.toHaveBeenCalled();
  });

  it("regenerate admin delega ao workflow injetado", async () => {
    const db = emptyDb();
    const { orgA, form1 } = seed(db);
    const regen = vi.fn<RegenerateFn>().mockResolvedValue({
      processingVersion: 7,
      recommendationsCreated: 12,
      fami: { foo: "bar" },
    });
    const svc = new RecommendationsAdminService(buildMock(db), regen);
    const result = await svc.regenerateForForm(
      { formId: form1.id, organizationId: orgA.id },
      { role: "admin", organizationId: null },
    );
    expect(regen).toHaveBeenCalledWith(form1.id, orgA.id);
    expect(result.recommendationsCreated).toBe(12);
    expect(result.processingVersion).toBe(7);
    expect(result.warning).toMatch(/Regeneracao/i);
  });

  it("admin com organizationId vinculada se comporta como org-scoped (Fase 1)", async () => {
    const db = emptyDb();
    const { orgA, orgB } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));

    // admin com org de A nao deve enxergar a org B mesmo passando ?organizationId=B
    const list = await svc.list(
      { organizationId: orgB.id },
      { role: "admin", organizationId: orgA.id },
    );
    expect(list.total).toBe(2);
    expect(list.items.every((i) => i.organizationId === orgA.id)).toBe(true);

    // listFilterOptions tambem deve restringir orgs
    const opts = await svc.listFilterOptions({ role: "admin", organizationId: orgA.id });
    expect(opts.organizations.map((o) => o.id)).toEqual([orgA.id]);
  });

  it("admin com organizationId nao pode regenerar fora da propria org (Fase 1)", async () => {
    const db = emptyDb();
    const { orgA, orgB, form1 } = seed(db);
    const regen = vi.fn<RegenerateFn>();
    const svc = new RecommendationsAdminService(buildMock(db), regen);
    await expect(
      svc.regenerateForForm(
        { formId: form1.id, organizationId: orgB.id },
        { role: "admin", organizationId: orgA.id },
      ),
    ).rejects.toBeInstanceOf(RecommendationsConflictError);
    expect(regen).not.toHaveBeenCalled();
  });

  it("admin com organizationId nao pode editar recomendacao de outra org (Fase 1)", async () => {
    const db = emptyDb();
    const { orgA, recB1 } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    await expect(
      svc.update(
        recB1.id,
        { status: "resolved" },
        "user-admin",
        { role: "admin", organizationId: orgA.id },
      ),
    ).rejects.toBeInstanceOf(RecommendationsNotFoundError);
  });

  it("listFilterOptions admin global vs org-scoped", async () => {
    const db = emptyDb();
    const { orgA } = seed(db);
    const svc = new RecommendationsAdminService(buildMock(db));
    const adminOpts = await svc.listFilterOptions({
      role: "admin",
      organizationId: null,
    });
    expect(adminOpts.organizations.map((o) => o.name).sort()).toEqual([
      "Org A",
      "Org B",
    ]);
    expect(adminOpts.forms.map((f) => f.name).sort()).toEqual(["Form 1", "Form 2"]);
    expect(adminOpts.statuses).toEqual(["open", "in_progress", "resolved", "dismissed"]);
    expect(adminOpts.types.sort()).toEqual(
      ["nao", "sim_com_evidencia_valida", "sim_sem_evidencia"].sort(),
    );

    const scopedOpts = await svc.listFilterOptions({
      role: "admin",
      organizationId: orgA.id,
    });
    expect(scopedOpts.organizations.map((o) => o.id)).toEqual([orgA.id]);
    expect(scopedOpts.types.sort()).toEqual(
      ["nao", "sim_com_evidencia_valida"].sort(),
    );
  });
});
