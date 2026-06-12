import {
  isBackendApiEnabled,
  requestBlob,
  requestJson,
  toQueryString,
  type ApiEnvelope,
  type PageMeta,
  type PaginatedApiEnvelope,
} from "./client";
import { EVALUATION_CATEGORIES, type CoApplicantConsentStatus } from "../constants/status";
import {
  assignMockPatentDepartment,
  createFallbackFinalDecisionResult,
  getFilteredMockPatents,
  getMockPatentAiReportOriginal,
  getMockPatentDetail,
  getMockPatentFeeSchedule,
  getMockPatentPage,
  getMockPatentPdfMeta,
  removeMockPatentPdf,
  setMockPatentPdf,
  lookupMockPatentBibliographicInfo,
  recordMockCoApplicantConsent,
  recordMockPatentFinalDecision,
  requestMockPatentAiReport,
  revertMockPatentAiReport,
  sendMockBusinessReviewMails,
  suggestMockPatentContextFields,
  updateMockPatent,
  updateMockPatentAiReport,
} from "./patents.mockApi";
import type {
  AiEvaluationReport,
  AiReportEditPayload,
  BusinessOpinion,
  CoApplicantConsent,
  PatentBibliographicInfo,
  PatentDetail,
  PatentFeeSchedule,
  PatentPdfMeta,
  AiReportJob,
  EvaluationScore,
  FinalDecisionRecord,
  LegalActionResult,
  PatentListItem,
  PatentHistoryItem,
  PatentSummary,
  PatentUpsertPayload,
  ReviewWorkflowStatus,
} from "../types/patent";
import type { BusinessReviewMailSendDraft } from "../types/mailing";

export interface PatentListQuery {
  departmentId?: string;
  keyword?: string;
  page?: number;
  reviewWorkflowStatus?: ReviewWorkflowStatus;
  size?: number;
  sort?: string;
  // CONTRACT-09/DASH-08: 서버 위임 필터(분기/국가/날짜/영역/검토여부).
  quarter?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  businessArea?: string;
  technologyArea?: string;
  productName?: string;
  inReview?: boolean;
}

export interface PatentListPage {
  items: PatentListItem[];
  page: PageMeta;
}

// CONTRACT-09/DASH-08: 검토 대상 목록 화면의 필터 드롭다운 옵션(전체 특허 distinct).
export interface PatentFilterOptions {
  countries: string[];
  businessAreas: string[];
  technologyAreas: string[];
  productNames: string[];
}

export interface BulkMailingResult {
  skippedPatentIds?: string[];
  updatedCount: number;
  updatedPatentIds: string[];
}

export interface FinalDecisionPayload {
  legalActionResult: LegalActionResult;
  reason: string;
}

export interface FinalDecisionResult {
  finalDecisionRecord: FinalDecisionRecord;
  legalActionResult: LegalActionResult;
  patentId: string;
  reviewWorkflowStatus: ReviewWorkflowStatus;
}

export interface PatentSaveResult {
  patentId: string;
  mode: "CREATED" | "UPDATED";
}

export interface PatentContextSuggestion {
  businessArea: string;
  confidenceText: string;
  reason: string;
  technologyArea: string;
}

type BackendPatentListItem = Omit<
  PatentListItem,
  | "applicationNumber"
  | "draftTitle"
  | "businessArea"
  | "technologyArea"
  | "productName"
  | "country"
  | "coApplicants"
  | "applicationDate"
  | "registrationDate"
  | "expectedExpirationDate"
  | "feeDueDate"
  | "aiReportReadinessStatus"
  | "aiReportFailureReason"
  | "originalPatentUrl"
> & {
  applicationNumber: string | null;
  draftTitle: string | null;
  businessArea: string | null;
  technologyArea: string | null;
  productName: string | null;
  country: string | null;
  coApplicants: string | null;
  applicationDate: string | null;
  registrationDate: string | null;
  expectedExpirationDate: string | null;
  feeDueDate: string | null;
  aiReportReadinessStatus?: PatentListItem["aiReportReadinessStatus"] | null;
  aiReportFailureReason?: string | null;
  originalPatentUrl?: string | null;
};

interface BackendPatentDetail extends BackendPatentListItem {
  summary: {
    summaryText: string;
    problemSolved: string;
    coreTechnicalPoints: string[];
    claimsSummary: string;
    missingFields: string[];
  };
  aiEvaluationReport: {
    reportId: string;
    createdAt: string;
    recommendation: PatentDetail["aiEvaluationReport"]["recommendation"];
    recommendationReason: string;
    totalScore: number | null;
    averageScore?: number | null;
    finalGrade?: string | null;
    finalIndicator?: string | null;
    degraded?: boolean | null;
    failureReason?: string | null;
    scores: Array<{
      category: string;
      score: number | null;
      grade?: string | null;
      evidence: string;
      // ORCH-06/AIREPORT-02: 축별 세부 근거(클릭형 출처).
      evidenceDetails?: Array<{
        text: string;
        source?: { title?: string | null; url?: string | null } | null;
      }> | null;
    }>;
    missingInformation: string[];
    // ORCH-06/AIREPORT-02: 리포트 레벨 리치 근거.
    keyEvidence?: string | null;
    judgementGrounds?: string[] | null;
    businessCheckRequests?: string[] | null;
    externalSources?: Array<{ title?: string | null; url?: string | null }> | null;
    rawMarkdown?: string;
    markdownFilePath?: string;
    // FR-LEGAL-09: 법무 편집 메타. 값 필드들은 편집이 반영된 '유효' 값이다.
    edited?: boolean | null;
    editedBy?: string | null;
    editedAt?: string | null;
    editVersion?: number | null;
    editStale?: boolean | null;
    appliedCriteria?: Record<string, unknown> | null;
  };
  finalDecisionRecord: {
    decisionId: string | null;
    reason: string | null;
    decidedAt: string | null;
  };
  businessOpinion: {
    decision: BusinessOpinion["opinion"];
    reason: string | null;
    submittedAt: string | null;
  };
  // 공동출원 합의 게이트.
  jointApplication?: boolean;
  coApplicantConsent?: {
    status?: CoApplicantConsentStatus | null;
    reason?: string | null;
    decidedAt?: string | null;
    decidedBy?: string | null;
  } | null;
}

type BackendPatentBibliographicInfo = Omit<
  PatentBibliographicInfo,
  "applicationDate" | "coApplicants" | "country" | "registrationDate" | "applicationNumber" | "expectedExpirationDate"
> & {
  applicationDate: string | null;
  coApplicants: string | null;
  country: string | null;
  registrationDate: string | null;
  applicationNumber: string | null;
  expectedExpirationDate: string | null;
};

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-BUS-01, UI-BUS-02
 * @description 특허 목록을 조회한다. 백엔드 URL이 없으면 데모 mock 데이터를 동일 인터페이스로 반환한다.
 */
export async function getPatents(query: PatentListQuery = {}): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    if (query.page !== undefined || query.size !== undefined) {
      return (await getPatentPage(query)).items;
    }

    // PERF-01: 전체 페이지를 Promise.all로 병렬 로딩하지 않고, 페이징 없이 전체 목록을 한 번에 반환하는
    // review-targets 엔드포인트를 단일 요청으로 사용한다. (departmentId/keyword는 클라이언트에서 보존 필터링)
    const reviewTargets = await getReviewTargetPatents({ reviewWorkflowStatus: query.reviewWorkflowStatus });
    return filterPatentsClientSide(reviewTargets, query);
  }

  return getFilteredMockPatents(query);
}

/**
 * @relatedFR FR-LEGAL-22, FR-LEGAL-24
 * @relatedUI UI-LEGAL-01, UI-COM-02, UI-BUS-01
 * @description 분기/국가/날짜/상태 기준 검토 대상 특허 전체를 페이징 없이 단일 요청으로 조회한다.
 */
export async function getReviewTargetPatents(query: PatentListQuery = {}): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentListItem[]>>(
      `/patents/review-targets${toQueryString({
        reviewWorkflowStatus: query.reviewWorkflowStatus,
      })}`,
    );

    return (response.data ?? []).map(mapBackendPatentListItem);
  }

  return getFilteredMockPatents(query);
}

/**
 * 백엔드 전체 목록 응답에 대해 기존 getPatents 전량 로드와 동일하게 departmentId/keyword 필터를 클라이언트에서 보존한다.
 */
function filterPatentsClientSide(items: PatentListItem[], query: PatentListQuery): PatentListItem[] {
  const keyword = query.keyword?.trim().toLowerCase();
  return items.filter((item) => {
    if (query.departmentId && item.departmentId !== query.departmentId) {
      return false;
    }
    if (keyword) {
      const haystack = [item.title, item.managementNumber, item.applicationNumber, item.registrationNumber];
      if (!haystack.some((value) => typeof value === "string" && value.toLowerCase().includes(keyword))) {
        return false;
      }
    }
    return true;
  });
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-BUS-01, UI-BUS-02
 * @description 특허 목록 단일 페이지와 페이지 메타데이터를 조회한다.
 */
export async function getPatentPage(query: PatentListQuery = {}): Promise<PatentListPage> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<PaginatedApiEnvelope<BackendPatentListItem>>(
      `/patents${toQueryString({
        departmentId: query.departmentId,
        keyword: query.keyword,
        page: query.page,
        reviewWorkflowStatus: query.reviewWorkflowStatus,
        size: query.size,
        sort: query.sort,
        // CONTRACT-09/DASH-08: 분기/국가/날짜/영역/검토여부를 서버로 위임.
        quarter: query.quarter,
        country: query.country,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        businessArea: query.businessArea,
        technologyArea: query.technologyArea,
        productName: query.productName,
        inReview: query.inReview === undefined ? undefined : String(query.inReview),
      })}`,
    );

    return {
      items: (response.data ?? []).map(mapBackendPatentListItem),
      page: response.page,
    };
  }

  return getMockPatentPage(query);
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01, UI-COM-02
 * @description CONTRACT-09/DASH-08: 검토 대상 목록 필터 드롭다운 옵션(국가·사업·기술·제품)을 전체 특허
 *     기준으로 조회한다. 서버 필터로 목록이 좁혀져도 옵션은 줄지 않는다(클라이언트 전체 배열 의존 제거).
 */
export async function getPatentFilterOptions(): Promise<PatentFilterOptions> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentFilterOptions>>("/patents/filter-options");
    return response.data ?? { countries: [], businessAreas: [], technologyAreas: [], productNames: [] };
  }

  return computeMockFilterOptions();
}

function computeMockFilterOptions(): PatentFilterOptions {
  const all = getFilteredMockPatents({});
  const distinct = (values: string[]) =>
    Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value && value !== "N/A")))
      .sort((first, second) => first.localeCompare(second, "ko"));

  return {
    countries: distinct(all.map((patent) => patent.country)),
    businessAreas: distinct(all.map((patent) => patent.businessArea)),
    technologyAreas: distinct(all.map((patent) => patent.technologyArea)),
    productNames: distinct(all.map((patent) => patent.productName)),
  };
}

export async function getBusinessPatents(query: PatentListQuery = {}): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    if (query.page !== undefined || query.size !== undefined) {
      return (await getBusinessPatentPage(query)).items;
    }

    // BIZ-05: 1페이지(최대 100건)를 먼저 받고, 부서 특허가 100건을 초과할 때만 나머지 페이지를 수집한다.
    // (PERF-01 유지: 일반(≤100건) 부서는 단일 호출 그대로 — 무조건 전체 병렬 로딩으로 회귀하지 않는다.
    //  100건 초과 대형 부서의 목록 누락·KPI 불일치만 보정한다.)
    const firstPage = await getBusinessPatentPage({ ...query, page: 1, size: 100 });
    if (firstPage.page.totalPages <= 1) {
      return firstPage.items;
    }
    const remainingPages = await Promise.all(
      Array.from({ length: firstPage.page.totalPages - 1 }, (_, index) =>
        getBusinessPatentPage({ ...query, page: index + 2, size: 100 }),
      ),
    );
    return remainingPages.reduce((all, pageResult) => all.concat(pageResult.items), [...firstPage.items]);
  }

  return getFilteredMockPatents(query);
}

export async function getBusinessPatentPage(query: PatentListQuery = {}): Promise<PatentListPage> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<PaginatedApiEnvelope<BackendPatentListItem>>(
      `/business/patents${toQueryString({
        keyword: query.keyword,
        page: query.page,
        reviewWorkflowStatus: query.reviewWorkflowStatus,
        size: query.size,
      })}`,
    );

    return {
      items: (response.data ?? []).map(mapBackendPatentListItem),
      page: response.page,
    };
  }

  return getMockPatentPage(query);
}

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 특허 상세와 AI 평가 레포트, 최종 판단 정보를 조회한다.
 */
export async function getPatentDetail(patentId: string): Promise<PatentDetail | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail>>(`/patents/${patentId}`);

    return response.data ? mapBackendPatentDetail(response.data) : undefined;
  }

  return getMockPatentDetail(patentId);
}

export async function getBusinessPatentDetail(patentId: string): Promise<PatentDetail | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail>>(`/business/patents/${patentId}`);

    return response.data ? mapBackendPatentDetail(response.data) : undefined;
  }

  return getMockPatentDetail(patentId);
}

/**
 * @relatedFR FR-LEGAL-13
 * @relatedUI UI-LEGAL-03
 * @description MAIL-13: 법무팀 특허 PDF 직접 업로드 — TW·UAE 등 KIPRIS로 공개전문을 가져올 수
 * 없는 국가의 특허에 등록/수정 화면에서 PDF를 첨부한다(기존 첨부는 교체).
 */
export async function uploadPatentPdf(patentId: string, file: File): Promise<PatentPdfMeta> {
  if (isBackendApiEnabled()) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await requestJson<ApiEnvelope<PatentPdfMeta>>(`/patents/${patentId}/pdf`, {
      method: "POST",
      body: formData,
    });
    if (!response.data) {
      throw new Error("PDF 업로드 응답이 비어 있습니다.");
    }
    return response.data;
  }

  return setMockPatentPdf(patentId, file.name, file.size);
}

export async function getPatentPdfMeta(
  patentId: string,
  options: { business?: boolean } = {},
): Promise<PatentPdfMeta> {
  if (isBackendApiEnabled()) {
    const basePath = options.business ? "/business/patents" : "/patents";
    const response = await requestJson<ApiEnvelope<PatentPdfMeta>>(`${basePath}/${patentId}/pdf/meta`);
    return response.data ?? { patentId, exists: false, storageType: null, docName: null, contentLength: null, uploadedBy: null, createdAt: null };
  }

  return getMockPatentPdfMeta(patentId);
}

export async function deletePatentPdf(patentId: string): Promise<void> {
  if (isBackendApiEnabled()) {
    await requestJson<ApiEnvelope<PatentPdfMeta>>(`/patents/${patentId}/pdf`, { method: "DELETE" });
    return;
  }

  removeMockPatentPdf(patentId);
}

/** MAIL-13: 업로드된 특허 PDF를 받아 브라우저 다운로드를 트리거한다. */
export async function downloadPatentPdf(
  patentId: string,
  docName: string | null,
  options: { business?: boolean } = {},
): Promise<void> {
  if (!isBackendApiEnabled()) {
    throw new Error("mock 모드에서는 PDF 다운로드를 지원하지 않습니다.");
  }
  const basePath = options.business ? "/business/patents" : "/patents";
  const blob = await requestBlob(`${basePath}/${patentId}/pdf`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = docName ?? `${patentId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * @relatedFR FR-LEGAL-05
 * @description F6: 특허 패밀리(같은 관리번호 계열의 국가별 출원) 조회 — 자신은 제외된다.
 */
export async function getPatentFamily(
  patentId: string,
  options: { business?: boolean } = {},
): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    const basePath = options.business ? "/business/patents" : "/patents";
    const response = await requestJson<ApiEnvelope<BackendPatentListItem[]>>(`${basePath}/${patentId}/family`);
    return (response.data ?? []).map(mapBackendPatentListItem);
  }

  return [];
}

/**
 * @relatedFR FR-LEGAL-02
 * @description F5: 특허 다건 부서 일괄 배정 — 건별 실패는 격리되고 성공/실패 ID 목록을 받는다.
 */
export async function bulkAssignDepartment(
  patentIds: string[],
  departmentId: string,
): Promise<{ assignedPatentIds: string[]; failedPatentIds: string[] }> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<{ assignedPatentIds: string[]; failedPatentIds: string[] }>>(
      "/patents/bulk/department",
      { method: "PATCH", body: JSON.stringify({ patentIds, departmentId }) },
    );
    return response.data ?? { assignedPatentIds: [], failedPatentIds: patentIds };
  }

  return { assignedPatentIds: patentIds, failedPatentIds: [] };
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-04, UI-BUS-02
 * @description FEE-06: 특허 상세 연차료 일정 조회 — 국가 규칙 기반 도래일·검토 시작일·수신처를
 * BE가 단일 출처로 계산한다. 사업부 사용자는 부서 가드가 있는 business 경로를 사용한다.
 */
export async function getPatentFeeSchedule(
  patentId: string,
  options: { business?: boolean } = {},
): Promise<PatentFeeSchedule | undefined> {
  if (isBackendApiEnabled()) {
    const basePath = options.business ? "/business/patents" : "/patents";
    const response = await requestJson<ApiEnvelope<PatentFeeSchedule>>(`${basePath}/${patentId}/fee-schedule`);
    return response.data ?? undefined;
  }

  return getMockPatentFeeSchedule(patentId);
}

/**
 * @relatedFR FR-LEGAL-11
 * @relatedUI UI-LEGAL-04, UI-BUS-05
 * @description 특허별 평가와 판단 이력을 조회한다.
 */
export async function getPatentHistory(patentId: string): Promise<PatentHistoryItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentHistoryItem[]>>(`/patents/${patentId}/history`);
    return response.data ?? [];
  }

  return [];
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-06
 * @description 메일 발송 대기 상태의 선택 특허에 사업부 검토 요청 메일 발송 처리를 일괄 기록한다.
 */
export async function sendBusinessReviewMails(drafts: BusinessReviewMailSendDraft[]): Promise<BulkMailingResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BulkMailingResult>>("/mailings/send", {
      body: JSON.stringify({ drafts }),
      method: "POST",
    });

    return response.data ?? { skippedPatentIds: [], updatedCount: 0, updatedPatentIds: [] };
  }

  return sendMockBusinessReviewMails(drafts);
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-15
 * @relatedUI UI-LEGAL-05
 * @description 관리자 특허 상세에서 AI 권고와 분리된 단건 최종 판단과 실제 법무 처리 결과를 기록한다.
 */
export async function recordPatentFinalDecision(
  patentId: string,
  payload: FinalDecisionPayload,
): Promise<FinalDecisionResult> {
  return savePatentFinalDecision(patentId, payload, "POST");
}

export async function updatePatentFinalDecision(
  patentId: string,
  payload: FinalDecisionPayload,
): Promise<FinalDecisionResult> {
  return savePatentFinalDecision(patentId, payload, "PATCH");
}

async function savePatentFinalDecision(
  patentId: string,
  payload: FinalDecisionPayload,
  method: "POST" | "PATCH",
): Promise<FinalDecisionResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<FinalDecisionResult>>(`/patents/${patentId}/final-decision`, {
      body: JSON.stringify(payload),
      method,
    });

    return response.data ?? createFallbackFinalDecisionResult(patentId, payload);
  }

  return recordMockPatentFinalDecision(patentId, payload);
}

export interface CoApplicantConsentPayload {
  status: CoApplicantConsentStatus;
  reason: string;
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-04
 * @description 공동출원 특허의 공동출원인 합의를 기록한다(연차료 유지/포기 최종 판단의 전제 게이트).
 */
export async function recordCoApplicantConsent(
  patentId: string,
  payload: CoApplicantConsentPayload,
): Promise<PatentDetail | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail>>(
      `/patents/${patentId}/co-applicant-consent`,
      { body: JSON.stringify(payload), method: "POST" },
    );
    return response.data ? mapBackendPatentDetail(response.data) : undefined;
  }

  return recordMockCoApplicantConsent(patentId, payload);
}

/**
 * @description 단건 특허에 대해 AI 평가 레포트 생성을 비동기 잡으로 요청한다.
 */
export async function requestPatentAiReport(patentId: string): Promise<AiReportJob | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<AiReportJob>>(`/patents/${patentId}/request-ai-report`, {
      method: "POST",
      body: "{}",
    });
    return response.data ?? undefined;
  }
  await requestMockPatentAiReport(patentId);
  return {
    jobId: `MOCK-AIJOB-${patentId}`,
    patentId,
    status: "SUCCEEDED",
    requestedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    message: "AI 평가 레포트가 생성되었습니다.",
    reportId: null,
  };
}

/**
 * @relatedFR FR-LEGAL-09
 * @relatedUI UI-LEGAL-04
 * @description 법무팀이 AI 평가 레포트를 편집한다(부분 PATCH 누적). AI 원본은 BE에서 불변 보존되고
 *     편집은 오버라이드로 분리 저장되며, 응답은 편집이 반영된 '유효 레포트'다.
 */
export async function updatePatentAiReport(
  patentId: string,
  payload: AiReportEditPayload,
): Promise<AiEvaluationReport | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail["aiEvaluationReport"]>>(
      `/patents/${patentId}/ai-report`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    return response.data ? mapBackendAiEvaluationReport(response.data) : undefined;
  }
  return updateMockPatentAiReport(patentId, payload);
}

/** 법무 편집을 모두 폐기하고 AI 원본 레포트로 되돌린다. */
export async function revertPatentAiReport(patentId: string): Promise<AiEvaluationReport | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail["aiEvaluationReport"]>>(
      `/patents/${patentId}/ai-report/edits`,
      { method: "DELETE" },
    );
    return response.data ? mapBackendAiEvaluationReport(response.data) : undefined;
  }
  return revertMockPatentAiReport(patentId);
}

/** 'AI 원본 보기' — 법무 편집을 반영하지 않은 순수 AI 레포트를 조회한다. */
export async function getPatentAiReportOriginal(patentId: string): Promise<AiEvaluationReport | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail["aiEvaluationReport"]>>(
      `/patents/${patentId}/ai-report/original`,
    );
    return response.data ? mapBackendAiEvaluationReport(response.data) : undefined;
  }
  return getMockPatentAiReportOriginal(patentId);
}

export async function getPatentAiReportStatus(patentId: string): Promise<AiReportJob | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<AiReportJob>>(`/patents/${patentId}/ai-report/status`);
    return response.data ?? undefined;
  }
  return {
    jobId: `MOCK-AIJOB-${patentId}`,
    patentId,
    status: "SUCCEEDED",
    requestedAt: null,
    startedAt: null,
    finishedAt: new Date().toISOString(),
    message: "AI 평가 레포트가 생성되었습니다.",
    reportId: null,
  };
}

/**
 * @relatedFR FR-LEGAL-03
 * @relatedUI UI-LEGAL-04
 * @description 출원번호로 KIPRIS 우선 검색 후 결과가 없으면 Google Patents 검색을 요청한다.
 */
export async function lookupPatentBibliographicInfo(applicationNumber: string): Promise<PatentBibliographicInfo | null> {
  const normalizedApplicationNumber = applicationNumber.trim();

  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentBibliographicInfo | null>>(
      `/patents/external-lookup${toQueryString({
        applicationNumber: normalizedApplicationNumber,
        sourcePriority: "KIPRIS,GOOGLE_PATENTS",
      })}`,
    );

    return response.data ? normalizeBibliographicInfo(response.data) : null;
  }

  return lookupMockPatentBibliographicInfo(normalizedApplicationNumber);
}

/**
 * @relatedFR FR-LEGAL-03, FR-LEGAL-04
 * @relatedUI UI-LEGAL-04
 * @description 외부 검색 메타데이터와 사용자가 입력한 회사 컨텍스트를 조합해 특허를 등록한다.
 */
export async function createPatent(payload: PatentUpsertPayload): Promise<PatentSaveResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentSaveResult>>("/patents", {
      body: JSON.stringify(payload),
      method: "POST",
    });

    return response.data ?? { patentId: payload.managementNumber, mode: "CREATED" };
  }

  return {
    patentId: payload.managementNumber,
    mode: "CREATED",
  };
}

/**
 * @relatedFR FR-LEGAL-03, FR-LEGAL-04
 * @relatedUI UI-LEGAL-04
 * @description 특허 기본 정보와 회사 컨텍스트를 수정한다.
 */
export async function updatePatent(patentId: string, payload: PatentUpsertPayload): Promise<PatentSaveResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentSaveResult>>(`/patents/${patentId}`, {
      body: JSON.stringify(payload),
      method: "PUT",
    });

    return response.data ?? { patentId, mode: "UPDATED" };
  }

  updateMockPatent(patentId, payload);

  return {
    patentId,
    mode: "UPDATED",
  };
}

export async function assignPatentDepartment(patentId: string, departmentId: string): Promise<void> {
  if (isBackendApiEnabled()) {
    await requestJson<ApiEnvelope<unknown>>(`/patents/${patentId}/department`, {
      body: JSON.stringify({ departmentId }),
      method: "PATCH",
    });
    return;
  }

  assignMockPatentDepartment(patentId, departmentId);
}

/**
 * @relatedFR FR-LEGAL-03, FR-LEGAL-04
 * @relatedUI UI-LEGAL-04
 * @description 특허명, 관련제품, 현재 회사 컨텍스트를 바탕으로 기존 특허 데이터에서 가장 가까운 관련사업/관련기술 분야를 추천한다.
 */
export async function suggestPatentContextFields(
  payload: PatentUpsertPayload,
): Promise<PatentContextSuggestion | null> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentContextSuggestion | null>>(
      "/patents/context-suggestions",
      {
        body: JSON.stringify(payload),
        method: "POST",
      },
    );

    return response.data;
  }

  return suggestMockPatentContextFields(payload);
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-BUS-01, UI-BUS-02
 * @description 백엔드 특허 목록 DTO의 null 허용 필드를 현재 화면 모델에 맞는 표시값으로 변환한다.
 */
export function mapBackendPatentListItem(patent: BackendPatentListItem): PatentListItem {
  return {
    ...patent,
    applicationNumber: patent.applicationNumber ?? "",
    draftTitle: patent.draftTitle ?? patent.title,
    businessArea: patent.businessArea ?? "N/A",
    technologyArea: patent.technologyArea ?? "N/A",
    productName: patent.productName ?? "",
    country: patent.country ?? "N/A",
    coApplicants: patent.coApplicants ?? "",
    applicationDate: patent.applicationDate ?? "",
    registrationDate: patent.registrationDate ?? "",
    expectedExpirationDate: patent.expectedExpirationDate ?? "",
    feeDueDate: patent.feeDueDate ?? "",
    aiReportReadinessStatus: patent.aiReportReadinessStatus ?? "PENDING",
    aiReportFailureReason: patent.aiReportFailureReason ?? null,
    originalPatentUrl: patent.originalPatentUrl ?? getOriginalPatentUrl(patent),
  };
}

function getOriginalPatentUrl(patent: Pick<BackendPatentListItem, "applicationNumber" | "country" | "registrationNumber">) {
  const number = (patent.registrationNumber || patent.applicationNumber || "").replace(/[^0-9A-Za-z]/g, "");
  if (!number) {
    return null;
  }

  return `https://patents.google.com/patent/${(patent.country || "KR").toUpperCase()}${number}/ko`;
}

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 백엔드 특허 상세 DTO를 AI 평가 레포트, 최종 판단, 사업부 의견이 분리된 화면 모델로 변환한다.
 */
function mapBackendPatentDetail(patent: BackendPatentDetail): PatentDetail {
  return {
    ...mapBackendPatentListItem(patent),
    summary: mapBackendSummary(patent.summary),
    aiEvaluationReport: mapBackendAiEvaluationReport(patent.aiEvaluationReport),
    finalDecisionRecord: mapBackendFinalDecisionRecord(patent.finalDecisionRecord),
    businessOpinion: mapBackendBusinessOpinion(patent.businessOpinion),
    jointApplication: Boolean(patent.jointApplication),
    coApplicantConsent: mapBackendCoApplicantConsent(patent.coApplicantConsent),
  };
}

function mapBackendCoApplicantConsent(
  consent: BackendPatentDetail["coApplicantConsent"],
): CoApplicantConsent | null {
  if (!consent || !consent.status) {
    return null;
  }
  return {
    status: consent.status,
    reason: consent.reason ?? null,
    decidedAt: consent.decidedAt ?? null,
    decidedBy: consent.decidedBy ?? null,
  };
}

function mapBackendSummary(summary: BackendPatentDetail["summary"]): PatentSummary {
  return {
    summaryText: summary.summaryText,
    problemSolved: summary.problemSolved,
    coreTechnicalPoints: summary.coreTechnicalPoints,
    claimsSummary: summary.claimsSummary,
    missingFields: summary.missingFields,
  };
}

export function mapBackendAiEvaluationReport(report: BackendPatentDetail["aiEvaluationReport"]): AiEvaluationReport {
  const scores = mapBackendEvaluationScores(report.scores);
  const scoreAverage = getAverageScore(scores);
  const rawTotalScore = typeof report.totalScore === "number" ? report.totalScore : getScoreTotal(scores) ?? 0;
  const averageScore = typeof report.averageScore === "number"
    ? report.averageScore
    : scoreAverage ?? (rawTotalScore > 0 ? Math.round((rawTotalScore / 4) * 10) / 10 : undefined);

  return {
    evaluationId: report.reportId,
    createdAt: report.createdAt,
    recommendation: report.recommendation,
    recommendationText: report.recommendationReason,
    totalScore: rawTotalScore,
    totalScoreText: getTotalScoreText(scores, averageScore, rawTotalScore),
    averageScore,
    finalGrade: report.finalGrade ?? null,
    finalIndicator: report.finalIndicator ?? null,
    degraded: Boolean(report.degraded),
    failureReason: report.failureReason ?? null,
    // ORCH-06/AIREPORT-02: 리포트 레벨 리치 근거를 화면 모델로 풀스루한다(그동안 항상 빈 값이던 필드).
    keyEvidence: report.keyEvidence ?? undefined,
    judgementGrounds: report.judgementGrounds ?? undefined,
    scores,
    missingInformation: report.missingInformation,
    businessCheckRequests: report.businessCheckRequests ?? undefined,
    externalSources: mapBackendExternalSources(report.externalSources),
    rawMarkdown: report.rawMarkdown,
    markdownFilePath: report.markdownFilePath,
    // FR-LEGAL-09: 법무 편집 메타(배지/낙관적 락/원본 보기 토글에 사용).
    edited: Boolean(report.edited),
    editedBy: report.editedBy ?? null,
    editedAt: report.editedAt ?? null,
    editVersion: report.editVersion ?? 0,
    editStale: Boolean(report.editStale),
    appliedCriteria: report.appliedCriteria ?? null,
  };
}

/**
 * @relatedFR FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 백엔드가 이전 5축 응답을 보내도 현재 FE/API 계약의 4축 평가 점수만 화면 모델로 통과시킨다.
 */
export function mapBackendEvaluationScores(scores: BackendPatentDetail["aiEvaluationReport"]["scores"]): EvaluationScore[] {
  return scores.flatMap((score) => {
    if (!isEvaluationCategory(score.category)) {
      return [];
    }

    return [{
      category: score.category,
      score: score.score,
      grade: score.grade ?? null,
      evidenceSummary: score.evidence,
      // ORCH-06/AIREPORT-02: 축별 세부 근거(클릭형 출처)를 풀스루한다.
      evidenceDetails: mapBackendEvidenceDetails(score.evidenceDetails),
    }];
  });
}

type BackendSource = { title?: string | null; url?: string | null } | null | undefined;

function mapBackendSource(source: BackendSource) {
  if (!source) {
    return undefined;
  }
  return { title: source.title ?? "", url: source.url ?? undefined };
}

function mapBackendEvidenceDetails(
  details: Array<{ text: string; source?: BackendSource }> | null | undefined,
) {
  return (details ?? []).map((detail) => ({ text: detail.text, source: mapBackendSource(detail.source) }));
}

function mapBackendExternalSources(sources: Array<BackendSource> | null | undefined) {
  return (sources ?? [])
    .map((source) => ({ title: source?.title ?? "", url: source?.url ?? undefined }));
}

export function isEvaluationCategory(category: string): category is EvaluationScore["category"] {
  return EVALUATION_CATEGORIES.includes(category as EvaluationScore["category"]);
}

export function getAverageScore(scores: EvaluationScore[]) {
  const scoreValues = scores.map((score) => score.score).filter((score): score is number => typeof score === "number");

  if (scoreValues.length === 0) {
    return undefined;
  }

  return Math.round((scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length) * 10) / 10;
}

export function getScoreTotal(scores: EvaluationScore[]) {
  const scoreValues = scores.map((score) => score.score).filter((score): score is number => typeof score === "number");

  if (scoreValues.length === 0) {
    return undefined;
  }

  return scoreValues.reduce((sum, score) => sum + score, 0);
}

/**
 * @relatedFR FR-LEGAL-06, FR-LEGAL-08, FR-BUS-01
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03
 * @description AI 레포트 대표 종합 점수의 단일 정본(CONTRACT-02). 항상 0~100 평균을 반환한다.
 * averageScore가 있으면 그 값을, 없으면 축별 점수(0~100) 평균에서 산출하며, 0~400 원문 합
 * (totalScore)은 절대 대표값으로 노출하지 않는다(원문 합은 totalScoreText로만 보조 표기).
 */
export function formatReportDisplayScore(report: AiEvaluationReport) {
  return report.averageScore ?? getAverageScore(report.scores);
}

export function getTotalScoreText(scores: EvaluationScore[], averageScore: number | undefined, rawTotalScore?: number) {
  const scoreTotal = rawTotalScore ?? getScoreTotal(scores);

  if (averageScore === undefined || scoreTotal === undefined) {
    return undefined;
  }

  const maxScore = scores.length > 0 ? scores.length * 100 : 400;
  return `${scoreTotal}/${maxScore}점, 평균 ${averageScore}점`;
}


function mapBackendFinalDecisionRecord(
  finalDecisionRecord: BackendPatentDetail["finalDecisionRecord"],
): FinalDecisionRecord {
  return {
    decisionId: finalDecisionRecord.decisionId,
    reason: finalDecisionRecord.reason,
    decidedAt: finalDecisionRecord.decidedAt,
  };
}


function mapBackendBusinessOpinion(businessOpinion: BackendPatentDetail["businessOpinion"]): BusinessOpinion {
  return {
    opinion: businessOpinion.decision,
    comment: businessOpinion.reason,
    submittedAt: businessOpinion.submittedAt,
  };
}

function normalizeBibliographicInfo(info: BackendPatentBibliographicInfo): PatentBibliographicInfo {
  return {
    ...info,
    applicationDate: info.applicationDate ?? "",
    coApplicants: info.coApplicants ?? "",
    country: info.country ?? "",
    registrationDate: info.registrationDate ?? "",
    applicationNumber: info.applicationNumber ?? "",
    registrationNumber: info.registrationNumber ?? null,
    expectedExpirationDate: info.expectedExpirationDate ?? "",
  };
}
