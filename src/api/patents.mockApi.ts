import { EVALUATION_CATEGORIES, PATENT_CONTEXT_CATEGORY_OPTIONS } from "../constants/status";
import { appendMockMailingHistory } from "../mocks/mailing.mock";
import { patentDetails, patents } from "../mocks/patents.mock";
import { skaxPatentRows } from "../mocks/skaxPatents.raw";
import type { BusinessReviewMailSendDraft } from "../types/mailing";
import type {
  AiEvaluationReport,
  LegalActionResult,
  PatentBibliographicInfo,
  PatentDetail,
  PatentLifecycleStatus,
  PatentListItem,
  PatentUpsertPayload,
  Recommendation,
} from "../types/patent";
import type {
  BulkMailingResult,
  FinalDecisionPayload,
  FinalDecisionResult,
  PatentContextSuggestion,
  PatentListPage,
  PatentListQuery,
} from "./patents";

export function getMockPatentDetail(patentId: string): PatentDetail | undefined {
  return patentDetails.find((patent) => patent.patentId === patentId);
}

export function updateMockPatent(patentId: string, payload: PatentUpsertPayload) {
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

export function assignMockPatentDepartment(patentId: string, departmentId: string) {
  const index = patents.findIndex((patent) => patent.patentId === patentId);
  if (index !== -1) {
    patents[index] = { ...patents[index], departmentId };
  }
}

export function requestMockPatentAiReport(patentId: string): PatentDetail | undefined {
  const listItem = patents.find((patent) => patent.patentId === patentId);
  const detailItem = patentDetails.find((patent) => patent.patentId === patentId);

  if (!detailItem) {
    return undefined;
  }

  if (detailItem.reviewWorkflowStatus !== "REVIEW_QUARTER_STARTED") {
    return detailItem;
  }

  const recommendation = getMockGeneratedRecommendation(detailItem);
  const report = createGeneratedMockAiReport(detailItem, recommendation);
  const summaryText = `${detailItem.title} 특허의 핵심 기술과 사업 적용 가능성을 AI 평가 레포트 기준으로 다시 요약했습니다.`;
  const reviewReason = "AI 특허 평가 레포트가 생성되었고 관리자 메일 발송 명령이 필요합니다.";

  detailItem.reviewWorkflowStatus = "MAIL_READY";
  detailItem.reviewReason = reviewReason;
  detailItem.currentRecommendation = recommendation;
  detailItem.aiEvaluationReport = report;
  detailItem.summary = {
    ...detailItem.summary,
    summaryText,
  };

  if (listItem) {
    listItem.reviewWorkflowStatus = "MAIL_READY";
    listItem.reviewReason = reviewReason;
    listItem.currentRecommendation = recommendation;
  }

  return detailItem;
}

function getMockGeneratedRecommendation(patent: PatentDetail): Recommendation {
  if (!patent.productName || patent.productName === "해당사항없음") {
    return "REVIEW_AGAIN";
  }

  return patent.currentRecommendation === "HOLD" ? "REVIEW_AGAIN" : patent.currentRecommendation;
}

function createGeneratedMockAiReport(patent: PatentDetail, recommendation: Recommendation): AiEvaluationReport {
  const scores = patent.aiEvaluationReport.scores.length
    ? patent.aiEvaluationReport.scores
    : EVALUATION_CATEGORIES.map((category) => ({
        category,
        evidenceSummary: "AI 평가 생성 후 상세 근거 확인이 필요한 항목입니다.",
        score: null,
      }));
  const scoredValues = scores.flatMap((score) => (score.score == null ? [] : [score.score]));
  const averageScore = scoredValues.length
    ? Number((scoredValues.reduce((sum, score) => sum + score, 0) / scoredValues.length).toFixed(1))
    : patent.aiEvaluationReport.totalScore;

  return {
    ...patent.aiEvaluationReport,
    averageScore,
    createdAt: new Date().toISOString(),
    evaluationId: `REPORT-${patent.patentId}-${Date.now()}`,
    recommendation,
    recommendationText: getGeneratedMockRecommendationText(recommendation),
    totalScore: averageScore,
    totalScoreText: scoredValues.length
      ? `평균 ${averageScore}점`
      : patent.aiEvaluationReport.totalScoreText,
    scores,
  };
}

function getGeneratedMockRecommendationText(recommendation: Recommendation) {
  const textMap: Record<Recommendation, string> = {
    ABANDON: "AI 평가 결과 사업 연계성과 유지 필요성 근거가 부족해 포기 검토가 필요합니다.",
    HOLD: "AI 평가 결과 일부 근거가 부족해 추가 확인 후 판단하는 것이 적절합니다.",
    MAINTAIN: "AI 평가 결과 권리성, 기술성, 사업 연계성 근거가 확인되어 유지 검토가 가능합니다.",
    REVIEW_AGAIN: "AI 평가 결과 일부 평가 근거 보완 후 다시 검토하는 것이 적절합니다.",
  };

  return textMap[recommendation];
}

export function suggestMockPatentContextFields(payload: PatentUpsertPayload): PatentContextSuggestion | null {
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

export function sendMockBusinessReviewMails(drafts: BusinessReviewMailSendDraft[]): BulkMailingResult {
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

export function recordMockPatentFinalDecision(patentId: string, payload: FinalDecisionPayload): FinalDecisionResult {
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

export function createFallbackFinalDecisionResult(patentId: string, payload: FinalDecisionPayload): FinalDecisionResult {
  return {
    finalDecisionRecord: {
      decidedAt: new Date().toISOString(),
      decisionId: `${patentId}-DEC-FINAL`,
      reason: payload.reason,
    },
    legalActionResult: payload.legalActionResult,
    patentId,
    reviewWorkflowStatus: "NOT_IN_REVIEW",
  };
}

function getLifecycleStatusByLegalAction(legalActionResult: LegalActionResult): PatentLifecycleStatus {
  if (legalActionResult === "ABANDONED") {
    return "ABANDONED";
  }
  return "ACTIVE";
}

export function getMockPatentPage(query: PatentListQuery): PatentListPage {
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

export function getFilteredMockPatents(query: PatentListQuery) {
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

export function lookupMockPatentBibliographicInfo(applicationNumber: string): PatentBibliographicInfo | null {
  const keyword = applicationNumber.toLowerCase();
  const matchedPatent = skaxPatentRows.find(
    (patent) => patent.applicationNumber.toLowerCase() === keyword,
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
