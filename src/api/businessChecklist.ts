/**
 * @author 유건욱
 * @date 2026-05-06
 */
import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { businessChecklistItems } from "../mocks/businessChecklist.mock";
import type { BusinessChecklistItem, BusinessChecklistSubmission } from "../types/businessChecklist";

/**
 * @relatedFR FR-BUS-01, FR-BUS-04
 * @relatedUI UI-BUS-02, UI-BUS-03, UI-LEGAL-04
 * @description 사업부 의견 작성 모달에서 사용할 체크리스트 정의를 조회한다.
 */
export async function getBusinessChecklistItems(): Promise<BusinessChecklistItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessChecklistItem[]>>("/business/checklist-items");

    return (response.data ?? []).map((item) => ({
      ...item,
      id: item.id ?? "",
    }));
  }

  return businessChecklistItems;
}

/**
 * @relatedFR FR-BUS-01, FR-BUS-04
 * @relatedUI UI-BUS-02, UI-BUS-03, UI-LEGAL-04
 * @description 사업부 체크리스트 점수, 정성 평가, 최종 의견을 백엔드에 제출한다.
 */
export async function submitBusinessChecklist(
  patentId: string,
  submission: BusinessChecklistSubmission,
): Promise<BusinessChecklistSubmission> {
  if (isBackendApiEnabled()) {
    await requestJson<ApiEnvelope<unknown>>(
      `/patents/${patentId}/business-submissions`,
      {
        body: JSON.stringify(submission),
        method: "POST",
      },
    );
  }

  return submission;
}
