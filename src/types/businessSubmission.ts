/**
 * @author 유건욱
 * @date 2026-05-12
 */
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
  // 사업부 자유 입력 — 제출 당시 값으로 영속화된다(과거/시드 제출에는 없을 수 있어 선택적).
  qualitativeMemo?: string | null;
  additionalNeeds?: string | null;
  evaluatedAt?: string | null;
  // fe-components-2: 제출 당시 AI 레포트 축별 점수 스냅샷(현재 레포트가 아니라 '당시' 값).
  snapshotScores?: { category: string; score: number | null; grade?: string | null }[];
}
