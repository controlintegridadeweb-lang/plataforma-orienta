import { QuestionInput } from "./types";

export type FamiScopeResult = {
  pointsObtained: number;
  pointsPossible: number;
  percentage: number;
  maturityLevel: 1 | 2 | 3 | 4 | 5;
};

export type FamiSummary = {
  bySection: Record<string, FamiScopeResult>;
  byAxis: Record<string, FamiScopeResult>;
  global: FamiScopeResult;
};

function getWeight(question: QuestionInput): number {
  return question.requiresEvidence ? 1.5 : 1;
}

function calculateLevel(percentage: number): 1 | 2 | 3 | 4 | 5 {
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage <= 75) return 3;
  if (percentage <= 90) return 4;
  return 5;
}

function scoreQuestion(question: QuestionInput): number {
  if (question.isNotApplicable || !question.famiEnabled) {
    return 0;
  }

  if (question.answer !== "yes") {
    return 0;
  }

  if (!question.requiresEvidence) {
    return 1;
  }

  if (question.validationStatus === "valid" || question.validationStatus === "waived") {
    return 1.5;
  }

  return 0;
}

function calculateScope(questions: QuestionInput[]): FamiScopeResult {
  const scoped = questions.filter((q) => !q.isNotApplicable && q.famiEnabled);
  const pointsPossible = scoped.reduce((sum, q) => sum + getWeight(q), 0);
  const pointsObtained = scoped.reduce((sum, q) => sum + scoreQuestion(q), 0);
  const percentage = pointsPossible > 0 ? (pointsObtained / pointsPossible) * 100 : 0;

  return {
    pointsObtained: Number(pointsObtained.toFixed(2)),
    pointsPossible: Number(pointsPossible.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
    maturityLevel: calculateLevel(percentage),
  };
}

export function calculateFami(questions: QuestionInput[]): FamiSummary {
  const bySectionIds = [...new Set(questions.map((q) => q.sectionId))];
  const byAxisIds = [...new Set(questions.map((q) => q.axisId))];

  const bySection = Object.fromEntries(
    bySectionIds.map((sectionId) => [
      sectionId,
      calculateScope(questions.filter((q) => q.sectionId === sectionId)),
    ]),
  );

  const byAxis = Object.fromEntries(
    byAxisIds.map((axisId) => [
      axisId,
      calculateScope(questions.filter((q) => q.axisId === axisId)),
    ]),
  );

  return {
    bySection,
    byAxis,
    global: calculateScope(questions),
  };
}
