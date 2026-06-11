import { describe, it, expect } from "vitest";
import { parsePatentCsv, patentsToCsv, splitCsvLine } from "./patentCsv";
import type { PatentListItem } from "../types/patent";

// F5: CSV 내보내기/가져오기 — 따옴표 셀·필수 컬럼·BOM 처리 회귀 가드.
describe("patentCsv (F5)", () => {
  it("따옴표로 감싼 셀과 이스케이프를 분리한다", () => {
    expect(splitCsvLine('a,"b,c","d""e"')).toEqual(["a", "b,c", 'd"e']);
  });

  it("필수 컬럼이 없으면 에러를 반환한다", () => {
    const result = parsePatentCsv("title\n특허A");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("managementNumber");
  });

  it("헤더 매핑으로 행을 파싱하고 필수값 누락 행은 에러로 모은다", () => {
    const csv = [
      "managementNumber,title,country,applicationDate",
      "P2026-KR0,테스트 특허,KR,2024-01-01",
      ",제목만 있음,KR,",
    ].join("\n");
    const result = parsePatentCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].payload.managementNumber).toBe("P2026-KR0");
    expect(result.rows[0].payload.country).toBe("KR");
    expect(result.errors).toHaveLength(1);
  });

  it("내보내기는 BOM과 헤더를 포함하고 쉼표 셀을 인용한다", () => {
    const csv = patentsToCsv([
      { managementNumber: "P1", title: "쉼표,제목", country: "KR", applicationNumber: "10-1",
        registrationNumber: null, feeDueDate: "2026-08-01", departmentName: "A사업부",
        businessArea: "Data", technologyArea: "AI" } as unknown as PatentListItem,
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"쉼표,제목"');
    expect(csv.split("\n")[0]).toContain("managementNumber");
  });
});
