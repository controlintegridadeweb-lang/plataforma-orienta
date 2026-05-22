/**
 * Tipos compartilhados entre servico, rotas API e UI da aba "Respostas" do
 * modulo Formularios. Mantidos isolados de `admin-service.ts` para deixar
 * claro que aqui e leitura/agregacao (nao CRUD).
 *
 * Convencao de "respondente": no dominio da Plataforma Orienta um respondente
 * e uma ORGANIZACAO (orgao). A unicidade em `responses (form_id, organization_id,
 * question_id)` garante uma resposta por pergunta por orgao. O detalhe lista
 * os usuarios que contribuiram via `responses.created_by`.
 */

/** Resposta enumerada (DB enum `answer_value`). */
export type AnswerValue = "yes" | "no" | "partial";

/**
 * Tipo de metrica do binding (espelha `LibraryMetricAnswerType`). Quando a
 * pergunta nao tem binding (legado) tratamos como `yes_no`.
 */
export type QuestionAnswerType = "yes_no" | "scale" | "numeric" | "text";

/** Status agregado do respondente (orgao) sobre o formulario. */
export type RespondentStatus =
  | "nao_iniciada"
  | "em_preenchimento"
  | "completa"
  | "submetida"
  | "em_complementacao";

export const RESPONDENT_STATUS_VALUES: readonly RespondentStatus[] = [
  "nao_iniciada",
  "em_preenchimento",
  "completa",
  "submetida",
  "em_complementacao",
] as const;

export type AnswersOverview = {
  formId: string;
  formName: string;
  totalRespondents: number;
  totalQuestions: number;
  lastAnswerAt: string | null;
  /** Quantidade de orgaos em cada bucket de status (chaves sempre presentes). */
  statusBreakdown: Record<RespondentStatus, number>;
};

/** Contagem por valor enumerado da pergunta (apenas para tipos objetivos). */
export type AnswerValueDistribution = {
  yes: number;
  no: number;
  partial: number;
};

/** Linha textual exibida em perguntas discursivas (tipo `text`). */
export type AnswerTextEntry = {
  responseId: string;
  organizationId: string;
  organizationName: string;
  notes: string;
  answer: AnswerValue | null;
  updatedAt: string;
};

export type AnswersSummaryQuestion = {
  questionId: string;
  orderIndex: number;
  prompt: string;
  answerType: QuestionAnswerType;
  totalResponses: number;
  distribution: AnswerValueDistribution;
  /** Apenas preenchido para perguntas `text` (mais recentes primeiro, limitado). */
  textEntries: AnswerTextEntry[];
};

export type AnswersSummary = {
  formId: string;
  totalRespondents: number;
  questions: AnswersSummaryQuestion[];
};

export type RespondentRow = {
  organizationId: string;
  organizationName: string;
  answeredQuestions: number;
  totalQuestions: number;
  lastUpdatedAt: string;
  status: RespondentStatus;
  /** Quantidade de usuarios distintos que ja contribuiram com alguma resposta. */
  contributorCount: number;
};

export type RespondentListCursor = {
  /** ISO timestamp do `lastUpdatedAt` da ultima linha da pagina anterior. */
  updatedAt: string;
  /** Tiebreaker. */
  organizationId: string;
};

export type RespondentListPage = {
  rows: RespondentRow[];
  nextCursor: RespondentListCursor | null;
};

export type RespondentFilterOptions = {
  organizations: { id: string; name: string }[];
};

/** Detalhe de uma celula de resposta exibida na visao individual. */
export type RespondentAnswerCell = {
  questionId: string;
  orderIndex: number;
  prompt: string;
  answerType: QuestionAnswerType;
  answer: AnswerValue | null;
  notes: string | null;
  updatedAt: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  /** Pergunta dispensada institucionalmente para este orgao (admin). */
  isWaived: boolean;
  waiverReason: string | null;
  /** Respondente marcou "Nao se aplica" (sinal persistido em responses). */
  isNotApplicable: boolean;
  /** Binding da pergunta marca o cenario `nao_se_aplica` como elegivel. */
  hasNotApplicableScenario: boolean;
  evidence: {
    id: string;
    title: string;
    description: string | null;
    externalLink: string | null;
    storagePath: string | null;
    validationStatus: string | null;
  } | null;
};

export type RespondentContributor = {
  userId: string;
  fullName: string | null;
  /** Numero de respostas em que este usuario aparece como `created_by`. */
  contributions: number;
};

export type RespondentDetail = {
  organizationId: string;
  organizationName: string;
  status: RespondentStatus;
  answeredQuestions: number;
  totalQuestions: number;
  /** Perguntas dispensadas institucionalmente para este orgao. */
  waivedQuestions: number;
  /**
   * Total efetivo de perguntas aplicaveis ao orgao (total - dispensas - N/A).
   * Usado para o progresso e para a contagem na visao individual.
   */
  applicableQuestions: number;
  lastUpdatedAt: string | null;
  firstAnsweredAt: string | null;
  contributors: RespondentContributor[];
  answers: RespondentAnswerCell[];
};

export type AnswersListFilters = {
  organizationId?: string | null;
  status?: RespondentStatus | null;
  /** ISO date (inclusive, comparado contra `lastUpdatedAt`). */
  from?: string | null;
  /** ISO date (inclusive, comparado contra `lastUpdatedAt`). */
  to?: string | null;
};

export type AnswersListQuery = AnswersListFilters & {
  cursor?: RespondentListCursor | null;
  limit?: number;
};

export type AnswersExportFormat = "csv" | "pdf" | "xlsx";

/** Limite seguro de itens textuais por pergunta `text` na rota de summary. */
export const SUMMARY_TEXT_ENTRIES_LIMIT = 50;

export const RESPONDENT_LIST_DEFAULT_LIMIT = 25;
export const RESPONDENT_LIST_MAX_LIMIT = 100;

/** Rotulos PT para `RespondentStatus`. */
export const RESPONDENT_STATUS_LABEL: Record<RespondentStatus, string> = {
  nao_iniciada: "Nao iniciada",
  em_preenchimento: "Em preenchimento",
  completa: "Completa",
  submetida: "Submetida",
  em_complementacao: "Em complementacao",
};
