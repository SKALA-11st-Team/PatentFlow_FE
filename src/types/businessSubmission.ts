import type { BusinessOpinionDecision, Recommendation } from "./patent";

export interface BusinessSubmissionChecklistScore {
  itemId: string;
  score: number;
  memo: string;
}

/**
 * @relatedFR FR-BUS-01, FR-LEGAL-11
 * @relatedUI UI-LEGAL-04, UI-BUS-03, UI-BUS-04
 * @description 사업부 제출 이력 API와 화면에서 공유하는 제출 버전 모델
 */
export interface BusinessSubmissionVersion {
  submissionId: string;
  version: number;
  opinion: BusinessOpinionDecision;
  reason: string;
  submittedBy: string;
  submittedAt: string;
  aiReportCreatedAt: string;
  aiRecommendation: Recommendation;
  aiTotalScore: number;
  checklistTotal: number;
  checklistScores: BusinessSubmissionChecklistScore[];
  qualitativeScore: number;
}
