import { businessChecklistItems } from "../mocks/businessChecklist.mock";
import type {
  BusinessChecklistResponse,
  BusinessChecklistSubmission,
} from "../types/businessChecklist";
import type { PatentDetail } from "../types/patent";

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
    EXPECTED_EFFECT: reportScores.find((score) => score.category === "BUSINESS_ALIGNMENT")?.score,
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
