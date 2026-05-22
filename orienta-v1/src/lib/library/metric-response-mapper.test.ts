import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCALE_BANDS,
  mapMetricValueToAnswer,
  mapNumericValue,
  mapScaleValue,
} from "./metric-response-mapper";

describe("mapScaleValue (defaults, higher_better)", () => {
  it.each([
    [1, "no"],
    [2, "no"],
    [3, "partial"],
    [4, "yes"],
    [5, "yes"],
  ])("value %s -> %s", (value, expected) => {
    const result = mapScaleValue(value, "higher_better");
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") expect(result.answer).toBe(expected);
  });
});

describe("mapScaleValue (lower_better inverts)", () => {
  it.each([
    [1, "yes"],
    [2, "yes"],
    [3, "partial"],
    [4, "no"],
    [5, "no"],
  ])("value %s -> %s", (value, expected) => {
    const result = mapScaleValue(value, "lower_better");
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") expect(result.answer).toBe(expected);
  });
});

describe("mapScaleValue (qualitative)", () => {
  it("skips without override", () => {
    const result = mapScaleValue(3, "qualitative");
    expect(result.kind).toBe("skipped");
  });
});

describe("mapScaleValue (custom bands)", () => {
  it("honors narrower failMax", () => {
    const result = mapScaleValue(2, "higher_better", { failMax: 1, partialMax: 3 });
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") expect(result.answer).toBe("partial");
  });

  it("falls back to defaults when bands invalid", () => {
    const result = mapScaleValue(2, "higher_better", { failMax: 4, partialMax: 2 });
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") expect(result.answer).toBe("no");
    expect(DEFAULT_SCALE_BANDS.failMax).toBe(2);
  });
});

describe("mapScaleValue (validation)", () => {
  it("skips values out of 1..5", () => {
    expect(mapScaleValue(0, "higher_better").kind).toBe("skipped");
    expect(mapScaleValue(6, "higher_better").kind).toBe("skipped");
  });
});

describe("mapNumericValue", () => {
  const thresholds = { failBelow: 30, partialBelow: 70 };

  it.each([
    [10, "higher_better", "no"],
    [30, "higher_better", "no"],
    [50, "higher_better", "partial"],
    [70, "higher_better", "partial"],
    [90, "higher_better", "yes"],
  ])("higher_better %s -> %s", (value, interp, expected) => {
    const result = mapNumericValue(value, interp as "higher_better", thresholds);
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") expect(result.answer).toBe(expected);
  });

  it("inverts on lower_better", () => {
    const result = mapNumericValue(10, "lower_better", thresholds);
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") expect(result.answer).toBe("yes");
  });

  it("skips when thresholds missing", () => {
    expect(mapNumericValue(10, "higher_better", null).kind).toBe("skipped");
  });

  it("skips when thresholds inverted", () => {
    expect(
      mapNumericValue(10, "higher_better", { failBelow: 70, partialBelow: 30 }).kind,
    ).toBe("skipped");
  });

  it("skips when qualitative", () => {
    expect(mapNumericValue(50, "qualitative", thresholds).kind).toBe("skipped");
  });
});

describe("mapMetricValueToAnswer dispatch", () => {
  it("routes scale", () => {
    const result = mapMetricValueToAnswer({
      answerType: "scale",
      interpretation: "higher_better",
      scaleValue: 5,
    });
    expect(result).toEqual({ kind: "mapped", answer: "yes" });
  });

  it("routes numeric with mapping", () => {
    const result = mapMetricValueToAnswer({
      answerType: "numeric",
      interpretation: "higher_better",
      numericValue: 80,
      mapping: { numericThresholds: { failBelow: 30, partialBelow: 70 } },
    });
    expect(result).toEqual({ kind: "mapped", answer: "yes" });
  });

  it("skips when scale value missing", () => {
    const result = mapMetricValueToAnswer({
      answerType: "scale",
      interpretation: "higher_better",
    });
    expect(result.kind).toBe("skipped");
  });

  it("skips when numeric thresholds missing", () => {
    const result = mapMetricValueToAnswer({
      answerType: "numeric",
      interpretation: "higher_better",
      numericValue: 50,
    });
    expect(result.kind).toBe("skipped");
  });

  it("skips for unrelated answerType", () => {
    const result = mapMetricValueToAnswer({
      answerType: "yes_no",
      interpretation: "higher_better",
    });
    expect(result.kind).toBe("skipped");
  });
});
