/**
 * @author 유건욱
 * @date 2026-06-12
 */
import { describe, it, expect } from "vitest";
import { parsePatentCsv, patentsToCsv, splitCsvLine } from "./patentCsv";
import type { PatentListItem } from "../types/patent";

/**
 * @relatedFR FR-LEGAL-02, FR-LEGAL-03
 * @relatedUI UI-LEGAL-02
 * @description 특허 목록 CSV 내보내기/가져오기 유틸(patentCsv)의 회귀 테스트.
 */
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

  it("내보낸 CSV를 다시 가져오면 출원일·등록일·공동출원인·만료일·제품명이 보존된다", () => {
    const patent = {
      managementNumber: "P2026-KR9",
      title: "라운드트립 특허",
      country: "KR",
      applicationDate: "2024-02-03",
      registrationDate: "2025-05-06",
      applicationNumber: "10-2024-000999",
      registrationNumber: "10-2025-111222",
      coApplicants: "협력사",
      expectedExpirationDate: "2044-02-03",
      businessArea: "Data Platform",
      technologyArea: "AI",
      productName: "PatentFlow",
    } as unknown as PatentListItem;

    const csv = patentsToCsv([patent]);
    const result = parsePatentCsv(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    const payload = result.rows[0].payload;
    expect(payload.applicationDate).toBe("2024-02-03");
    expect(payload.registrationDate).toBe("2025-05-06");
    expect(payload.coApplicants).toBe("협력사");
    expect(payload.expectedExpirationDate).toBe("2044-02-03");
    expect(payload.productName).toBe("PatentFlow");
    expect(payload.registrationNumber).toBe("10-2025-111222");
  });
});
