import { describe, it, expect } from "vitest";
import {
  getAverageScore,
  mapBackendAiEvaluationReport,
  mapBackendPatentListItem,
  mapBackendEvaluationScores,
  getTotalScoreText,
  formatReportDisplayScore
} from "./patents";
import type { EvaluationScore } from "../types/patent";

type BackendEvaluationScores = Parameters<typeof mapBackendEvaluationScores>[0];
type BackendPatentListItem = Parameters<typeof mapBackendPatentListItem>[0];

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

  describe("mapBackendPatentListItem", () => {
    const basePatent = {
      patentId: "1",
      managementNumber: "SKAX-001",
      applicationNumber: "10-2026-0000001",
      registrationNumber: "10-1234567",
      title: "AI 기반 특허 평가 시스템",
      draftTitle: null,
      businessArea: "AI 플랫폼",
      technologyArea: "특허 분석",
      productName: "PatentFlow",
      country: "KR",
      coApplicants: null,
      applicationDate: "2024-01-10",
      registrationDate: "2025-01-10",
      expectedExpirationDate: "2044-01-10",
      departmentId: "dept-1",
      departmentName: "AI사업부",
      lifecycleStatus: "ACTIVE",
      reviewWorkflowStatus: "REVIEW_QUARTER_STARTED",
      feeDueDate: "2026-07-01",
      reviewReason: "연차료 검토",
      currentRecommendation: "REVIEW_AGAIN",
      businessOpinionDecision: null,
      legalActionResult: null,
    } satisfies BackendPatentListItem;

    it("AI 레포트 실패 상태와 실패 사유를 목록 모델에 보존한다", () => {
      const patent = mapBackendPatentListItem({
        ...basePatent,
        aiReportReadinessStatus: "FAILED",
        aiReportFailureReason: "AI 평가 서비스 연결 실패",
      });

      expect(patent.aiReportReadinessStatus).toBe("FAILED");
      expect(patent.aiReportFailureReason).toBe("AI 평가 서비스 연결 실패");
    });

    it("구 백엔드 응답처럼 레포트 준비 상태가 없으면 PENDING으로 보정한다", () => {
      const patent = mapBackendPatentListItem(basePatent);

      expect(patent.aiReportReadinessStatus).toBe("PENDING");
      expect(patent.aiReportFailureReason).toBeNull();
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

      expect(getTotalScoreText(scores, 0, 0)).toBe("0/300점, 평균 0점");
    });
  });

  describe("mapBackendAiEvaluationReport", () => {
    it("최종 등급과 degraded 원인을 화면 모델에 보존한다", () => {
      const report = mapBackendAiEvaluationReport({
        reportId: "R-1",
        createdAt: "2026-06-08T00:00:00Z",
        recommendation: "REVIEW_AGAIN",
        recommendationReason: "근거 제한",
        totalScore: 0,
        averageScore: 0,
        finalGrade: "D",
        degraded: true,
        failureReason: "외부 근거 일부 누락",
        scores: [
          { category: "RIGHTS", score: 0, grade: "D", evidence: "근거 부족" },
        ],
        missingInformation: ["시장 근거"],
      })!;

      expect(report.totalScore).toBe(0);
      expect(report.totalScoreText).toBe("0/100점, 평균 0점");
      expect(report.finalGrade).toBe("D");
      expect(report.degraded).toBe(true);
      expect(report.failureReason).toBe("외부 근거 일부 누락");
      expect(report.scores[0].grade).toBe("D");
      // 편집 메타 미제공(구 BE 응답) 시 안전한 기본값으로 매핑된다.
      expect(report.edited).toBe(false);
      expect(report.editVersion).toBe(0);
      expect(report.editStale).toBe(false);
    });

    it("법무 편집 메타(FR-LEGAL-09)를 화면 모델에 보존한다", () => {
      const report = mapBackendAiEvaluationReport({
        reportId: "R-2",
        createdAt: "2026-06-08T00:00:00Z",
        recommendation: "MAINTAIN",
        recommendationReason: "법무 검토 결과 유지가 타당합니다.",
        totalScore: 280,
        averageScore: 70,
        scores: [{ category: "RIGHTS", score: 72, grade: "B", evidence: "법무 수정 근거" }],
        missingInformation: [],
        edited: true,
        editedBy: "legal01",
        editedAt: "2026-06-11T09:00:00Z",
        editVersion: 3,
        editStale: true,
        appliedCriteria: { version: 2 },
      })!;

      expect(report.edited).toBe(true);
      expect(report.editedBy).toBe("legal01");
      expect(report.editedAt).toBe("2026-06-11T09:00:00Z");
      expect(report.editVersion).toBe(3);
      expect(report.editStale).toBe(true);
      expect(report.appliedCriteria).toEqual({ version: 2 });
    });

    it("averageScore와 축별 점수가 모두 없으면 totalScore를 핵심 3축으로 나눠 평균을 환산한다(BE /3 정합)", () => {
      const report = mapBackendAiEvaluationReport({
        reportId: "R-3",
        createdAt: "2026-06-08T00:00:00Z",
        recommendation: "REVIEW_AGAIN",
        recommendationReason: "근거 제한",
        // 3축 합(권리성·기술성·시장성), business_fit은 합산 제외.
        totalScore: 210,
        // degraded 폴백: averageScore 미제공 + 숫자 점수 없는 축만 존재.
        scores: [{ category: "RIGHTS", score: null, grade: null, evidence: "근거 부족" }],
        missingInformation: [],
      })!;

      // 210 / 3 = 70 (이전 /4였다면 52.5로 약 25% 과소 산정됨).
      expect(report.averageScore).toBe(70);
    });

    it("AIREPORT-RICH: 에이전트 구조화 필드(요약 카드·섹션 본문)를 화면 모델로 풀스루한다", () => {
      const report = mapBackendAiEvaluationReport({
        reportId: "R-4",
        createdAt: "2026-06-08T00:00:00Z",
        recommendation: "MAINTAIN",
        recommendationReason: "유지",
        totalScore: 240,
        averageScore: 80,
        scores: [{ category: "RIGHTS", score: 80, grade: "A", evidence: "근거" }],
        missingInformation: [],
        summaryBrief: { one_line_summary: "한 줄 요약", key_components: ["구성 A", "구성 B"] },
        reportSections: { finalOpinion: "최종 검토 의견 본문" },
      })!;

      expect(report.summaryBrief?.one_line_summary).toBe("한 줄 요약");
      expect(report.summaryBrief?.key_components).toEqual(["구성 A", "구성 B"]);
      expect(report.reportSections?.finalOpinion).toBe("최종 검토 의견 본문");
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
    })!;

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
