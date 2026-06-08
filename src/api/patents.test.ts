import { describe, it, expect } from "vitest";
import { 
  getAverageScore, 
  mapBackendAiEvaluationReport,
  mapBackendEvaluationScores, 
  getTotalScoreText 
} from "./patents";
import type { EvaluationScore } from "../types/patent";

type BackendEvaluationScores = Parameters<typeof mapBackendEvaluationScores>[0];

describe("patents API Utils", () => {
  describe("getAverageScore", () => {
    it("여러 점수의 평균을 소수점 첫째 자리까지 올바르게 계산한다", () => {
      const scores = [
        { category: "RIGHTS", score: 80, evidenceSummary: "" },
        { category: "TECHNOLOGY", score: 90, evidenceSummary: "" },
        { category: "MARKET", score: 75, evidenceSummary: "" },
        { category: "BUSINESS_ALIGNMENT", score: 85, evidenceSummary: "" },
      ] satisfies EvaluationScore[];
      expect(getAverageScore(scores)).toBe(82.5);
    });

    it("점수가 없는 경우 undefined를 반환한다", () => {
      expect(getAverageScore([])).toBe(undefined);
    });

    it("0점인 항목이 포함되어도 정확히 계산한다", () => {
      const scores = [
        { category: "RIGHTS", score: 0, evidenceSummary: "" },
        { category: "MARKET", score: 100, evidenceSummary: "" },
      ] satisfies EvaluationScore[];
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
      ] satisfies BackendEvaluationScores;
      const mapped = mapBackendEvaluationScores(backendScores);
      expect(mapped).toHaveLength(4);
      expect(mapped.map((score) => score.category)).not.toContain("UNKNOWN_EXTRA_AXIS");
    });
  });

  describe("getTotalScoreText", () => {
    it("총점과 평균을 포함한 텍스트를 올바르게 생성한다", () => {
      const scores = [
        { category: "RIGHTS", score: 80, evidenceSummary: "" },
        { category: "TECHNOLOGY", score: 90, evidenceSummary: "" },
      ] satisfies EvaluationScore[];
      expect(getTotalScoreText(scores, 85)).toBe("170/200점, 평균 85점");
    });

    it("평균이나 점수가 없으면 undefined를 반환한다", () => {
      expect(getTotalScoreText([], undefined)).toBe(undefined);
    });

    it("원문 총점이 0점이어도 undefined로 버리지 않는다", () => {
      const scores = [
        { category: "RIGHTS", score: 0, evidenceSummary: "" },
        { category: "TECHNOLOGY", score: 0, evidenceSummary: "" },
        { category: "MARKET", score: 0, evidenceSummary: "" },
        { category: "BUSINESS_ALIGNMENT", score: 0, evidenceSummary: "" },
      ] satisfies EvaluationScore[];

      expect(getTotalScoreText(scores, 0, 0)).toBe("0/400점, 평균 0점");
    });
  });

  describe("mapBackendAiEvaluationReport", () => {
    it("최종 등급과 degraded 원인을 화면 모델에 보존한다", () => {
      const report = mapBackendAiEvaluationReport({
        reportId: "R-1",
        createdAt: "2026-06-08T00:00:00Z",
        recommendation: "HOLD",
        recommendationReason: "근거 제한",
        totalScore: 0,
        averageScore: 0,
        finalGrade: "D",
        finalIndicator: "추가 확인 필요",
        degraded: true,
        failureReason: "외부 근거 일부 누락",
        scores: [
          { category: "RIGHTS", score: 0, grade: "D", evidence: "근거 부족" },
        ],
        missingInformation: ["시장 근거"],
      });

      expect(report.totalScore).toBe(0);
      expect(report.totalScoreText).toBe("0/100점, 평균 0점");
      expect(report.finalGrade).toBe("D");
      expect(report.finalIndicator).toBe("추가 확인 필요");
      expect(report.degraded).toBe(true);
      expect(report.failureReason).toBe("외부 근거 일부 누락");
      expect(report.scores[0].grade).toBe("D");
    });
  });
});
