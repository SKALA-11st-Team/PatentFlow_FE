import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import {
  getBusinessSubmissionVersions as getMockBusinessSubmissionVersions,
  getLatestBusinessSubmission as getMockLatestBusinessSubmission,
} from "../mocks/businessSubmissions.mock";
import type { BusinessSubmissionVersion } from "../types/businessSubmission";
import type { BusinessOpinionDecision, PatentDetail, PatentListItem, Recommendation } from "../types/patent";

interface BackendBusinessSubmissionVersion extends Omit<BusinessSubmissionVersion, "opinion"> {
  decision: BusinessOpinionDecision;
  aiRecommendation: Recommendation;
}

/**
 * @relatedFR FR-BUS-01, FR-LEGAL-11
 * @relatedUI UI-BUS-04, UI-BUS-05
 * @description 특허별 사업부 제출 이력 목록을 조회한다.
 */
export async function getBusinessSubmissionVersions(
  patent: PatentDetail | PatentListItem,
): Promise<BusinessSubmissionVersion[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendBusinessSubmissionVersion[]>>(
      `/patents/${patent.patentId}/business-submissions`,
    );

    return (response.data ?? []).map(mapBackendBusinessSubmission);
  }

  return getMockBusinessSubmissionVersions(patent);
}

/**
 * @relatedFR FR-BUS-01, FR-LEGAL-11
 * @relatedUI UI-BUS-04, UI-BUS-05
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

function mapBackendBusinessSubmission(submission: BackendBusinessSubmissionVersion): BusinessSubmissionVersion {
  const { decision, ...restSubmission } = submission;

  return {
    ...restSubmission,
    opinion: decision,
  };
}
