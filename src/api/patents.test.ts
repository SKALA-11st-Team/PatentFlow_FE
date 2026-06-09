import { describe, it, expect } from "vitest";
import {
  getAverageScore,
  mapBackendAiEvaluationReport,
  mapBackendEvaluationScores,
  getTotalScoreText,
  formatReportDisplayScore
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

describe("formatReportDisplayScore (CONTRACT-02 척도 단일화)", () => {
  type Report = Parameters<typeof formatReportDisplayScore>[0];
  const fourAxisScores = [
    { category: "RIGHTS", score: 80, evidenceSummary: "" },
    { category: "TECHNOLOGY", score: 90, evidenceSummary: "" },
    { category: "MARKET", score: 70, evidenceSummary: "" },
    { category: "BUSINESS_ALIGNMENT", score: 60, evidenceSummary: "" },
  ];

  it("averageScore가 있으면 그 0~100 값을 대표값으로 반환한다", () => {
    const report = { averageScore: 72.3, totalScore: 289, scores: fourAxisScores } as unknown as Report;
    expect(formatReportDisplayScore(report)).toBe(72.3);
  });

  it("averageScore가 없으면 축별 점수(0~100) 평균에서 산출한다", () => {
    const report = { totalScore: 300, scores: fourAxisScores } as unknown as Report;
    expect(formatReportDisplayScore(report)).toBe(75);
  });

  it("0~400 원문 합(totalScore)을 대표값으로 노출하지 않는다", () => {
    const report = { totalScore: 300, scores: fourAxisScores } as unknown as Report;
    const result = formatReportDisplayScore(report);
    expect(result).not.toBe(300);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("점수가 전혀 없으면 undefined를 반환한다", () => {
    const report = { totalScore: 0, scores: [] } as unknown as Report;
    expect(formatReportDisplayScore(report)).toBeUndefined();
  });
});

describe("ORCH-06/AIREPORT-02 리치 근거 풀스루", () => {
  it("축별 evidenceDetails와 리포트 레벨 리치 근거를 화면 모델로 통과시킨다", () => {
    const report = mapBackendAiEvaluationReport({
      reportId: "R-2",
      createdAt: "2026-06-09T00:00:00Z",
      recommendation: "MAINTAIN",
      recommendationReason: "유지",
      totalScore: 300,
      averageScore: 75,
      finalGrade: "B",
      finalIndicator: "유지 권고",
      degraded: false,
      failureReason: null,
      scores: [
        {
          category: "MARKET",
          score: 70,
          grade: "B",
          evidence: "시장성 근거",
          evidenceDetails: [
            { text: "AI 반도체 시장 급성장", source: { title: "한국경제", url: "https://example.com/1" } },
            { text: "반도체 산업 전망", source: { title: "KIET", url: null } },
          ],
        },
      ],
      missingInformation: ["상용화 실적"],
      keyEvidence: "기술성: 기술성 근거",
      judgementGrounds: ["합산 300/400, 평균 75."],
      businessCheckRequests: ["사업부 적용 계획 확인"],
      externalSources: [
        { title: "한국경제", url: "https://example.com/1" },
        { title: "KIET", url: null },
      ],
    });

    expect(report.keyEvidence).toBe("기술성: 기술성 근거");
    expect(report.judgementGrounds).toEqual(["합산 300/400, 평균 75."]);
    expect(report.businessCheckRequests).toEqual(["사업부 적용 계획 확인"]);
    expect(report.externalSources).toEqual([
      { title: "한국경제", url: "https://example.com/1" },
      { title: "KIET", url: undefined },
    ]);
    const market = report.scores[0];
    expect(market.evidenceDetails).toHaveLength(2);
    expect(market.evidenceDetails?.[0].source).toEqual({ title: "한국경제", url: "https://example.com/1" });
    expect(market.evidenceDetails?.[1].source).toEqual({ title: "KIET", url: undefined });
  });
});
