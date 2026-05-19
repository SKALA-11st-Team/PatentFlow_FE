import {
  isBackendApiEnabled,
  requestJson,
  toQueryString,
  type ApiEnvelope,
  type PageMeta,
  type PaginatedApiEnvelope,
} from "./client";
import { EVALUATION_CATEGORIES, PATENT_CONTEXT_CATEGORY_OPTIONS } from "../constants/status";
import { appendMockMailingHistory } from "../mocks/mailing.mock";
import { patentDetails, patents } from "../mocks/patents.mock";
import { skaxPatentRows } from "../mocks/skaxPatents.raw";
import type {
  AiEvaluationReport,
  BusinessOpinion,
  PatentBibliographicInfo,
  PatentDetail,
  EvaluationScore,
  FinalDecisionRecord,
  LegalActionResult,
  PatentLifecycleStatus,
  PatentListItem,
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
    totalScore: number;
    scores: Array<{
      category: string;
      score: number | null;
      evidence: string;
    }>;
    missingInformation: string[];
    rawMarkdown?: string;
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
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-BUS-01, UI-BUS-02
 * @description 특허 목록을 조회한다. 백엔드 URL이 없으면 데모 mock 데이터를 동일 인터페이스로 반환한다.
 */
export async function getPatents(query: PatentListQuery = {}): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    if (query.page !== undefined || query.size !== undefined) {
      return (await getPatentPage(query)).items;
    }

    const firstPage = await getPatentPage({ ...query, page: query.page ?? 1, size: query.size ?? 20 });
    const patentItems = [...firstPage.items];

    for (let page = firstPage.page.page + 1; page <= firstPage.page.totalPages; page += 1) {
      const nextPage = await getPatentPage({ ...query, page, size: firstPage.page.size });
      patentItems.push(...nextPage.items);
    }

    return patentItems;
  }

  return getFilteredMockPatents(query);
}

/**
 * @relatedFR FR-001, FR-002
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

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008, FR-011, FR-012
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 특허 상세와 AI 평가 레포트, 최종 판단 정보를 조회한다.
 */
export async function getPatentDetail(patentId: string): Promise<PatentDetail | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail>>(`/patents/${patentId}`);

    return response.data ? mapBackendPatentDetail(response.data) : undefined;
  }

  return patentDetails.find((patent) => patent.patentId === patentId);
}

/**
 * @relatedFR FR-014, FR-015, FR-016
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
 * @relatedFR FR-011, FR-012, FR-017
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
 * @description 단건 특허에 대해 AI 평가 레포트 생성을 요청한다. 생성 완료 시 상태가 MAIL_READY로 전환된다.
 */
export async function requestPatentAiReport(patentId: string): Promise<PatentDetail | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentDetail>>(`/patents/${patentId}/request-ai-report`, {
      method: "POST",
      body: "{}",
    });
    return response.data ? mapBackendPatentDetail(response.data) : undefined;
  }
  return getPatentDetail(patentId);
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
 * @relatedFR FR-003
 * @relatedUI UI-LEGAL-04
 * @description 등록번호로 KIPRIS 우선 검색 후 결과가 없으면 Google Patents 검색을 요청한다.
 */
export async function lookupPatentBibliographicInfo(registrationNumber: string): Promise<PatentBibliographicInfo | null> {
  const normalizedRegistrationNumber = registrationNumber.trim();

  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BackendPatentBibliographicInfo | null>>(
      `/patents/external-lookup${toQueryString({
        registrationNumber: normalizedRegistrationNumber,
        sourcePriority: "KIPRIS,GOOGLE_PATENTS",
      })}`,
    );

    return response.data ? normalizeBibliographicInfo(response.data) : null;
  }

  return lookupMockPatentBibliographicInfo(normalizedRegistrationNumber);
}

/**
 * @relatedFR FR-003, FR-004
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
 * @relatedFR FR-003, FR-004
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

  const idx = patents.findIndex((p) => p.patentId === patentId);
  if (idx !== -1) {
    patents[idx] = { ...patents[idx], departmentId };
  }
}

/**
 * @relatedFR FR-003, FR-004
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
 * @relatedFR FR-001, FR-002
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
  };
}

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008, FR-011, FR-012
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
  const averageScore = getAverageScore(scores);

  return {
    evaluationId: report.reportId,
    createdAt: report.createdAt,
    recommendation: report.recommendation,
    recommendationText: report.recommendationReason,
    totalScore: averageScore ?? report.totalScore,
    totalScoreText: getTotalScoreText(scores, averageScore),
    averageScore,
    scores,
    missingInformation: report.missingInformation,
    rawMarkdown: report.rawMarkdown,
  };
}

/**
 * @relatedFR FR-006, FR-007, FR-008
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

export function getTotalScoreText(scores: EvaluationScore[], averageScore: number | undefined) {
  const scoreValues = scores.map((score) => score.score).filter((score): score is number => typeof score === "number");

  if (averageScore === undefined || scoreValues.length === 0) {
    return undefined;
  }

  const totalScore = scoreValues.reduce((sum, score) => sum + score, 0);

  return `${totalScore}/${scores.length * 100}점, 평균 ${averageScore}점`;
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

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-LEGAL-04
 * @description mock 특허 목록과 상세 데이터에 특허 기본 정보 수정 결과를 반영한다.
 */
function updateMockPatent(patentId: string, payload: PatentUpsertPayload) {
  const listItem = patents.find((patent) => patent.patentId === patentId);
  const detailItem = patentDetails.find((patent) => patent.patentId === patentId);

  if (listItem) {
    applyPatentPayload(listItem, payload);
  }

  if (detailItem) {
    applyPatentPayload(detailItem, payload);
  }
}

function applyPatentPayload(patent: PatentListItem, payload: PatentUpsertPayload) {
  patent.managementNumber = payload.managementNumber;
  patent.applicationNumber = payload.applicationNumber;
  patent.registrationNumber = payload.registrationNumber;
  patent.title = payload.title;
  patent.draftTitle = payload.title;
  patent.businessArea = payload.businessArea;
  patent.technologyArea = payload.technologyArea;
  patent.productName = payload.productName;
  patent.country = payload.country || "N/A";
  patent.coApplicants = payload.coApplicants;
  patent.applicationDate = payload.applicationDate;
  patent.registrationDate = payload.registrationDate;
  patent.expectedExpirationDate = payload.expectedExpirationDate;
}

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-LEGAL-04
 * @description 기존 특허 메타데이터와 입력 특허의 키워드 유사도를 비교해 mock 관련 분야 추천값을 만든다.
 */
function suggestMockPatentContextFields(payload: PatentUpsertPayload): PatentContextSuggestion | null {
  const sourceText = [
    payload.title,
    payload.productName,
    payload.technologyArea,
    payload.businessArea,
    payload.applicationNumber,
  ].join(" ");
  const sourceTokens = tokenizeContextText(sourceText);

  if (sourceTokens.length === 0) {
    return null;
  }

  const scoredCandidates = getFixedContextCandidates()
    .map((candidate) => ({
      candidate,
      score: scoreContextCandidate(sourceTokens, candidate),
    }))
    .sort((firstCandidate, secondCandidate) => secondCandidate.score - firstCandidate.score);
  const bestCandidate = scoredCandidates[0];

  if (!bestCandidate || bestCandidate.score <= 0) {
    return null;
  }

  return {
    businessArea: bestCandidate.candidate.businessArea,
    confidenceText: bestCandidate.score >= 6 ? "높음" : bestCandidate.score >= 3 ? "보통" : "낮음",
    reason: `${bestCandidate.candidate.referenceTitle} 특허와 고정 카테고리의 키워드를 함께 비교했습니다.`,
    technologyArea: bestCandidate.candidate.technologyArea,
  };
}

interface FixedContextCandidate {
  businessArea: string;
  referenceText: string;
  referenceTitle: string;
  technologyArea: string;
}

function getFixedContextCandidates() {
  return PATENT_CONTEXT_CATEGORY_OPTIONS.flatMap((option) =>
    option.technologyAreas.map((technologyArea) => {
      const relatedRows = skaxPatentRows.filter(
        (row) =>
          normalizeBusinessArea(row.businessArea) === option.businessArea &&
          normalizeTechnologyArea(row.technologyArea) === technologyArea,
      );
      const referenceText = [
        option.businessArea,
        technologyArea,
        ...relatedRows.flatMap((row) => [row.title, row.draftTitle, row.productName, row.technologyArea]),
      ].join(" ");
      const firstReferenceRow = relatedRows[0];

      return {
        businessArea: option.businessArea,
        referenceText,
        referenceTitle: firstReferenceRow?.title || firstReferenceRow?.draftTitle || `${option.businessArea} ${technologyArea}`,
        technologyArea,
      };
    }),
  );
}

function scoreContextCandidate(sourceTokens: string[], candidate: FixedContextCandidate) {
  const candidateTokens = tokenizeContextText(candidate.referenceText);
  const candidateTokenSet = new Set(candidateTokens);
  const overlapScore = sourceTokens.reduce(
    (totalScore, token) => totalScore + (candidateTokenSet.has(token) ? getContextTokenWeight(token) : 0),
    0,
  );
  const categoryNameScore = sourceTokens.some(
    (token) =>
      candidate.businessArea.toLowerCase().includes(token) || candidate.technologyArea.toLowerCase().includes(token),
  )
    ? 3
    : 0;

  return overlapScore + categoryNameScore;
}

function tokenizeContextText(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^0-9a-z가-힣]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !["관련", "기술", "시스템", "방법", "특허"].includes(token)),
    ),
  );
}

function getContextTokenWeight(token: string) {
  return token.length >= 4 ? 2 : 1;
}

function normalizeBusinessArea(value: string) {
  const normalizationMap: Record<string, string> = {
    기존사업: "통합서비스",
    솔루션: "통합서비스",
  };

  return normalizationMap[value] ?? value;
}

function normalizeTechnologyArea(value: string) {
  return value.replace(/（/g, "(").replace(/）/g, ")");
}

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-02, UI-LEGAL-06
 * @description mock 데이터에서 메일 발송 대기 특허를 사업부 응답 대기 상태로 갱신한다.
 */
function sendMockBusinessReviewMails(drafts: BusinessReviewMailSendDraft[]): BulkMailingResult {
  const patentIds = drafts.flatMap((draft) => draft.patents.map((patent) => patent.patentId));
  const targetIds = new Set(patentIds);
  const updatedPatentIds: string[] = [];
  const skippedPatentIds: string[] = [];
  const mailedReviewReason = "사업부 검토 요청 메일을 발송했고 담당자 응답을 기다리고 있습니다.";

  patents.forEach((patent) => {
    if (targetIds.has(patent.patentId) && patent.reviewWorkflowStatus === "MAIL_READY") {
      patent.reviewWorkflowStatus = "WAITING_BUSINESS_RESPONSE";
      patent.reviewReason = mailedReviewReason;
      updatedPatentIds.push(patent.patentId);
    } else if (targetIds.has(patent.patentId)) {
      skippedPatentIds.push(patent.patentId);
    }
  });

  patentDetails.forEach((patent) => {
    if (updatedPatentIds.includes(patent.patentId)) {
      patent.reviewWorkflowStatus = "WAITING_BUSINESS_RESPONSE";
      patent.reviewReason = mailedReviewReason;
      patent.businessOpinion.comment = `${patent.departmentName} 의견 대기 중입니다.`;
      patent.businessOpinion.submittedAt = null;
    }
  });

  if (updatedPatentIds.length > 0) {
    appendMockMailingHistory(
      drafts
        .map((draft) => ({
          ...draft,
          patents: draft.patents.filter((patent) => updatedPatentIds.includes(patent.patentId)),
        }))
        .filter((draft) => draft.patents.length > 0),
    );
  }

  return {
    skippedPatentIds,
    updatedCount: updatedPatentIds.length,
    updatedPatentIds,
  };
}

/**
 * @relatedFR FR-011, FR-012, FR-017
 * @relatedUI UI-LEGAL-05
 * @description mock 특허 상세에 단건 최종 판단과 법무 처리 결과를 반영한다.
 */
function recordMockPatentFinalDecision(patentId: string, payload: FinalDecisionPayload): FinalDecisionResult {
  const result = createFallbackFinalDecisionResult(patentId, payload);
  const listItem = patents.find((patent) => patent.patentId === patentId);
  const detailItem = patentDetails.find((patent) => patent.patentId === patentId);

  if (listItem) {
    listItem.legalActionResult = payload.legalActionResult;
    listItem.reviewWorkflowStatus = result.reviewWorkflowStatus;
    listItem.lifecycleStatus = getLifecycleStatusByLegalAction(payload.legalActionResult);
  }

  if (detailItem) {
    detailItem.legalActionResult = payload.legalActionResult;
    detailItem.reviewWorkflowStatus = result.reviewWorkflowStatus;
    detailItem.lifecycleStatus = getLifecycleStatusByLegalAction(payload.legalActionResult);
    detailItem.finalDecisionRecord = result.finalDecisionRecord;
  }

  return result;
}

function createFallbackFinalDecisionResult(patentId: string, payload: FinalDecisionPayload): FinalDecisionResult {
  return {
    finalDecisionRecord: {
      decidedAt: new Date().toISOString(),
      decisionId: `${patentId}-DEC-FINAL`,
      reason: payload.reason,
    },
    legalActionResult: payload.legalActionResult,
    patentId,
    reviewWorkflowStatus: "LEGAL_ACTION_RECORDED",
  };
}

function getLifecycleStatusByLegalAction(legalActionResult: LegalActionResult): PatentLifecycleStatus {
  if (legalActionResult === "ABANDONED") {
    return "ABANDONED";
  }

  if (legalActionResult === "SOLD") {
    return "SOLD";
  }

  return "ACTIVE";
}

function getMockPatentPage(query: PatentListQuery): PatentListPage {
  const filteredPatents = getFilteredMockPatents(query);
  const page = Math.max(query.page ?? 1, 1);
  const size = Math.min(Math.max(query.size ?? 20, 1), 20);
  const startIndex = (page - 1) * size;
  const totalPages = Math.ceil(filteredPatents.length / size);

  return {
    items: filteredPatents.slice(startIndex, startIndex + size),
    page: {
      page,
      size,
      totalElements: filteredPatents.length,
      totalPages,
    },
  };
}

function getFilteredMockPatents(query: PatentListQuery) {
  const keyword = query.keyword?.trim().toLowerCase() ?? "";
  let filteredPatents = patents.filter((patent) => {
    const matchesKeyword =
      keyword.length === 0 ||
      patent.title.toLowerCase().includes(keyword) ||
      patent.managementNumber.toLowerCase().includes(keyword) ||
      patent.applicationNumber.toLowerCase().includes(keyword);
    const matchesDepartment = !query.departmentId || patent.departmentId === query.departmentId;
    const matchesWorkflow =
      !query.reviewWorkflowStatus || patent.reviewWorkflowStatus === query.reviewWorkflowStatus;

    return matchesKeyword && matchesDepartment && matchesWorkflow;
  });

  if (query.sort) {
    filteredPatents = sortMockPatents(filteredPatents, query.sort);
  }

  return filteredPatents;
}

/**
 * @relatedFR FR-003
 * @relatedUI UI-LEGAL-04
 * @description docs/skax_patents_list.md 기반 mock 데이터에서 등록번호 KIPRIS 검색 결과를 흉내낸다.
 */
function lookupMockPatentBibliographicInfo(registrationNumber: string): PatentBibliographicInfo | null {
  const keyword = registrationNumber.toLowerCase();
  const matchedPatent = skaxPatentRows.find(
    (patent) => patent.registrationNumber?.toLowerCase() === keyword,
  );

  if (!matchedPatent) {
    return null;
  }

  return {
    managementNumber: matchedPatent.managementNumber,
    title: matchedPatent.title || matchedPatent.draftTitle || matchedPatent.managementNumber,
    applicationDate: matchedPatent.applicationDate,
    coApplicants: matchedPatent.coApplicants,
    country: matchedPatent.country,
    registrationDate: matchedPatent.registrationDate,
    applicationNumber: matchedPatent.applicationNumber,
    registrationNumber: matchedPatent.registrationNumber,
    expectedExpirationDate: matchedPatent.expectedExpirationDate,
    source: "KIPRIS",
  };
}

function sortMockPatents(items: PatentListItem[], sort: string) {
  const [field, direction = "asc"] = sort.split(",");
  const multiplier = direction === "desc" ? -1 : 1;

  return [...items].sort((first, second) => {
    const firstValue = getSortablePatentValue(first, field);
    const secondValue = getSortablePatentValue(second, field);

    return firstValue.localeCompare(secondValue) * multiplier;
  });
}

function getSortablePatentValue(patent: PatentListItem, field: string) {
  if (field === "feeDueDate") {
    return patent.feeDueDate;
  }

  if (field === "departmentName") {
    return patent.departmentName;
  }

  if (field === "reviewWorkflowStatus") {
    return patent.reviewWorkflowStatus;
  }

  return patent.title;
}
