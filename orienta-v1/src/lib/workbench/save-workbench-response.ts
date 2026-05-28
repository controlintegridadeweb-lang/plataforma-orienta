import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  formatYesEvidenceErrors,
  validateYesWithEvidence,
  type YesEvidenceFieldErrors,
} from "@/lib/workbench/validate-yes-evidence";

const EVIDENCE_LINK_EXCEPTION =
  "Evidencia fornecida por link externo (campo obrigatorio no esquema de validacao do banco).";

const evidenceSchema = z
  .object({
    kind: z.enum(["file", "link"]),
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().max(4000).optional().default(""),
    storagePath: z.string().min(1).max(2000).optional(),
    externalLink: z.string().url().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "file" && !v.storagePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "storagePath e obrigatorio para evidencia por arquivo.",
        path: ["storagePath"],
      });
    }
    if (v.kind === "link" && !v.externalLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "externalLink e obrigatorio para evidencia por link.",
        path: ["externalLink"],
      });
    }
  });

export const workbenchResponseBodySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.enum(["yes", "no", "not_applicable"]),
  notes: z.string().optional(),
  evidence: evidenceSchema.optional(),
  /** Quando o binding tem cenario `nao_se_aplica`, persiste a marcacao N/A. */
  isNotApplicable: z.boolean().optional(),
});

export type WorkbenchResponseBody = z.infer<typeof workbenchResponseBodySchema>;

type SaveContext = { userId: string };

type SaveFailure = {
  ok: false;
  status: number;
  error: string;
  fields?: YesEvidenceFieldErrors;
};

type ExistingEvidenceRow = {
  title: string | null;
  storage_path: string | null;
  external_link: string | null;
};

function evidenceInputFromRequest(
  evidence: NonNullable<WorkbenchResponseBody["evidence"]>,
): {
  kind: "file" | "link";
  title: string;
  storagePath: string | null;
  externalLink: string | null;
} {
  return {
    kind: evidence.kind,
    title: evidence.title,
    storagePath: evidence.kind === "file" ? (evidence.storagePath ?? null) : null,
    externalLink: evidence.kind === "link" ? (evidence.externalLink ?? null) : null,
  };
}

function evidenceInputFromRow(row: ExistingEvidenceRow | null): {
  kind: "file" | "link" | null;
  title: string | null;
  storagePath: string | null;
  externalLink: string | null;
} | null {
  if (!row) return null;
  return {
    kind: row.storage_path ? "file" : row.external_link ? "link" : null,
    title: row.title,
    storagePath: row.storage_path,
    externalLink: row.external_link,
  };
}

/**
 * Lógica compartilhada entre /api/workbench/response e /api/dev/workbench-save-response.
 */
export async function saveWorkbenchResponseWithEvidence(
  supabase: SupabaseClient,
  ctx: SaveContext,
  data: WorkbenchResponseBody,
): Promise<
  | { ok: true; response: { id: string; answer: string; notes: string | null } }
  | SaveFailure
> {
  const { formId, questionId, answer, notes, evidence } = data;
  const isNotApplicable = data.isNotApplicable === true;
  const { userId } = ctx;
  const organizationId = data.organizationId;

  const { data: formRow, error: formErr } = await supabase
    .from("forms")
    .select("state")
    .eq("id", formId)
    .maybeSingle();
  if (formErr) throw formErr;
  if (!formRow) {
    return { ok: false, status: 400, error: "Formulario nao encontrado." };
  }
  if ((formRow.state as string) === "closed") {
    return {
      ok: false,
      status: 403,
      error:
        "Formulario encerrado. Novas respostas estao bloqueadas; abra uma reabertura autorizada antes de continuar.",
    };
  }

  const { data: linkRow, error: linkErr } = await supabase
    .from("form_questions")
    .select("question_id")
    .eq("form_id", formId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (linkErr) throw linkErr;
  if (!linkRow) {
    return { ok: false, status: 400, error: "Pergunta nao pertence a este formulario." };
  }

  const { data: questionRow, error: qErr } = await supabase
    .from("questions")
    .select("id, requires_evidence")
    .eq("id", questionId)
    .single();
  if (qErr) throw qErr;
  const requiresEvidence = Boolean(questionRow?.requires_evidence);

  if (evidence && (answer !== "yes" || !requiresEvidence)) {
    return {
      ok: false,
      status: 400,
      error: "Evidencia so pode ser enviada junto com resposta Sim em pergunta que exige anexo.",
    };
  }

  const { data: existingResponse, error: respLookupErr } = await supabase
    .from("responses")
    .select("id")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (respLookupErr) throw respLookupErr;

  let existingEvidence: ExistingEvidenceRow | null = null;
  if (existingResponse?.id) {
    const { data: evRow, error: evLookupErr } = await supabase
      .from("evidences")
      .select("title, storage_path, external_link")
      .eq("response_id", existingResponse.id as string)
      .maybeSingle();
    if (evLookupErr) throw evLookupErr;
    existingEvidence = evRow as ExistingEvidenceRow | null;
  }

  if (answer === "yes" && requiresEvidence) {
    const requestInput = evidence ? evidenceInputFromRequest(evidence) : { kind: null };
    const serverInput = evidenceInputFromRow(existingEvidence);
    const validation = validateYesWithEvidence(requestInput, serverInput);
    if (!validation.ok) {
      return {
        ok: false,
        status: 400,
        error: formatYesEvidenceErrors(validation.errors),
        fields: validation.errors,
      };
    }
  }

  if (evidence && answer === "yes" && requiresEvidence && evidence.kind === "file") {
    const prefix = `${organizationId}/${formId}/`;
    if (!evidence.storagePath?.startsWith(prefix)) {
      return {
        ok: false,
        status: 400,
        error: "Caminho de arquivo invalido. Faca o upload novamente.",
      };
    }
  }

  const { data: row, error } = await supabase
    .from("responses")
    .upsert(
      {
        form_id: formId,
        organization_id: organizationId,
        question_id: questionId,
        created_by: userId,
        answer,
        notes: notes ?? null,
        is_not_applicable: isNotApplicable,
      },
      { onConflict: "form_id,organization_id,question_id" },
    )
    .select("id,answer,notes")
    .single();
  if (error) throw error;

  const responseId = row.id as string;

  if (answer === "yes" && requiresEvidence && evidence) {
    const desc = (evidence.description?.trim() || "—").slice(0, 4000);
    const { data: existing, error: exErr } = await supabase
      .from("evidences")
      .select("id")
      .eq("response_id", responseId)
      .maybeSingle();
    if (exErr) throw exErr;

    if (evidence.kind === "file") {
      const ins = {
        response_id: responseId,
        storage_path: evidence.storagePath!,
        external_link: null,
        exception_reason: null,
        title: evidence.title,
        description: desc,
        evidence_type: "documento",
        submitted_by: userId,
      };
      if (existing) {
        const { error: u } = await supabase.from("evidences").update(ins).eq("id", existing.id);
        if (u) throw u;
      } else {
        const { error: i } = await supabase.from("evidences").insert(ins);
        if (i) throw i;
      }
    } else {
      const ins = {
        response_id: responseId,
        storage_path: null,
        external_link: evidence.externalLink!,
        exception_reason: EVIDENCE_LINK_EXCEPTION,
        title: evidence.title,
        description: desc,
        evidence_type: "documento",
        submitted_by: userId,
      };
      if (existing) {
        const { error: u } = await supabase.from("evidences").update(ins).eq("id", existing.id);
        if (u) throw u;
      } else {
        const { error: i } = await supabase.from("evidences").insert(ins);
        if (i) throw i;
      }
    }
  }

  return { ok: true, response: row as { id: string; answer: string; notes: string | null } };
}
