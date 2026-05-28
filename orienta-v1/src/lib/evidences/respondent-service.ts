import { z } from "zod";
import {
  EvidencesAdminService,
  type EvidenceListItem,
} from "./admin-service";
import {
  deriveRespondentStatus,
  overallStatus,
  statusToKpiBucket,
  type RespondentEvidenceStatus,
  type RespondentOverallStatus,
} from "./respondent-status";

/**
 * Esquema de filtros aceito pela aba do respondente.
 * Reaproveita o mesmo motor de busca/datas/forms da listagem do admin,
 * mas EXPONHE apenas o que faz sentido para o respondente:
 * - sem `organizationId` (escopado pelo `caller`)
 * - sem `ids` (exportacao admin)
 * - status na linguagem do respondente
 */
export const respondentEvidenceListQuerySchema = z.object({
  formId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z
    .enum([
      "enviada",
      "aguardando_analise",
      "aprovada",
      "reprovada",
      "complementacao_solicitada",
      "ajustada_e_reenviada",
    ])
    .optional(),
  /** Atalho do cartao "Somente pendencias". */
  pendingOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type RespondentEvidenceListQuery = z.infer<
  typeof respondentEvidenceListQuerySchema
>;

export type RespondentEvidenceItem = EvidenceListItem & {
  respondentStatus: RespondentEvidenceStatus;
  /** Marcador derivado: "precisa de acao do respondente". */
  needsAction: boolean;
  /** Quando ocorreu a complementacao mais recente (se houver). */
  lastComplementationAt: string | null;
};

export type RespondentEvidenceListResult = {
  items: RespondentEvidenceItem[];
  total: number;
  limit: number;
  offset: number;
};

export type RespondentStatsResult = {
  enviadas: number;
  aprovadas: number;
  aguardando: number;
  reprovadas: number;
  complementacao: number;
  overall: RespondentOverallStatus;
  /** Indica se o respondente tem ao menos uma pendencia (acao requerida). */
  hasPendency: boolean;
};

/** Caller fixo do respondente: org obrigatoria. */
export type RespondentCaller = { organizationId: string };

/**
 * Servico que entrega a fila escopada para o respondente (mesma fonte do
 * admin — `evidences` + `evidence_validations`).
 *
 * Estende {@link EvidencesAdminService} apenas para reusar o motor de
 * leitura (`loadHydratedItems` + `applyEvidenceQueryFilters`). Nao usa
 * `validate()` nem `listFilterOptions()` do pai.
 */
export class RespondentEvidencesService extends EvidencesAdminService {
  /**
   * Lista evidencias da organizacao do respondente com filtros amigaveis.
   * Aplica ordenacao por relevancia: pendencias primeiro, depois mais recentes.
   */
  async listForRespondent(
    rawQuery: unknown,
    caller: RespondentCaller,
  ): Promise<RespondentEvidenceListResult> {
    const query = this.parse(respondentEvidenceListQuerySchema, rawQuery);
    const items = await this.loadHydrated(caller, query);
    const enriched = items.map(toRespondentItem);
    const narrowed = this.filterRespondent(enriched, query);

    narrowed.sort((a, b) => {
      // 1) Pendencias primeiro
      const aP = a.needsAction ? 0 : 1;
      const bP = b.needsAction ? 0 : 1;
      if (aP !== bP) return aP - bP;
      // 2) Mais recentes primeiro
      const da = new Date(a.submittedAt).getTime();
      const db = new Date(b.submittedAt).getTime();
      return db - da;
    });

    const total = narrowed.length;
    const paged = narrowed.slice(query.offset, query.offset + query.limit);
    return { items: paged, total, limit: query.limit, offset: query.offset };
  }

  async statsForRespondent(
    rawQuery: unknown,
    caller: RespondentCaller,
  ): Promise<RespondentStatsResult> {
    const query = this.parse(
      respondentEvidenceListQuerySchema.omit({ limit: true, offset: true, status: true, pendingOnly: true }),
      rawQuery,
    );
    const items = await this.loadHydrated(caller, query);
    const enriched = items.map(toRespondentItem);
    const buckets = {
      enviadas: enriched.length,
      aprovadas: 0,
      aguardando: 0,
      reprovadas: 0,
      complementacao: 0,
    };
    for (const it of enriched) {
      const k = statusToKpiBucket(it.respondentStatus);
      buckets[k] += 1;
    }
    return {
      ...buckets,
      overall: overallStatus(buckets),
      hasPendency: buckets.reprovadas + buckets.complementacao > 0,
    };
  }

  // -- Internos ---------------------------------------------------------

  private async loadHydrated(
    caller: RespondentCaller,
    query: Pick<RespondentEvidenceListQuery, "formId" | "search" | "from" | "to">,
  ): Promise<EvidenceListItem[]> {
    const base = await this.loadHydratedItems(
      { role: "respondent", organizationId: caller.organizationId },
      { formId: query.formId, organizationId: caller.organizationId },
    );
    return this.applyEvidenceQueryFilters(base, {
      search: query.search,
      from: query.from,
      to: query.to,
      ids: undefined,
    });
  }

  private filterRespondent(
    items: RespondentEvidenceItem[],
    query: RespondentEvidenceListQuery,
  ): RespondentEvidenceItem[] {
    let out = items;
    if (query.status) {
      out = out.filter((it) => it.respondentStatus === query.status);
    }
    if (query.pendingOnly) {
      out = out.filter((it) => it.needsAction);
    }
    return out;
  }
}

function toRespondentItem(item: EvidenceListItem): RespondentEvidenceItem {
  const respondentStatus = deriveRespondentStatus(item.currentStatus, item.history);
  const lastComplementationAt =
    item.history.find((h) => h.status === "adjustment_requested")?.validatedAt ?? null;
  return {
    ...item,
    respondentStatus,
    needsAction:
      respondentStatus === "complementacao_solicitada" ||
      respondentStatus === "reprovada",
    lastComplementationAt,
  };
}
