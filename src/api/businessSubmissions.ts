import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import {
  getBusinessSubmissionVersions as getMockBusinessSubmissionVersions,
  getLatestBusinessSubmission as getMockLatestBusinessSubmission,
  type BusinessSubmissionVersion,
} from "../mocks/businessSubmissions.mock";
import type { PatentDetail, PatentListItem } from "../types/patent";

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-009
 * @description 특허별 사업부 제출 이력 목록을 조회한다.
 */
export async function getBusinessSubmissionVersions(
  patent: PatentDetail | PatentListItem,
): Promise<BusinessSubmissionVersion[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessSubmissionVersion[]>>(
      `/api/v1/patents/${patent.patentId}/business-submissions`,
    );

    return response.data;
  }

  return getMockBusinessSubmissionVersions(patent);
}

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-009
 * @description 특허별 최신 사업부 제출 이력을 조회한다.
 */
export async function getLatestBusinessSubmission(
  patent: PatentDetail | PatentListItem,
): Promise<BusinessSubmissionVersion | null> {
  if (isBackendApiEnabled()) {
    const submissions = await getBusinessSubmissionVersions(patent);

    return submissions.length > 0 ? submissions[submissions.length - 1] : null;
  }

  return getMockLatestBusinessSubmission(patent);
}
