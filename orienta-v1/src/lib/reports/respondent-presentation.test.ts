import { describe, expect, it } from "vitest";
import {
  canGenerateOfficialPdf,
  defaultReportKindForOfficialPdf,
} from "./respondent-presentation";

describe("respondent report presentation", () => {
  it("default kind is executive", () => {
    expect(defaultReportKindForOfficialPdf()).toBe("executive");
  });

  it("canGenerateOfficialPdf allows executive and consolidated with pdf_executive", () => {
    expect(canGenerateOfficialPdf("executive", "pdf_executive")).toBe(true);
    expect(canGenerateOfficialPdf("consolidated", "pdf_executive")).toBe(true);
    expect(canGenerateOfficialPdf("technical", "pdf_executive")).toBe(false);
    expect(canGenerateOfficialPdf("executive", "csv")).toBe(false);
  });
});
