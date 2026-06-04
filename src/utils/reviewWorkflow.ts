/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02
 * @description 이번 분기 연차료 검토 대상 여부를 대시보드 KPI와 조회 필터에서 같은 기준으로 판정한다.
 */
import type { PatentListItem, ReviewWorkflowStatus } from "../types/patent";

export type ReviewTargetScope = "ALL" | "QUARTER";

/**
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02
 * @description 검토 workflow 상태가 이번 분기 연차료 검토 대상에 포함되는지 반환한다.
 */
export function isQuarterlyReviewStatus(status: ReviewWorkflowStatus) {
  return status !== "NOT_IN_REVIEW";
}

/**
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02
 * @description 특허 행이 이번 분기 연차료 검토 대상에 포함되는지 반환한다.
 */
export function isQuarterlyReviewTarget(patent: PatentListItem) {
  return isQuarterlyReviewStatus(patent.reviewWorkflowStatus);
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02
 * @description 조회 범위와 검토 workflow 상태가 동시에 선택됐을 때 서로 충돌하지 않는지 반환한다.
 */
export function matchesReviewTargetScope(status: ReviewWorkflowStatus, scope: ReviewTargetScope) {
  return scope === "ALL" || isQuarterlyReviewStatus(status);
}
