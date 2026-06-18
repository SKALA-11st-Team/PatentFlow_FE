/**
 * @author 유건욱
 * @date 2026-05-06
 */
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
    return deriveLatestSubmission(await getBusinessSubmissionVersions(patent));
  }

  return getMockLatestBusinessSubmission(patent);
}

/**
 * @description BIZ-04: 제출 이력 배열에서 최신 제출을 도출한다(추가 API 호출 없이). 백엔드·mock 모두 동일 규칙.
 */
export function deriveLatestSubmission(
  versions: BusinessSubmissionVersion[],
): BusinessSubmissionVersion | null {
  return versions.length > 0 ? versions[versions.length - 1] : null;
}

function mapBackendBusinessSubmission(submission: BackendBusinessSubmissionVersion): BusinessSubmissionVersion {
  const { decision, ...restSubmission } = submission;

  return {
    ...restSubmission,
    opinion: decision,
  };
}
