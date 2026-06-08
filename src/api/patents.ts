import {
  isBackendApiEnabled,
  requestJson,
  toQueryString,
  type ApiEnvelope,
  type PageMeta,
  type PaginatedApiEnvelope,
} from "./client";
import { EVALUATION_CATEGORIES } from "../constants/status";
import {
  assignMockPatentDepartment,
  createFallbackFinalDecisionResult,
  getFilteredMockPatents,
  getMockPatentDetail,
  getMockPatentPage,
  lookupMockPatentBibliographicInfo,
  recordMockPatentFinalDecision,
  requestMockPatentAiReport,
  sendMockBusinessReviewMails,
  suggestMockPatentContextFields,
  updateMockPatent,
} from "./patents.mockApi";
import type {
  AiEvaluationReport,
  BusinessOpinion,
  PatentBibliographicInfo,
  PatentDetail,
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
}

export interface PatentListPage {
  items: PatentListItem[];
  page: PageMeta;
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
  originalPatentUrl?: string | null;
};

interface BackendPatentDetail extends BackendPatentListItem {
  summary: {
    summaryText: string;
    problemSolved: string;
    coreTechnicalPoints: string[];
    claimsSummary: string;
    missingFields: string[];
    rawMarkdown?: string;
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
    }>;
    missingInformation: string[];
    rawMarkdown?: string;
    markdownFilePath?: string;
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
      })}`,
    );

    return {
      items: (response.data ?? []).map(mapBackendPatentListItem),
      page: response.page,
    };
  }

  return getMockPatentPage(query);
}

export async function getBusinessPatents(query: PatentListQuery = {}): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    if (query.page !== undefined || query.size !== undefined) {
      return (await getBusinessPatentPage(query)).items;
    }

    // PERF-01: 전체 페이지 병렬 로딩(Promise.all) 제거. 사업부별 특허 수는 단일 페이지(최대 100건) 범위 내이므로
    // 단일 페이지 응답만 반환한다. (TODO: 단일 부서 특허가 100건을 초과하면 서버 페이징 연동 필요)
    return (await getBusinessPatentPage({ ...query, page: 1, size: 100 })).items;
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
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<FinalDecisionResult>>(`/patents/${patentId}/final-decision`, {
      body: JSON.stringify(payload),
      method: "POST",
    });

    return response.data ?? createFallbackFinalDecisionResult(patentId, payload);
  }

  return recordMockPatentFinalDecision(patentId, payload);
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
 * @description 복수 특허를 MAIL_READY 상태로 일괄 전환한다.
 */
export async function markPatentsMailReady(patentIds: string[]): Promise<string[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<string[]>>("/patents/batch/mark-mail-ready", {
      method: "POST",
      body: JSON.stringify({ patentIds }),
    });
    return response.data ?? [];
  }
  return patentIds;
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
function mapBackendPatentListItem(patent: BackendPatentListItem): PatentListItem {
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
  };
}

function mapBackendSummary(summary: BackendPatentDetail["summary"]): PatentSummary {
  return {
    summaryText: summary.summaryText,
    problemSolved: summary.problemSolved,
    coreTechnicalPoints: summary.coreTechnicalPoints,
    claimsSummary: summary.claimsSummary,
    missingFields: summary.missingFields,
    rawMarkdown: summary.rawMarkdown,
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
    scores,
    missingInformation: report.missingInformation,
    rawMarkdown: report.rawMarkdown,
    markdownFilePath: report.markdownFilePath,
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
    }];
  });
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
