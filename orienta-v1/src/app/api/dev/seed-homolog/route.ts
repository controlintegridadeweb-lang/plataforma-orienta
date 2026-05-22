import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { logError } from "@/lib/observability/logger";

const payloadSchema = z.object({
  adminUserId: z.string().uuid(),
  respondentUserId: z.string().uuid(),
  analystUserId: z.string().uuid(),
  organizationName: z.string().min(3).default("Secretaria Exemplo RN"),
  formName: z.string().min(3).default("Diagnostico PIC RN"),
});

export async function POST(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
  const { context, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { adminUserId, respondentUserId, analystUserId, organizationName, formName } = parsed.data;
  if (context?.userId !== adminUserId) {
    return NextResponse.json({ error: "Usuario admin divergente do token informado." }, { status: 403 });
  }

  try {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .upsert({ name: organizationName }, { onConflict: "name" })
      .select("id,name")
      .single();
    if (orgError) throw orgError;

    const profiles = [
      { user_id: adminUserId, role: "admin", organization_id: org.id },
      { user_id: analystUserId, role: "analyst", organization_id: org.id },
      { user_id: respondentUserId, role: "respondent", organization_id: org.id },
    ];
    const { error: profileError } = await supabase.from("profiles").upsert(profiles);
    if (profileError) throw profileError;

    const axesPayload = [{ name: "Governanca" }, { name: "Ambiental" }, { name: "Social" }];
    const { data: axes, error: axesError } = await supabase
      .from("axes")
      .upsert(axesPayload, { onConflict: "name" })
      .select("id,name");
    if (axesError) throw axesError;

    const governanceAxis = axes?.find((a) => a.name === "Governanca");
    const environmentalAxis = axes?.find((a) => a.name === "Ambiental");
    const socialAxis = axes?.find((a) => a.name === "Social");
    if (!governanceAxis || !environmentalAxis || !socialAxis) {
      throw new Error("Falha ao preparar eixos padrao.");
    }

    const sectionsPayload = [
      { axis_id: governanceAxis.id, name: "Gestao de Riscos" },
      { axis_id: environmentalAxis.id, name: "Compliance Ambiental" },
      { axis_id: socialAxis.id, name: "Diversidade e Inclusao" },
    ];
    const { data: sections, error: sectionsError } = await supabase
      .from("sections")
      .upsert(sectionsPayload, { onConflict: "axis_id,name" })
      .select("id,axis_id,name");
    if (sectionsError) throw sectionsError;

    const sectionByName = new Map((sections ?? []).map((s) => [s.name, s.id]));
    const riskSectionId = sectionByName.get("Gestao de Riscos");
    const envSectionId = sectionByName.get("Compliance Ambiental");
    const socialSectionId = sectionByName.get("Diversidade e Inclusao");
    if (!riskSectionId || !envSectionId || !socialSectionId) {
      throw new Error("Falha ao preparar secoes padrao.");
    }

    const { data: form, error: formError } = await supabase
      .from("forms")
      .upsert(
        {
          name: formName,
          version: 1,
          state: "submitted",
          created_by: adminUserId,
        },
        { onConflict: "name,version" },
      )
      .select("id,name,version")
      .single();
    if (formError) throw formError;

    const questionPayload = [
      {
        section_id: riskSectionId,
        prompt: "Existe comite formal de integridade?",
        requires_evidence: true,
        fami_enabled: true,
        recommendation_text: "Instituir e formalizar comite de integridade com evidencias documentais.",
      },
      {
        section_id: envSectionId,
        prompt: "O orgao executa plano anual de capacitacao ambiental?",
        requires_evidence: false,
        fami_enabled: true,
        recommendation_text: "Consolidar plano anual de capacitacao ambiental.",
      },
      {
        section_id: socialSectionId,
        prompt: "Ha politica de diversidade publicada e monitorada?",
        requires_evidence: true,
        fami_enabled: true,
        recommendation_text: "Publicar e monitorar politica de diversidade com indicadores.",
      },
    ];
    const { data: questions, error: questionError } = await supabase
      .from("questions")
      .insert(questionPayload)
      .select("id");
    if (questionError) throw questionError;

    const formQuestions = (questions ?? []).map((question) => ({
      form_id: form.id,
      question_id: question.id,
    }));
    const { error: formQuestionsError } = await supabase
      .from("form_questions")
      .upsert(formQuestions);
    if (formQuestionsError) throw formQuestionsError;

    const responsesPayload = [
      {
        form_id: form.id,
        organization_id: org.id,
        question_id: questions?.[0]?.id,
        answer: "yes",
        notes: "Comite em funcionamento.",
        created_by: respondentUserId,
      },
      {
        form_id: form.id,
        organization_id: org.id,
        question_id: questions?.[1]?.id,
        answer: "yes",
        notes: "Capacitacoes realizadas sem anexos obrigatorios.",
        created_by: respondentUserId,
      },
      {
        form_id: form.id,
        organization_id: org.id,
        question_id: questions?.[2]?.id,
        answer: "partial",
        notes: "Politica em elaboracao.",
        created_by: respondentUserId,
      },
    ];
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .upsert(responsesPayload, { onConflict: "form_id,organization_id,question_id" })
      .select("id,question_id");
    if (responsesError) throw responsesError;

    const evidenceResponse = responses?.find((response) => response.question_id === questions?.[0]?.id);
    if (evidenceResponse) {
      const { data: evidence, error: evidenceError } = await supabase
        .from("evidences")
        .insert({
          response_id: evidenceResponse.id,
          storage_path: "evidencias/comite-integridade.pdf",
          title: "Ata comite integridade",
          description: "Ata e portaria de instituicao do comite.",
          evidence_type: "documento",
          submitted_by: respondentUserId,
        })
        .select("id")
        .single();
      if (evidenceError) throw evidenceError;

      const { error: validationError } = await supabase.from("evidence_validations").insert({
        evidence_id: evidence.id,
        status: "valid",
        validated_by: analystUserId,
      });
      if (validationError) throw validationError;
    }

    return NextResponse.json({
      message: "Seed de homologacao criado com sucesso.",
      organizationId: org.id,
      formId: form.id,
    });
  } catch (error) {
    logError("Failed to run seed homolog", error, { route: "/api/dev/seed-homolog" });
    if (error && typeof error === "object") {
      const maybePostgrest = error as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };
      return NextResponse.json(
        {
          error: maybePostgrest.message ?? "Falha ao criar seed.",
          code: maybePostgrest.code ?? null,
          details: maybePostgrest.details ?? null,
          hint: maybePostgrest.hint ?? null,
        },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : "Falha ao criar seed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
