import type {
  BusinessChecklistItem,
  BusinessChecklistResponse,
  BusinessChecklistSubmission,
} from "../types/businessChecklist";
import type { PatentDetail } from "../types/patent";

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-02, UI-BUS-03
 * @description docs/business_evaluavte_checklist.md 기반 사업부 평가 체크리스트 정의
 */
export const businessChecklistItems: BusinessChecklistItem[] = [
  {
    id: "TECH_COMPLETENESS",
    category: "기술적 가치",
    title: "기술완성도",
    description: "회사가 특허 관련 기술을 얼마나 구현해 놓은 상태인지 평가",
    options: [
      { score: 4, label: "판매 가능한 수준으로 개발 완료" },
      { score: 3, label: "테스트용 제품 개발 완료" },
      { score: 2, label: "테스트용 제품 개발 진행 중" },
      { score: 1, label: "아이디어 상태" },
    ],
  },
  {
    id: "TECH_ORIGINALITY",
    category: "기술적 가치",
    title: "기술 독창성",
    description: "기존 기술 대비 얼마나 뛰어난 기술인지 평가",
    options: [
      { score: 4, label: "타사 대비 독창적이고 최고 수준" },
      { score: 3, label: "타사와 유사하거나 약간 개량" },
      { score: 2, label: "동일 기능이나 기술 수준은 낮음" },
      { score: 1, label: "종래기술의 단순 조합 수준" },
    ],
  },
  {
    id: "MARKETABILITY",
    category: "경제적 가치",
    title: "시장성",
    description: "국내 및 해외 경쟁사가 유사 분야의 사업을 진행할 가능성 평가",
    options: [
      { score: 4, label: "국내외 경쟁사 사업 진행 가능성 높음" },
      { score: 3, label: "국내 경쟁사 사업 진행 가능성 높음" },
      { score: 2, label: "당사만 관련 사업 진행" },
      { score: 1, label: "관련 사업 진행 회사 없음" },
    ],
  },
  {
    id: "EXPECTED_EFFECT",
    category: "경제적 가치",
    title: "기대효과",
    description: "기술보호, 수익창출, 비용절감에 기여하는 정도 평가",
    options: [
      { score: 4, label: "기술보호, 수익창출, 비용절감 모두 기여" },
      { score: 3, label: "세 가지 중 두 가지에 기여" },
      { score: 2, label: "세 가지 중 한 가지에 기여" },
      { score: 1, label: "특허 기여도 없음" },
    ],
  },
];

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-02, UI-BUS-03
 * @description AI 평가 레포트를 참고해 사업부 체크리스트의 초기 제안 점수를 만든다.
 */
export function createBusinessChecklistDraft(patent: PatentDetail): BusinessChecklistSubmission {
  return {
    patentId: patent.patentId,
    evaluatorName: patent.departmentName,
    evaluatedAt: "2026-05-03",
    responses: businessChecklistItems.map((item) => {
      const aiSuggestedScore = getAiSuggestedScore(patent, item.id);

      return {
        itemId: item.id,
        score: null,
        aiSuggestedScore,
        memo: "",
      };
    }),
    qualitativeScore: 0,
    qualitativeMemo: "",
    finalOpinion:
      patent.businessOpinion.opinion ??
      (patent.aiEvaluationReport.recommendation === "ABANDON" ||
      patent.aiEvaluationReport.recommendation === "SALES_CANDIDATE"
        ? "ABANDON"
        : "MAINTAIN"),
    finalReason: patent.businessOpinion.comment ?? "",
    additionalNeeds: patent.aiEvaluationReport.missingInformation.join(", "),
  };
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-02, UI-BUS-03
 * @description 체크리스트 응답 총점을 계산한다.
 */
export function getBusinessChecklistTotal(submission: BusinessChecklistSubmission) {
  const criteriaTotal = submission.responses.reduce((sum, response) => sum + (response.score ?? 0), 0);
  return criteriaTotal + submission.qualitativeScore;
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-02, UI-BUS-03
 * @description 항목 ID 기준 응답을 찾는다.
 */
export function getChecklistResponse(submission: BusinessChecklistSubmission, itemId: string): BusinessChecklistResponse {
  return submission.responses.find((response) => response.itemId === itemId) ?? {
    itemId,
    score: null,
    aiSuggestedScore: 2,
    memo: "",
  };
}

function getAiSuggestedScore(patent: PatentDetail, itemId: string) {
  const reportScores = patent.aiEvaluationReport.scores;
  const categoryScoreMap: Record<string, number | null | undefined> = {
    TECH_COMPLETENESS: reportScores.find((score) => score.category === "TECHNOLOGY")?.score,
    TECH_ORIGINALITY: reportScores.find((score) => score.category === "TECHNOLOGY")?.score,
    MARKETABILITY: reportScores.find((score) => score.category === "MARKET")?.score,
    EXPECTED_EFFECT: getExpectedEffectSuggestedScore(reportScores),
  };
  const score = categoryScoreMap[itemId] ?? patent.aiEvaluationReport.totalScore;

  if (!score) {
    return 2;
  }

  if (score >= 80) {
    return 4;
  }

  if (score >= 65) {
    return 3;
  }

  if (score >= 45) {
    return 2;
  }

  return 1;
}

/**
 * @relatedFR FR-006, FR-009
 * @relatedUI UI-BUS-02, UI-BUS-03, UI-LEGAL-05
 * @description 5축 AI 평가 표준에 맞춰 기대효과 제안 점수에 라이프사이클 경제성과 사업 연계성을 함께 반영한다.
 */
function getExpectedEffectSuggestedScore(reportScores: PatentDetail["aiEvaluationReport"]["scores"]) {
  const relatedScores = [
    reportScores.find((score) => score.category === "LIFECYCLE_ECONOMICS")?.score,
    reportScores.find((score) => score.category === "BUSINESS_ALIGNMENT")?.score,
  ].filter((score): score is number => typeof score === "number");

  if (relatedScores.length === 0) {
    return undefined;
  }

  return Math.round(relatedScores.reduce((sum, score) => sum + score, 0) / relatedScores.length);
}
