import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { businessChecklistItems } from "../mocks/businessChecklist.mock";
import type { BusinessChecklistItem, BusinessChecklistSubmission } from "../types/businessChecklist";

/**
 * @relatedFR FR-009
 * @relatedUI UI-006, UI-005
 * @description 사업부 의견 작성 모달에서 사용할 체크리스트 정의를 조회한다.
 */
export async function getBusinessChecklistItems(): Promise<BusinessChecklistItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessChecklistItem[]>>("/api/v1/business/checklist-items");

    return response.data;
  }

  return businessChecklistItems;
}

/**
 * @relatedFR FR-009, FR-010
 * @relatedUI UI-006, UI-005
 * @description 사업부 체크리스트 점수, 정성 평가, 최종 의견을 백엔드에 제출한다.
 */
export async function submitBusinessChecklist(
  patentId: string,
  submission: BusinessChecklistSubmission,
): Promise<BusinessChecklistSubmission> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessChecklistSubmission>>(
      `/api/v1/patents/${patentId}/business-submissions`,
      {
        body: JSON.stringify(submission),
        method: "POST",
      },
    );

    return response.data;
  }

  return submission;
}
