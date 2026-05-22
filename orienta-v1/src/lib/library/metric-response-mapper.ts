import type {
  LibraryMetricAnswerType,
  LibraryMetricInterpretation,
} from "./types";
import type { AnswerValue } from "@/lib/domain/types";

/**
 * Faixas para respostas em escala (1 a 5). Valores sao limites superiores
 * inclusivos dentro do eixo "valor numerico da escala", independentemente do
 * sentido de `interpretation`:
 *
 * - `failMax`: maior valor que ainda conta como resposta "negativa" (no).
 * - `partialMax`: maior valor que ainda conta como resposta "parcial" (partial).
 *
 * Deve valer `1 <= failMax < partialMax < 5`.
 *
 * Quando `interpretation = higher_better`, valores altos sao melhores, entao a
 * faixa "no" fica nas notas baixas (1..failMax) e "yes" nas altas.
 * Quando `interpretation = lower_better`, invertemos a leitura: valores baixos
 * viram "yes" e altos viram "no" usando os mesmos limites.
 */
export type ScaleBands = {
  failMax: number;
  partialMax: number;
};

/**
 * Limiares para respostas numericas (em unidade da metrica). Valores sao
 * limites superiores inclusivos, igualmente organizados no eixo do valor bruto:
 *
 * - `failBelow`: ate esse valor a resposta conta como "no".
 * - `partialBelow`: ate esse valor a resposta conta como "partial".
 *
 * Deve valer `failBelow < partialBelow`.
 *
 * Como em `ScaleBands`, o sentido da interpretacao (melhor = maior ou menor)
 * inverte o mapeamento para `AnswerValue`, mas os limiares sao sempre no eixo
 * natural da metrica.
 */
export type NumericThresholds = {
  failBelow: number;
  partialBelow: number;
};

/** Mapeamento opcional por pergunta, sobrescreve os defaults. */
export type ResponseMapping = {
  scaleBands?: ScaleBands | null;
  numericThresholds?: NumericThresholds | null;
};

export const DEFAULT_SCALE_BANDS: ScaleBands = {
  failMax: 2,
  partialMax: 3,
};

export type MapMetricValueInput = {
  answerType: LibraryMetricAnswerType;
  interpretation: LibraryMetricInterpretation;
  scaleValue?: number | null;
  numericValue?: number | null;
  mapping?: ResponseMapping | null;
};

export type MapMetricValueResult =
  | { kind: "mapped"; answer: AnswerValue }
  | { kind: "skipped"; reason: string };

function clampBands(bands: ScaleBands): ScaleBands | null {
  const { failMax, partialMax } = bands;
  if (!Number.isFinite(failMax) || !Number.isFinite(partialMax)) return null;
  if (failMax < 1 || partialMax > 5) return null;
  if (failMax >= partialMax) return null;
  return bands;
}

function mapByBands(value: number, bands: ScaleBands): AnswerValue {
  if (value <= bands.failMax) return "no";
  if (value <= bands.partialMax) return "partial";
  return "yes";
}

function invertAnswer(answer: AnswerValue): AnswerValue {
  if (answer === "yes") return "no";
  if (answer === "no") return "yes";
  return "partial";
}

export function mapScaleValue(
  scaleValue: number,
  interpretation: LibraryMetricInterpretation,
  bands: ScaleBands | null | undefined = DEFAULT_SCALE_BANDS,
): MapMetricValueResult {
  if (!Number.isFinite(scaleValue)) {
    return { kind: "skipped", reason: "scaleValue nao numerico" };
  }
  if (scaleValue < 1 || scaleValue > 5) {
    return { kind: "skipped", reason: "scaleValue fora do intervalo 1..5" };
  }
  const safeBands = (bands && clampBands(bands)) ?? DEFAULT_SCALE_BANDS;
  if (interpretation === "qualitative") {
    return {
      kind: "skipped",
      reason:
        "metrica qualitative nao possui direcao numerica; configure override ou responda manualmente",
    };
  }
  const raw = mapByBands(scaleValue, safeBands);
  const answer = interpretation === "lower_better" ? invertAnswer(raw) : raw;
  return { kind: "mapped", answer };
}

export function mapNumericValue(
  numericValue: number,
  interpretation: LibraryMetricInterpretation,
  thresholds: NumericThresholds | null | undefined,
): MapMetricValueResult {
  if (!Number.isFinite(numericValue)) {
    return { kind: "skipped", reason: "numericValue nao numerico" };
  }
  if (!thresholds) {
    return {
      kind: "skipped",
      reason: "metrica numerica exige numericThresholds no vinculo da pergunta",
    };
  }
  if (
    !Number.isFinite(thresholds.failBelow) ||
    !Number.isFinite(thresholds.partialBelow) ||
    thresholds.failBelow >= thresholds.partialBelow
  ) {
    return {
      kind: "skipped",
      reason: "numericThresholds invalidos (failBelow deve ser menor que partialBelow)",
    };
  }
  if (interpretation === "qualitative") {
    return {
      kind: "skipped",
      reason:
        "metrica qualitative nao possui direcao numerica; configure override ou responda manualmente",
    };
  }
  const raw: AnswerValue =
    numericValue <= thresholds.failBelow
      ? "no"
      : numericValue <= thresholds.partialBelow
        ? "partial"
        : "yes";
  const answer = interpretation === "lower_better" ? invertAnswer(raw) : raw;
  return { kind: "mapped", answer };
}

/**
 * Converte uma resposta em escala ou numerica para o trio yes/no/partial usado
 * pelo motor v2. Retorna `{ kind: "skipped", reason }` quando nao ha como
 * inferir (tipo nao suportado, valor ausente ou metrica qualitative sem
 * override). O caller decide se isso vira erro de API ou fallback.
 */
export function mapMetricValueToAnswer(input: MapMetricValueInput): MapMetricValueResult {
  const { answerType, interpretation, scaleValue, numericValue, mapping } = input;
  if (answerType === "scale") {
    if (scaleValue === null || scaleValue === undefined) {
      return { kind: "skipped", reason: "scaleValue ausente" };
    }
    return mapScaleValue(scaleValue, interpretation, mapping?.scaleBands);
  }
  if (answerType === "numeric") {
    if (numericValue === null || numericValue === undefined) {
      return { kind: "skipped", reason: "numericValue ausente" };
    }
    return mapNumericValue(numericValue, interpretation, mapping?.numericThresholds);
  }
  return {
    kind: "skipped",
    reason: `answerType ${answerType} nao requer mapeamento numerico`,
  };
}
