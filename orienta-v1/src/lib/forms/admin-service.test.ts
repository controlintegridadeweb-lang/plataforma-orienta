import { describe, expect, it, beforeEach } from "vitest";
import { FormsAdminService, FormsConflictError, FormsValidationError } from "./admin-service";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mock minimalista e determinista do PostgrestClient usado pelo `FormsAdminService`.
 * Implementa as tabelas `forms`, `questions`, `form_questions`, `responses`,
 * `question_library_binding` apenas com os campos que o service realmente usa.
 *
 * O objetivo e testar a logica do service (ordenacao, regras de estado,
 * validacoes) sem depender do Supabase real.
 */
type FormRow = {
  id: string;
  name: string;
  version: number;
  state: string;
  archived_at: string | null;
  created_at: string;
  created_by: string;
};

type QuestionRow = {
  id: string;
  prompt: string;
  requires_evidence: boolean;
  section_id: string | null;
  recommendation_text: string | null;
  fami_enabled: boolean;
  applies_to_respondent: boolean;
};

type FormQuestionRow = {
  form_id: string;
  question_id: string;
  order_index: number;
};

type ResponseRow = {
  id: string;
  form_id: string;
  question_id: string;
};

type Db = {
  forms: FormRow[];
  questions: QuestionRow[];
  form_questions: FormQuestionRow[];
  responses: ResponseRow[];
  question_library_binding: { question_id: string }[];
};

let uuidCounter = 0;
function genId(prefix = "00000000-0000-4000-8000-") {
  uuidCounter += 1;
  return prefix + uuidCounter.toString(16).padStart(12, "0");
}

function buildMock(db: Db): SupabaseClient {
  // A API de encadeamento do supabase-js e descrita por "builder" que acumula
  // filtros. Aqui replicamos so o subconjunto que o service usa.
  type Row = Record<string, unknown>;
  type Filter = { col: string; op: "eq" | "in" | "is"; val: unknown };

  function clone<T>(x: T): T {
    return JSON.parse(JSON.stringify(x)) as T;
  }

  function applyFilters(rows: Row[], filters: Filter[]): Row[] {
    return rows.filter((r) => {
      return filters.every((f) => {
        if (f.op === "eq") return r[f.col] === f.val;
        if (f.op === "in") return (f.val as unknown[]).includes(r[f.col]);
        if (f.op === "is") return r[f.col] === f.val;
        return true;
      });
    });
  }

  function makeBuilder(table: keyof Db) {
    const state: {
      op: "select" | "insert" | "update" | "delete";
      filters: Filter[];
      orderBy?: { col: string; asc: boolean };
      limitN?: number;
      single?: "single" | "maybe";
      payload?: Row | Row[];
      wantCount?: boolean;
      head?: boolean;
    } = { op: "select", filters: [], wantCount: false };

    const api = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        // Apos insert/update, .select() preserva a operacao (retorna rows
        // afetadas). Em uma query de leitura pura comeca como "select".
        if (state.op === "select") state.op = "select";
        if (opts?.count) state.wantCount = true;
        if (opts?.head) state.head = true;
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
        state.filters.push({ col, op: "eq", val });
        return api;
      },
      in(col: string, val: unknown[]) {
        state.filters.push({ col, op: "in", val });
        return api;
      },
      is(col: string, val: unknown) {
        state.filters.push({ col, op: "is", val });
        return api;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        state.orderBy = { col, asc: opts?.ascending !== false };
        return api;
      },
      limit(n: number) {
        state.limitN = n;
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
        onFulfilled: (value: {
          data: unknown;
          error: unknown;
          count?: number;
        }) => TResult,
      ) {
        return run().then(onFulfilled);
      },
    };

    function run() {
      return Promise.resolve().then(() => {
        const rows = db[table] as unknown as Row[];
        if (state.op === "insert") {
          const toInsert = Array.isArray(state.payload)
            ? (state.payload as Row[])
            : [state.payload as Row];
          const created = toInsert.map((p) => {
            const row: Row = { ...p };
            if (table === "forms") {
              row.id = row.id ?? genId();
              row.created_at = row.created_at ?? new Date().toISOString();
              row.archived_at = row.archived_at ?? null;
            }
            if (table === "questions") {
              row.id = row.id ?? genId();
            }
            return row;
          });
          rows.push(...created);
          const data = state.single ? created[0] : created;
          return { data: clone(data), error: null, count: created.length };
        }
        if (state.op === "update") {
          const matched = applyFilters(rows, state.filters);
          for (const row of matched) {
            Object.assign(row, state.payload as Row);
          }
          const data = state.single ? matched[0] ?? null : matched;
          return { data: clone(data), error: null, count: matched.length };
        }
        if (state.op === "delete") {
          const keep: Row[] = [];
          const removed: Row[] = [];
          for (const r of rows) {
            if (applyFilters([r], state.filters).length > 0) removed.push(r);
            else keep.push(r);
          }
          (db[table] as unknown as Row[]).length = 0;
          (db[table] as unknown as Row[]).push(...keep);
          return { data: clone(removed), error: null, count: removed.length };
        }
        // select
        let result = applyFilters(rows, state.filters);
        if (state.orderBy) {
          const { col, asc } = state.orderBy;
          result = [...result].sort((a, b) => {
            const av = a[col];
            const bv = b[col];
            if (av === bv) return 0;
            const cmp = av! > bv! ? 1 : -1;
            return asc ? cmp : -cmp;
          });
        }
        if (state.limitN !== undefined) result = result.slice(0, state.limitN);
        if (state.head) {
          return { data: null, error: null, count: result.length };
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
        return { data: clone(result), error: null, count: result.length };
      });
    }

    return api;
  }

  const mock = {
    from(table: string) {
      return makeBuilder(table as keyof Db);
    },
  } as unknown as SupabaseClient;
  return mock;
}

function emptyDb(): Db {
  return {
    forms: [],
    questions: [],
    form_questions: [],
    responses: [],
    question_library_binding: [],
  };
}

function seedForm(
  db: Db,
  overrides: Partial<FormRow> = {},
): FormRow {
  const row: FormRow = {
    id: genId(),
    name: overrides.name ?? "Form",
    version: overrides.version ?? 1,
    state: overrides.state ?? "draft",
    archived_at: overrides.archived_at ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    created_by: overrides.created_by ?? "user-1",
  };
  db.forms.push(row);
  return row;
}

describe("FormsAdminService", () => {
  beforeEach(() => {
    uuidCounter = 0;
  });

  it("cria perguntas com order_index incremental (0, 1, 2)", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));

    const q1 = await svc.createQuestion(form.id, {
      prompt: "Pergunta 1",
      requiresEvidence: false,
    });
    const q2 = await svc.createQuestion(form.id, {
      prompt: "Pergunta 2",
      requiresEvidence: true,
    });
    const q3 = await svc.createQuestion(form.id, {
      prompt: "Pergunta 3",
      requiresEvidence: false,
    });

    expect(q1.orderIndex).toBe(0);
    expect(q2.orderIndex).toBe(1);
    expect(q3.orderIndex).toBe(2);

    const list = await svc.listQuestions(form.id);
    expect(list.map((q) => q.prompt)).toEqual([
      "Pergunta 1",
      "Pergunta 2",
      "Pergunta 3",
    ]);
  });

  it("reorder troca a ordem ao passar array permutado", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));

    const q1 = await svc.createQuestion(form.id, { prompt: "A", requiresEvidence: false });
    const q2 = await svc.createQuestion(form.id, { prompt: "B", requiresEvidence: false });
    const q3 = await svc.createQuestion(form.id, { prompt: "C", requiresEvidence: false });

    const reordered = await svc.reorderQuestions(form.id, {
      orderedQuestionIds: [q3.id, q1.id, q2.id],
    });
    expect(reordered.map((q) => q.id)).toEqual([q3.id, q1.id, q2.id]);
    expect(reordered.map((q) => q.orderIndex)).toEqual([0, 1, 2]);
  });

  it("reorder rejeita array que nao cobre o conjunto atual", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));
    const q1 = await svc.createQuestion(form.id, { prompt: "A", requiresEvidence: false });
    await svc.createQuestion(form.id, { prompt: "B", requiresEvidence: false });

    await expect(
      svc.reorderQuestions(form.id, { orderedQuestionIds: [q1.id] }),
    ).rejects.toBeInstanceOf(FormsValidationError);
  });

  it("bloqueia edicao de form que nao esta em draft", async () => {
    const db = emptyDb();
    const form = seedForm(db, { state: "submitted" });
    const svc = new FormsAdminService(buildMock(db));

    await expect(
      svc.createQuestion(form.id, { prompt: "X", requiresEvidence: false }),
    ).rejects.toBeInstanceOf(FormsConflictError);
    await expect(svc.rename(form.id, { name: "Novo" })).rejects.toBeInstanceOf(
      FormsConflictError,
    );
  });

  it("bloqueia edicao de form arquivado mesmo em draft", async () => {
    const db = emptyDb();
    const form = seedForm(db, { archived_at: new Date().toISOString() });
    const svc = new FormsAdminService(buildMock(db));
    await expect(
      svc.createQuestion(form.id, { prompt: "X", requiresEvidence: false }),
    ).rejects.toBeInstanceOf(FormsConflictError);
  });

  it("remove do form faz hard-delete se pergunta nao tem outros links nem respostas", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));
    const q = await svc.createQuestion(form.id, {
      prompt: "Unica",
      requiresEvidence: false,
    });

    await svc.removeQuestion(form.id, q.id);

    expect(db.form_questions.find((x) => x.question_id === q.id)).toBeUndefined();
    expect(db.questions.find((x) => x.id === q.id)).toBeUndefined();
  });

  it("remove do form preserva pergunta se ela tem respostas", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));
    const q = await svc.createQuestion(form.id, {
      prompt: "Com resposta",
      requiresEvidence: false,
    });
    db.responses.push({ id: genId(), form_id: form.id, question_id: q.id });

    await svc.removeQuestion(form.id, q.id);

    expect(db.form_questions.find((x) => x.question_id === q.id)).toBeUndefined();
    expect(db.questions.find((x) => x.id === q.id)).toBeDefined();
  });

  it("setArchived alterna archived_at entre timestamp e null", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));

    const archived = await svc.setArchived(form.id, { archived: true });
    expect(archived.archivedAt).not.toBeNull();

    const unarchived = await svc.setArchived(form.id, { archived: false });
    expect(unarchived.archivedAt).toBeNull();
  });

  it("deleteForm bloqueia se ja ha respostas", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));
    db.responses.push({ id: genId(), form_id: form.id, question_id: "qx" });

    await expect(svc.deleteForm(form.id)).rejects.toBeInstanceOf(FormsConflictError);
  });

  it("deleteForm remove form e perguntas orfas", async () => {
    const db = emptyDb();
    const form = seedForm(db);
    const svc = new FormsAdminService(buildMock(db));
    const q = await svc.createQuestion(form.id, {
      prompt: "Uma",
      requiresEvidence: false,
    });

    await svc.deleteForm(form.id);
    expect(db.forms.find((x) => x.id === form.id)).toBeUndefined();
    expect(db.form_questions.find((x) => x.question_id === q.id)).toBeUndefined();
    expect(db.questions.find((x) => x.id === q.id)).toBeUndefined();
  });
});
