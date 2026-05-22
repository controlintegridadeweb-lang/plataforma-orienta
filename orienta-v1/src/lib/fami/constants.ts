/** Sentinela de `formId` na API: todos os formulários da organização (visão institucional). */
export const FAMI_ALL_FORMS = "all" as const;

export type InstitutionalFormScore = {
  formId: string;
  percentage: number;
  maturityLevel: number;
  pointsObtained: number;
  pointsPossible: number;
  createdAt: string;
  processingVersion: number;
};
