import { isBackendApiEnabled, requestJson, toQueryString, type ApiEnvelope } from "./client";
import {
  getMockDepartmentRecipientMappings,
  getMockMailingHistory,
  updateMockDepartmentRecipientMapping,
} from "../mocks/mailing.mock";
import type { DepartmentRecipientMapping, MailingHistoryItem } from "../types/mailing";

export interface MailingHistoryQuery {
  patentId?: string;
  recipientEmail?: string;
}

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-LEGAL-05
 * @description 부서별 사업부 검토 메일 담당자 매핑을 조회한다.
 */
export async function getDepartmentRecipientMappings(): Promise<DepartmentRecipientMapping[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<DepartmentRecipientMapping[]>>(
      "/mailings/department-recipient-mappings",
    );

    return response.data ?? [];
  }

  return getMockDepartmentRecipientMappings();
}

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-LEGAL-05
 * @description 부서명과 담당자 이름, 이메일, 참조자 매핑을 저장한다.
 */
export async function updateDepartmentRecipientMapping(
  mapping: DepartmentRecipientMapping,
): Promise<DepartmentRecipientMapping> {
  const nextMapping = {
    ...mapping,
    ccEmails: mapping.ccEmails.map((email) => email.trim()).filter(Boolean),
    departmentName: mapping.departmentName.trim(),
    managerEmail: mapping.managerEmail.trim(),
    managerName: mapping.managerName.trim(),
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<DepartmentRecipientMapping>>(
      `/mailings/department-recipient-mappings/${nextMapping.departmentId}`,
      {
        body: JSON.stringify(nextMapping),
        method: "PUT",
      },
    );

    return response.data ?? nextMapping;
  }

  return updateMockDepartmentRecipientMapping(nextMapping);
}

/**
 * @relatedFR FR-LEGAL-14
 * @relatedUI UI-LEGAL-04, UI-LEGAL-05
 * @description 사업부 검토 요청 메일 발송 이력을 조회한다.
 */
export async function getMailingHistory(query: MailingHistoryQuery = {}): Promise<MailingHistoryItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<MailingHistoryItem[]>>(
      `/mailings/history${toQueryString({
        patentId: query.patentId,
        recipientEmail: query.recipientEmail,
        size: 500,
      })}`,
    );

    return response.data ?? [];
  }

  return getMockMailingHistory(query);
}
