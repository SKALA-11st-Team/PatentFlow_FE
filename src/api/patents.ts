import {
  isBackendApiEnabled,
  requestJson,
  toQueryString,
  type ApiEnvelope,
  type PaginatedApiEnvelope,
} from "./client";
import { PATENT_CONTEXT_CATEGORY_OPTIONS } from "../constants/status";
import { patentDetails, patentHistory, patents } from "../mocks/patents.mock";
import { skaxPatentRows } from "../mocks/skaxPatents.raw";
import type {
  PatentBibliographicInfo,
  PatentDetail,
  ExecutiveApprovalDecision,
  PatentHistoryItem,
  PatentListItem,
  PatentUpsertPayload,
  ReviewWorkflowStatus,
} from "../types/patent";

export interface PatentListQuery {
  departmentId?: string;
  keyword?: string;
  page?: number;
  reviewWorkflowStatus?: ReviewWorkflowStatus;
  size?: number;
  sort?: string;
}

export interface BulkExecutiveApprovalResult {
  decision: ExecutiveApprovalDecision;
  updatedCount: number;
  updatedPatentIds: string[];
}

export interface BulkMailingResult {
  updatedCount: number;
  updatedPatentIds: string[];
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

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-002, UI-006
 * @description 특허 목록을 조회한다. 백엔드 URL이 없으면 데모 mock 데이터를 동일 인터페이스로 반환한다.
 */
export async function getPatents(query: PatentListQuery = {}): Promise<PatentListItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<PaginatedApiEnvelope<PatentListItem>>(
      `/api/v1/patents${toQueryString({
        departmentId: query.departmentId,
        keyword: query.keyword,
        page: query.page,
        reviewWorkflowStatus: query.reviewWorkflowStatus,
        size: query.size,
        sort: query.sort,
      })}`,
    );

    return response.data;
  }

  return getMockPatents(query);
}

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008, FR-011, FR-012
 * @relatedUI UI-005
 * @description 특허 상세와 AI 평가 레포트, 최종 판단 정보를 조회한다.
 */
export async function getPatentDetail(patentId: string): Promise<PatentDetail | undefined> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentDetail>>(`/api/v1/patents/${patentId}`);

    return response.data;
  }

  return patentDetails.find((patent) => patent.patentId === patentId);
}

/**
 * @relatedFR FR-013
 * @relatedUI UI-005, UI-009
 * @description 특허 평가/판단 이력을 조회한다.
 */
export async function getPatentHistory(patentId: string): Promise<PatentHistoryItem[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentHistoryItem[]>>(`/api/v1/patents/${patentId}/history`);

    return response.data;
  }

  return patentHistory[patentId] ?? [];
}

/**
 * @relatedFR FR-011, FR-012
 * @relatedUI UI-002, UI-005
 * @description 결재 대기 상태의 선택 특허에 유지/포기 결재 결정을 일괄 기록한다.
 */
export async function decideExecutiveApprovals(
  patentIds: string[],
  decision: Extract<ExecutiveApprovalDecision, "APPROVED_MAINTAIN" | "APPROVED_ABANDON">,
): Promise<BulkExecutiveApprovalResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BulkExecutiveApprovalResult>>(
      "/api/v1/patents/executive-approvals/bulk-decision",
      {
        body: JSON.stringify({ decision, patentIds }),
        method: "POST",
      },
    );

    return response.data;
  }

  return decideMockExecutiveApprovals(patentIds, decision);
}

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-002, UI-007
 * @description 메일 발송 대기 상태의 선택 특허에 사업부 검토 요청 메일 발송 처리를 일괄 기록한다.
 */
export async function sendBusinessReviewMails(patentIds: string[]): Promise<BulkMailingResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BulkMailingResult>>("/api/v1/mailings/send", {
      body: JSON.stringify({ patentIds }),
      method: "POST",
    });

    return response.data;
  }

  return sendMockBusinessReviewMails(patentIds);
}

/**
 * @relatedFR FR-003
 * @relatedUI UI-004
 * @description 관리번호로 KIPRIS 우선 검색 후 결과가 없으면 Google Patents 검색을 요청한다.
 */
export async function lookupPatentBibliographicInfo(managementNumber: string): Promise<PatentBibliographicInfo | null> {
  const normalizedManagementNumber = managementNumber.trim();

  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentBibliographicInfo | null>>(
      `/api/v1/patents/external-lookup${toQueryString({
        managementNumber: normalizedManagementNumber,
        sourcePriority: "KIPRIS,GOOGLE_PATENTS",
      })}`,
    );

    return response.data;
  }

  return lookupMockPatentBibliographicInfo(normalizedManagementNumber);
}

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-004
 * @description 외부 검색 메타데이터와 사용자가 입력한 회사 컨텍스트를 조합해 특허를 등록한다.
 */
export async function createPatent(payload: PatentUpsertPayload): Promise<PatentSaveResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentSaveResult>>("/api/v1/patents", {
      body: JSON.stringify(payload),
      method: "POST",
    });

    return response.data;
  }

  return {
    patentId: payload.managementNumber,
    mode: "CREATED",
  };
}

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-004
 * @description 특허 기본 정보와 회사 컨텍스트를 수정한다.
 */
export async function updatePatent(patentId: string, payload: PatentUpsertPayload): Promise<PatentSaveResult> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentSaveResult>>(`/api/v1/patents/${patentId}`, {
      body: JSON.stringify(payload),
      method: "PUT",
    });

    return response.data;
  }

  updateMockPatent(patentId, payload);

  return {
    patentId,
    mode: "UPDATED",
  };
}

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-004
 * @description 특허명, 관련제품, 현재 회사 컨텍스트를 바탕으로 기존 특허 데이터에서 가장 가까운 관련사업/관련기술 분야를 추천한다.
 */
export async function suggestPatentContextFields(
  payload: PatentUpsertPayload,
): Promise<PatentContextSuggestion | null> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<PatentContextSuggestion | null>>(
      "/api/v1/patents/context-suggestions",
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
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-004
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
 * @relatedUI UI-004
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
 * @relatedUI UI-002, UI-007
 * @description mock 데이터에서 메일 발송 대기 특허를 사업부 응답 대기 상태로 갱신한다.
 */
function sendMockBusinessReviewMails(patentIds: string[]): BulkMailingResult {
  const targetIds = new Set(patentIds);
  const updatedPatentIds: string[] = [];
  const mailedReviewReason = "사업부 검토 요청 메일을 발송했고 담당자 응답을 기다리고 있습니다.";

  patents.forEach((patent) => {
    if (targetIds.has(patent.patentId) && patent.reviewWorkflowStatus === "MAIL_READY") {
      patent.reviewWorkflowStatus = "WAITING_BUSINESS_RESPONSE";
      patent.reviewReason = mailedReviewReason;
      updatedPatentIds.push(patent.patentId);
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

  return {
    updatedCount: updatedPatentIds.length,
    updatedPatentIds,
  };
}

function getMockPatents(query: PatentListQuery) {
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

  if (query.page !== undefined && query.size !== undefined) {
    const startIndex = Math.max(0, query.page - 1) * query.size;

    return filteredPatents.slice(startIndex, startIndex + query.size);
  }

  return filteredPatents;
}

/**
 * @relatedFR FR-003
 * @relatedUI UI-004
 * @description docs/skax_patents_list.md 기반 mock 데이터에서 KIPRIS 검색 결과를 흉내낸다.
 */
function lookupMockPatentBibliographicInfo(managementNumber: string): PatentBibliographicInfo | null {
  const keyword = managementNumber.toLowerCase();
  const matchedPatent = skaxPatentRows.find(
    (patent) =>
      patent.managementNumber.toLowerCase() === keyword ||
      patent.applicationNumber.toLowerCase() === keyword ||
      patent.registrationNumber?.toLowerCase() === keyword,
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

/**
 * @relatedFR FR-011, FR-012
 * @relatedUI UI-002, UI-005
 * @description mock 데이터에서 결재 대기 특허만 선택된 유지/포기 결재 결정으로 갱신한다.
 */
function decideMockExecutiveApprovals(
  patentIds: string[],
  decision: Extract<ExecutiveApprovalDecision, "APPROVED_MAINTAIN" | "APPROVED_ABANDON">,
): BulkExecutiveApprovalResult {
  const targetIds = new Set(patentIds);
  const updatedPatentIds: string[] = [];
  const decisionText = decision === "APPROVED_MAINTAIN" ? "유지" : "포기";
  const completedReviewReason = `임원 결재에서 ${decisionText} 결정이 완료되어 법적 액션 결과 입력이 필요합니다.`;

  patents.forEach((patent) => {
    if (targetIds.has(patent.patentId) && patent.reviewWorkflowStatus === "WAITING_EXECUTIVE_APPROVAL") {
      patent.reviewWorkflowStatus = "APPROVAL_COMPLETED";
      patent.executiveApprovalDecision = decision;
      patent.reviewReason = completedReviewReason;
      updatedPatentIds.push(patent.patentId);
    }
  });

  patentDetails.forEach((patent) => {
    if (updatedPatentIds.includes(patent.patentId)) {
      patent.reviewWorkflowStatus = "APPROVAL_COMPLETED";
      patent.executiveApprovalDecision = decision;
      patent.reviewReason = completedReviewReason;
    }
  });

  return {
    decision,
    updatedCount: updatedPatentIds.length,
    updatedPatentIds,
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
  if (field === "annualFeeDueDate") {
    return patent.annualFeeDueDate;
  }

  if (field === "departmentName") {
    return patent.departmentName;
  }

  if (field === "reviewWorkflowStatus") {
    return patent.reviewWorkflowStatus;
  }

  return patent.title;
}
