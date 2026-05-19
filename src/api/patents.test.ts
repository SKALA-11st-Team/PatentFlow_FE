import { describe, it, expect } from "vitest";
import { 
  getAverageScore, 
  mapBackendEvaluationScores, 
  getTotalScoreText 
} from "./patents";

describe("patents API Utils", () => {
  describe("getAverageScore", () => {
    it("여러 점수의 평균을 소수점 첫째 자리까지 올바르게 계산한다", () => {
      const scores = [
        { category: "RIGHTS", score: 80, evidenceSummary: "" },
        { category: "TECHNOLOGY", score: 90, evidenceSummary: "" },
        { category: "MARKET", score: 75, evidenceSummary: "" },
        { category: "BUSINESS_ALIGNMENT", score: 85, evidenceSummary: "" },
      ] as any;
      expect(getAverageScore(scores)).toBe(82.5);
    });

    it("점수가 없는 경우 undefined를 반환한다", () => {
      expect(getAverageScore([])).toBe(undefined);
    });

    it("0점인 항목이 포함되어도 정확히 계산한다", () => {
      const scores = [
        { category: "RIGHTS", score: 0, evidenceSummary: "" },
        { category: "MARKET", score: 100, evidenceSummary: "" },
      ] as any;
      expect(getAverageScore(scores)).toBe(50);
    });
  });

  describe("mapBackendEvaluationScores", () => {
    it("백엔드의 5축 점수 중 정의된 4축 카테고리만 필터링한다", () => {
      const backendScores = [
        { category: "RIGHTS", score: 80, evidence: "A" },
        { category: "TECHNOLOGY", score: 90, evidence: "B" },
        { category: "MARKET", score: 70, evidence: "C" },
        { category: "BUSINESS_ALIGNMENT", score: 60, evidence: "D" },
        { category: "UNKNOWN_EXTRA_AXIS", score: 100, evidence: "E" }, // 필터링 대상
      ];
      const mapped = mapBackendEvaluationScores(backendScores as any);
      expect(mapped).toHaveLength(4);
      expect(mapped.some(s => s.category === "UNKNOWN_EXTRA_AXIS")).toBe(false);
    });
  });

  describe("getTotalScoreText", () => {
    it("총점과 평균을 포함한 텍스트를 올바르게 생성한다", () => {
      const scores = [
        { category: "A", score: 80 },
        { category: "B", score: 90 }
      ] as any;
      expect(getTotalScoreText(scores, 85)).toBe("170/200점, 평균 85점");
    });

    it("평균이나 점수가 없으면 undefined를 반환한다", () => {
      expect(getTotalScoreText([], undefined)).toBe(undefined);
    });
  });
});
