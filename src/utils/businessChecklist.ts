/**
 * @author 유건욱
 * @date 2026-05-20
 */
import { getAverageScore } from "../api/patents";
import { businessChecklistItems } from "../mocks/businessChecklist.mock";
import type {
  BusinessChecklistItem,
  BusinessChecklistResponse,
  BusinessChecklistSubmission,
} from "../types/businessChecklist";
import type { PatentDetail } from "../types/patent";

/**
 * @relatedFR FR-BUS-01, FR-BUS-04
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03
 * @description AI 평가 레포트를 참고해 사업부 체크리스트의 초기 제안 점수를 만든다.
 *   draft.responses는 모달이 렌더하는 항목과 동일한 출처여야 한다(BE DB 항목을 legal팀이
 *   추가/수정/삭제 가능하므로 정적 mock과 드리프트 가능). checklistItems가 전달되면 그 동적
 *   항목으로 시드하고, 없으면 정적 mock으로 폴백한다.
 */
export function createBusinessChecklistDraft(
  patent: PatentDetail,
  checklistItems: BusinessChecklistItem[] = businessChecklistItems,
): BusinessChecklistSubmission {
  const seedItems = checklistItems.length > 0 ? checklistItems : businessChecklistItems;

  return {
    patentId: patent.patentId,
    evaluatorName: patent.departmentName,
    // BIZ-09: 하드코딩 날짜 대신 오늘 날짜. 실제 제출 시각은 서버(submittedAt)가 정본이며 evaluatedAt은 표시용.
    evaluatedAt: new Date().toISOString().slice(0, 10),
    responses: seedItems.map((item) => {
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
      (patent.aiEvaluationReport?.recommendation === "ABANDON" ? "ABANDON" : "MAINTAIN"),
    finalReason: patent.businessOpinion.comment ?? "",
    additionalNeeds: "",
  };
}

/**
 * @relatedFR FR-BUS-01, FR-BUS-04
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03
 * @description 체크리스트 응답 총점을 계산한다.
 */
export function getBusinessChecklistTotal(submission: BusinessChecklistSubmission) {
  const criteriaTotal = submission.responses.reduce((sum, response) => sum + (response.score ?? 0), 0);
  return criteriaTotal + submission.qualitativeScore;
}

/**
 * @relatedFR FR-BUS-01, FR-BUS-04
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03
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

// BIZ-07: 체크리스트 항목 → AI 평가 카테고리 매핑(인라인 하드코딩을 명명 상수로 외부화 — 매핑 근거 투명화).
export const CHECKLIST_ITEM_TO_AI_CATEGORY: Record<string, string> = {
  TECH_COMPLETENESS: "TECHNOLOGY",
  TECH_ORIGINALITY: "TECHNOLOGY",
  MARKETABILITY: "MARKET",
  EXPECTED_EFFECT: "BUSINESS_ALIGNMENT",
};

// BIZ-07: 0~100 대표 점수 → 1~4 제안 점수 임계값(내림차순, 경계 포함). 하드코딩 80/65/45를 명명 상수화.
export const AI_SUGGESTED_SCORE_THRESHOLDS: ReadonlyArray<{ min: number; score: number }> = [
  { min: 80, score: 4 },
  { min: 65, score: 3 },
  { min: 45, score: 2 },
];
export const DEFAULT_AI_SUGGESTED_SCORE = 2; // 점수 미상(0/null/undefined) 시 중립값
const LOWEST_AI_SUGGESTED_SCORE = 1;

/**
 * @description BIZ-07: 0~100 대표 점수를 1~4 제안 점수로 환산한다(임계값 단일 정본). 점수 미상이면 중립값.
 */
export function suggestedScoreFromRepresentative(score: number | null | undefined): number {
  if (!score) {
    return DEFAULT_AI_SUGGESTED_SCORE;
  }
  const match = AI_SUGGESTED_SCORE_THRESHOLDS.find((threshold) => score >= threshold.min);
  return match ? match.score : LOWEST_AI_SUGGESTED_SCORE;
}

function getAiSuggestedScore(patent: PatentDetail, itemId: string) {
  if (!patent.aiEvaluationReport) return DEFAULT_AI_SUGGESTED_SCORE;
  const reportScores = patent.aiEvaluationReport.scores;
  const category = CHECKLIST_ITEM_TO_AI_CATEGORY[itemId];
  const categoryScore = category
    ? reportScores.find((score) => score.category === category)?.score
    : undefined;
  // CONTRACT-02: 카테고리 점수가 없을 때의 폴백은 0~100 대표 평균이어야 한다. 과거에는 0~400
  // 원문 합(totalScore)을 그대로 임계값(80/65/45)에 비교해, 합이 큰 특허는 항상 4점이 되는 버그가 있었다.
  const score = categoryScore
    ?? patent.aiEvaluationReport.averageScore
    ?? getAverageScore(patent.aiEvaluationReport.scores);

  return suggestedScoreFromRepresentative(score);
}
