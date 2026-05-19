import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { businessChecklistItems } from "../mocks/businessChecklist.mock";
import type { BusinessChecklistItem, BusinessChecklistSubmission } from "../types/businessChecklist";

type BackendBusinessChecklistItem = BusinessChecklistItem & {
  itemId?: string;
};

/**
 * @relatedFR FR-009
 * @relatedUI UI-BUS-02, UI-BUS-03, UI-LEGAL-05
 * @description 사업부 의견 작성 모달에서 사용할 체크리스트 정의를 조회한다.
 */
export async function getBusinessChecklistItems(): Promise<BusinessChecklistItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendBusinessChecklistItem[]>>("/business/checklist-items");

    return (response.data ?? []).map((item) => ({
      ...item,
      id: item.id ?? item.itemId ?? "",
    }));
  }

  return businessChecklistItems;
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-BUS-02, UI-BUS-03, UI-LEGAL-05
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
