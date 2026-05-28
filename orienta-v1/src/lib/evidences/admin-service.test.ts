import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EvidencesAdminService,
  EvidencesValidationError,
} from "./admin-service";

/**
 * Mock minimalista e determinista do PostgREST usado pelo
 * {@link EvidencesAdminService}. Cobre so o subset que o service realmente
 * toca: evidences (com join para responses), evidence_validations, forms,
 * organizations, questions.
 */

type EvidenceRow = {
  id: string;
  response_id: string;
  title: string;
  description: string;
  evidence_type: string;
  storage_path: string | null;
  external_link: string | null;
  exception_reason: string | null;
  submitted_by: string;
  submitted_at: string;
};

type ResponseRow = {
  id: string;
  form_id: string;
  organization_id: string;
  question_id: string;
};

type ValidationRow = {
  id: string;
  evidence_id: string;
  status: string;
  justification: string | null;
  validated_by: string;
  validated_at: string;
};

type FormRow = { id: string; name: string; version: number; archived_at: string | null };
type OrgRow = { id: string; name: string };
type QuestionRow = { id: string; prompt: string; requires_evidence: boolean };

type Db = {
  evidences: EvidenceRow[];
  responses: ResponseRow[];
  evidence_validations: ValidationRow[];
  forms: FormRow[];
  organizations: OrgRow[];
  questions: QuestionRow[];
};

let idCounter = 0;
function genId(prefix = "00000000-0000-4000-8000-") {
  idCounter += 1;
  return prefix + idCounter.toString(16).padStart(12, "0");
}

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
      nestedFilters: Record<string, Filter[]>; // relation -> filters
      selectColumns: string;
      orderBy?: { col: string; asc: boolean };
      limitN?: number;
      single?: "single" | "maybe";
      payload?: Row | Row[];
    } = {
      op: "select",
      rootFilters: [],
      nestedFilters: {},
      selectColumns: "*",
    };

    function addFilter(col: string, op: Filter["op"], val: unknown) {
      const dot = col.indexOf(".");
      if (dot === -1) {
        state.rootFilters.push({ col, op, val });
      } else {
        const rel = col.slice(0, dot);
        const nested = col.slice(dot + 1);
        const list = state.nestedFilters[rel] ?? [];
        list.push({ col: nested, op, val });
        state.nestedFilters[rel] = list;
      }
    }

    const api = {
      select(cols?: string) {
        state.selectColumns = cols ?? "*";
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
        addFilter(col, "eq", val);
        return api;
      },
      in(col: string, val: unknown[]) {
        addFilter(col, "in", val);
        return api;
      },
      is(col: string, val: unknown) {
        addFilter(col, "is", val);
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
        onFulfilled: (value: { data: unknown; error: unknown }) => TResult,
      ) {
        return run().then(onFulfilled);
      },
    };

    function parseRelations(
      cols: string,
    ): Array<{ name: string; alias: string; inner: boolean }> {
      const out: Array<{ name: string; alias: string; inner: boolean }> = [];
      // Procura por `alias:tabela!inner(...)` ou `tabela!inner(...)` no topo.
      // Abordagem simples: escaneia parens balanceados.
      let depth = 0;
      let start = 0;
      for (let i = 0; i <= cols.length; i += 1) {
        const ch = cols[i];
        if (ch === "(") {
          if (depth === 0) {
            start = i;
          }
          depth += 1;
        } else if (ch === ")") {
          depth -= 1;
          if (depth === 0) {
            // Olha backwards para encontrar `nome` antes do `(`.
            let j = start - 1;
            while (j >= 0 && /[a-zA-Z0-9_!:]/.test(cols[j]!)) j -= 1;
            const header = cols.slice(j + 1, start);
            const inner = header.includes("!inner");
            const clean = header.replace("!inner", "");
            const [alias, name] = clean.includes(":")
              ? clean.split(":")
              : [clean, clean];
            out.push({ name: name ?? clean, alias: alias ?? clean, inner });
          }
        }
      }
      return out;
    }

    function hydrateEvidenceRow(row: EvidenceRow): Row | null {
      const rels = parseRelations(state.selectColumns);
      const hydrated: Row = { ...row };
      for (const rel of rels) {
        if (rel.name === "responses") {
          const resp = db.responses.find((r) => r.id === row.response_id);
          const nestedFilters = state.nestedFilters["responses"] ?? [];
          if (!resp) {
            if (rel.inner) return null;
            hydrated[rel.alias] = null;
            continue;
          }
          if (!matches(resp as Row, nestedFilters)) {
            if (rel.inner) return null;
            hydrated[rel.alias] = null;
            continue;
          }
          hydrated[rel.alias] = clone(resp);
        }
      }
      return hydrated;
    }

    function run() {
      return Promise.resolve().then(() => {
        const rows = db[table] as unknown as Row[];
        if (state.op === "insert") {
          const toInsert = Array.isArray(state.payload)
            ? (state.payload as Row[])
            : [state.payload as Row];
          const created = toInsert.map((p) => {
            const row: Row = { ...p };
            row.id = row.id ?? genId();
            if (table === "evidence_validations") {
              row.validated_at = row.validated_at ?? new Date().toISOString();
            }
            if (table === "evidences") {
              row.submitted_at = row.submitted_at ?? new Date().toISOString();
            }
            return row;
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
        if (table === "evidences") {
          const hydrated: Row[] = [];
          for (const r of result) {
            const h = hydrateEvidenceRow(r as EvidenceRow);
            if (h) hydrated.push(h);
          }
          result = hydrated;
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
        if (state.limitN !== undefined) result = result.slice(0, state.limitN);
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
        return { data: clone(result), error: null };
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

function emptyDb(): Db {
  return {
    evidences: [],
    responses: [],
    evidence_validations: [],
    forms: [],
    organizations: [],
    questions: [],
  };
}

function seed(db: Db) {
  const orgA = { id: genId(), name: "Org A" };
  const orgB = { id: genId(), name: "Org B" };
  db.organizations.push(orgA, orgB);

  const form1: FormRow = { id: genId(), name: "Form 1", version: 1, archived_at: null };
  const form2: FormRow = { id: genId(), name: "Form 2", version: 1, archived_at: null };
  db.forms.push(form1, form2);

  const q1: QuestionRow = { id: genId(), prompt: "Q1", requires_evidence: true };
  const q2: QuestionRow = { id: genId(), prompt: "Q2", requires_evidence: false };
  db.questions.push(q1, q2);

  const respA1: ResponseRow = {
    id: genId(),
    form_id: form1.id,
    organization_id: orgA.id,
    question_id: q1.id,
  };
  const respA2: ResponseRow = {
    id: genId(),
    form_id: form2.id,
    organization_id: orgA.id,
    question_id: q2.id,
  };
  const respB1: ResponseRow = {
    id: genId(),
    form_id: form1.id,
    organization_id: orgB.id,
    question_id: q1.id,
  };
  db.responses.push(respA1, respA2, respB1);

  const evA1: EvidenceRow = {
    id: genId(),
    response_id: respA1.id,
    title: "Ev A1",
    description: "desc",
    evidence_type: "doc",
    storage_path: null,
    external_link: "https://ex/a1",
    exception_reason: "n/a",
    submitted_by: "user-1",
    submitted_at: "2025-01-01T10:00:00.000Z",
  };
  const evA2: EvidenceRow = {
    id: genId(),
    response_id: respA2.id,
    title: "Ev A2",
    description: "desc",
    evidence_type: "doc",
    storage_path: "path/a2",
    external_link: null,
    exception_reason: null,
    submitted_by: "user-1",
    submitted_at: "2025-01-02T10:00:00.000Z",
  };
  const evB1: EvidenceRow = {
    id: genId(),
    response_id: respB1.id,
    title: "Ev B1",
    description: "desc",
    evidence_type: "doc",
    storage_path: null,
    external_link: "https://ex/b1",
    exception_reason: "n/a",
    submitted_by: "user-2",
    submitted_at: "2025-01-03T10:00:00.000Z",
  };
  db.evidences.push(evA1, evA2, evB1);

  // Evidencia A1 ja tem uma validacao "approved".
  db.evidence_validations.push({
    id: genId(),
    evidence_id: evA1.id,
    status: "approved",
    justification: "ok",
    validated_by: "admin-org-1",
    validated_at: "2025-01-05T10:00:00.000Z",
  });

  return { orgA, orgB, form1, form2, evA1, evA2, evB1 };
}

describe("EvidencesAdminService", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("admin lista todas as evidencias de todas as organizacoes", async () => {
    const db = emptyDb();
    seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    const result = await svc.list({}, { role: "admin", organizationId: null });
    expect(result.total).toBe(3);
    expect(result.items.map((i) => i.title).sort()).toEqual([
      "Ev A1",
      "Ev A2",
      "Ev B1",
    ]);
  });

  it("admin org-scoped ve apenas a propria organizacao mesmo se passar outro organizationId", async () => {
    const db = emptyDb();
    const { orgA, orgB } = seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    const result = await svc.list(
      { organizationId: orgB.id },
      { role: "admin", organizationId: orgA.id },
    );
    expect(result.total).toBe(2);
    expect(result.items.every((i) => i.organizationId === orgA.id)).toBe(true);
  });

  it("filtra por formId", async () => {
    const db = emptyDb();
    const { form1 } = seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    const result = await svc.list(
      { formId: form1.id },
      { role: "admin", organizationId: null },
    );
    expect(result.items.map((i) => i.title).sort()).toEqual(["Ev A1", "Ev B1"]);
  });

  it("filtra por status atual (usando linha mais recente de evidence_validations)", async () => {
    const db = emptyDb();
    seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    const approved = await svc.list(
      { status: "approved" },
      { role: "admin", organizationId: null },
    );
    expect(approved.items.map((i) => i.title)).toEqual(["Ev A1"]);
    const pending = await svc.list(
      { status: "pending" },
      { role: "admin", organizationId: null },
    );
    expect(pending.items.map((i) => i.title).sort()).toEqual(["Ev A2", "Ev B1"]);
  });

  it("validate insere nova linha em evidence_validations e devolve entry com escopo", async () => {
    const db = emptyDb();
    const { evA2, form2, orgA } = seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    const before = db.evidence_validations.length;
    const result = await svc.validate(
      evA2.id,
      { status: "invalidated", justification: "faltou anexo" },
      "user-admin",
    );
    expect(result.entry.status).toBe("invalidated");
    expect(result.entry.justification).toBe("faltou anexo");
    expect(result.entry.validatedBy).toBe("user-admin");
    expect(result.scope).toEqual({ formId: form2.id, organizationId: orgA.id });
    expect(db.evidence_validations.length).toBe(before + 1);
  });

  it("validate com status=adjustment_requested sem justificativa lanca EvidencesValidationError", async () => {
    const db = emptyDb();
    const { evA2 } = seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    await expect(
      svc.validate(evA2.id, { status: "adjustment_requested" }, "user-admin"),
    ).rejects.toBeInstanceOf(EvidencesValidationError);
    await expect(
      svc.validate(
        evA2.id,
        { status: "adjustment_requested", justification: "   " },
        "user-admin",
      ),
    ).rejects.toBeInstanceOf(EvidencesValidationError);
  });

  it("validate com outros status e justificativa vazia persiste null", async () => {
    const db = emptyDb();
    const { evA2 } = seed(db);
    const svc = new EvidencesAdminService(buildMock(db));
    await svc.validate(evA2.id, { status: "approved" }, "user-admin");
    const row = db.evidence_validations.at(-1);
    expect(row?.status).toBe("approved");
    expect(row?.justification).toBeNull();
  });

  it("listFilterOptions devolve todas as orgs para admin global e apenas uma para org-scoped", async () => {
    const db = emptyDb();
    const { orgA } = seed(db);
    const svc = new EvidencesAdminService(buildMock(db));

    const adminOpts = await svc.listFilterOptions({
      role: "admin",
      organizationId: null,
    });
    expect(adminOpts.organizations.map((o) => o.name).sort()).toEqual([
      "Org A",
      "Org B",
    ]);

    const scopedOpts = await svc.listFilterOptions({
      role: "admin",
      organizationId: orgA.id,
    });
    expect(scopedOpts.organizations.map((o) => o.id)).toEqual([orgA.id]);
  });
});
