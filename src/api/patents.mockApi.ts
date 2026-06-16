import { EVALUATION_CATEGORIES, PATENT_CONTEXT_CATEGORY_OPTIONS } from "../constants/status";
import { appendMockMailingHistory } from "../mocks/mailing.mock";
import { patentDetails, patents } from "../mocks/patents.mock";
import { skaxPatentRows } from "../mocks/skaxPatents.raw";
import type { BusinessReviewMailSendDraft } from "../types/mailing";
import type {
  AiEvaluationReport,
  AiReportEditPayload,
  CoApplicantConsent,
  FeeScheduleEntry,
  LegalActionResult,
  PatentBibliographicInfo,
  PatentDetail,
  PatentFeeSchedule,
  PatentLifecycleStatus,
  PatentListItem,
  PatentPdfMeta,
  PatentUpsertPayload,
  Recommendation,
} from "../types/patent";
import type {
  BulkMailingResult,
  CoApplicantConsentPayload,
  FinalDecisionPayload,
  FinalDecisionResult,
  PatentContextSuggestion,
  PatentListPage,
  PatentListQuery,
} from "./patents";

// 공동출원 합의 게이트(데모) — 특허별 합의 기록을 인메모리로 보관한다.
const mockCoApplicantConsents = new Map<string, CoApplicantConsent>();

function isMockJointApplication(detail: PatentDetail): boolean {
  const co = detail.coApplicants?.trim();
  return Boolean(co) && co !== "없음" && co !== "정보 부족 있음";
}

export function getMockPatentDetail(patentId: string): PatentDetail | undefined {
  const detail = patentDetails.find((patent) => patent.patentId === patentId);
  if (!detail) {
    return undefined;
  }
  // 공동출원 여부는 coApplicants 로 파생하고, 합의 기록은 인메모리 맵에서 덧입힌다.
  return {
    ...detail,
    jointApplication: isMockJointApplication(detail),
    coApplicantConsent: mockCoApplicantConsents.get(patentId) ?? null,
  };
}

export function recordMockCoApplicantConsent(
  patentId: string,
  payload: CoApplicantConsentPayload,
): PatentDetail | undefined {
  const detail = patentDetails.find((patent) => patent.patentId === patentId);
  if (!detail) {
    return undefined;
  }
  mockCoApplicantConsents.set(patentId, {
    status: payload.status,
    reason: payload.reason,
    decidedAt: new Date().toISOString(),
    decidedBy: "데모 관리자",
  });
  return getMockPatentDetail(patentId);
}

// FR-LEGAL-09: 데모 모드용 법무 편집 — AI 원본을 특허별로 보관하고 편집은 유효본에만 반영한다.
const mockOriginalAiReports = new Map<string, AiEvaluationReport>();

export function updateMockPatentAiReport(
  patentId: string,
  payload: AiReportEditPayload,
): AiEvaluationReport | undefined {
  const detailItem = patentDetails.find((patent) => patent.patentId === patentId);
  if (!detailItem) {
    return undefined;
  }
  const current = detailItem.aiEvaluationReport;
  if (!mockOriginalAiReports.has(patentId)) {
    mockOriginalAiReports.set(patentId, structuredClone(current));
  }
  const overrides = payload.overrides;
  const edited: AiEvaluationReport = {
    ...current,
    recommendation: overrides.recommendation ?? current.recommendation,
    recommendationText: overrides.recommendationText ?? current.recommendationText,
    keyEvidence: overrides.keyEvidence ?? current.keyEvidence,
    judgementGrounds: overrides.judgementGrounds ?? current.judgementGrounds,
    businessCheckRequests: overrides.businessCheckRequests ?? current.businessCheckRequests,
    rawMarkdown: overrides.rawMarkdown ?? current.rawMarkdown,
    scores: current.scores.map((score) => {
      const override = overrides.scores?.find((item) => item.category === score.category);
      if (!override) {
        return score;
      }
      return {
        ...score,
        score: override.score ?? score.score,
        grade: override.grade ?? score.grade,
        evidenceSummary: override.evidenceSummary ?? score.evidenceSummary,
      };
    }),
    edited: true,
    editedBy: "데모 관리자",
    editedAt: new Date().toISOString(),
    editVersion: (current.editVersion ?? 0) + 1,
    editStale: false,
  };
  detailItem.aiEvaluationReport = edited;
  if (overrides.recommendation) {
    detailItem.currentRecommendation = overrides.recommendation;
    const listItem = patents.find((patent) => patent.patentId === patentId);
    if (listItem) {
      listItem.currentRecommendation = overrides.recommendation;
    }
  }
  return edited;
}

export function revertMockPatentAiReport(patentId: string): AiEvaluationReport | undefined {
  const detailItem = patentDetails.find((patent) => patent.patentId === patentId);
  const original = mockOriginalAiReports.get(patentId);
  if (!detailItem) {
    return undefined;
  }
  if (!original) {
    return detailItem.aiEvaluationReport;
  }
  const reverted: AiEvaluationReport = {
    ...structuredClone(original),
    edited: false,
    editedBy: null,
    editedAt: null,
    editVersion: (detailItem.aiEvaluationReport.editVersion ?? 0) + 1,
    editStale: false,
  };
  detailItem.aiEvaluationReport = reverted;
  detailItem.currentRecommendation = reverted.recommendation;
  const listItem = patents.find((patent) => patent.patentId === patentId);
  if (listItem) {
    listItem.currentRecommendation = reverted.recommendation;
  }
  mockOriginalAiReports.delete(patentId);
  return reverted;
}

export function getMockPatentAiReportOriginal(patentId: string): AiEvaluationReport | undefined {
  const original = mockOriginalAiReports.get(patentId);
  if (original) {
    return structuredClone(original);
  }
  return patentDetails.find((patent) => patent.patentId === patentId)?.aiEvaluationReport;
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

  return patent.currentRecommendation === "CONDITIONAL_MAINTAIN" ? "REVIEW_AGAIN" : patent.currentRecommendation;
}

function createGeneratedMockAiReport(patent: PatentDetail, recommendation: Recommendation): AiEvaluationReport {
  const scores = patent.aiEvaluationReport.scores.length
    ? patent.aiEvaluationReport.scores
    : EVALUATION_CATEGORIES.map((category) => ({
        category,
        evidenceSummary: "AI 평가 생성 후 상세 근거 확인이 필요한 항목입니다.",
        score: null,
      }));
  // CONTRACT-02: Agent 권위에 맞춰 종합 점수는 핵심 3축(권리성·기술성·시장성) 합(0~300),
  // 평균은 그 3축 평균(0~100)이다. 사업 연계성(BUSINESS_ALIGNMENT)은 축 점수로 표시하되 합산에서 제외한다.
  const scoredValues = scores.flatMap((score) =>
    score.category === "BUSINESS_ALIGNMENT" || score.score == null ? [] : [score.score],
  );
  const scoreSum = scoredValues.reduce((sum, score) => sum + score, 0);
  const averageScore = scoredValues.length
    ? Number((scoreSum / scoredValues.length).toFixed(1))
    : patent.aiEvaluationReport.averageScore;
  const maxScore = scoredValues.length * 100;

  return {
    ...patent.aiEvaluationReport,
    averageScore,
    createdAt: new Date().toISOString(),
    evaluationId: `REPORT-${patent.patentId}-${Date.now()}`,
    recommendation,
    recommendationText: getGeneratedMockRecommendationText(recommendation),
    totalScore: scoredValues.length ? scoreSum : patent.aiEvaluationReport.totalScore,
    totalScoreText: scoredValues.length
      ? `${scoreSum}/${maxScore}점, 평균 ${averageScore}점`
      : patent.aiEvaluationReport.totalScoreText,
    scores,
  };
}

function getGeneratedMockRecommendationText(recommendation: Recommendation) {
  const textMap: Record<Recommendation, string> = {
    ABANDON: "AI 평가 결과 사업 연계성과 유지 필요성 근거가 부족해 포기 검토가 필요합니다.",
    CONDITIONAL_MAINTAIN: "AI 평가 결과 권리성·기술성 기반은 확인되나 일부 근거 보완을 전제로 조건부 유지가 적절합니다.",
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
    // 법무 최종판단 기록 후 워크플로우 종착 상태는 LEGAL_ACTION_RECORDED('처리 완료')다.
    // BE PatentWorkflowService(withFinalDecision/withPatchedFinalDecision)와 정합시킨다.
    reviewWorkflowStatus: "LEGAL_ACTION_RECORDED",
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

function getMockFeeEntry(cc: string, ageYears: number): { estimatedAmount: number; currency: string } {
  switch (cc) {
    case "KR":
      return { currency: "KRW", estimatedAmount: ageYears < 4 ? 150_000 : ageYears < 7 ? 180_000 : ageYears < 10 ? 240_000 : 300_000 };
    case "JP":
      return { currency: "JPY", estimatedAmount: ageYears < 4 ? 33_000 : ageYears < 7 ? 61_000 : ageYears < 10 ? 111_000 : 178_000 };
    case "CN":
      return { currency: "CNY", estimatedAmount: ageYears < 4 ? 900 : ageYears < 7 ? 1_200 : ageYears < 10 ? 2_000 : ageYears < 13 ? 4_000 : 6_000 };
    case "EP":
      return { currency: "EUR", estimatedAmount: ageYears < 4 ? 470 : ageYears < 7 ? 800 : ageYears < 10 ? 1_400 : 2_000 };
    case "US":
      return { currency: "USD", estimatedAmount: ageYears < 3.5 ? 860 : ageYears < 7.5 ? 1_930 : 4_000 };
    default:
      return { currency: "KRW", estimatedAmount: 300_000 };
  }
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-04, UI-BUS-02
 * @description FEE-06: 연차료 일정 mock — BE 미연결 시 feeDueDate 기준 단순 연 단위 일정을 생성한다.
 * (국가 정밀 규칙은 BE가 단일 출처이며, mock은 화면 개발용 근사치만 제공한다.)
 */
export function getMockPatentFeeSchedule(patentId: string): PatentFeeSchedule | undefined {
  const detail = getMockPatentDetail(patentId);
  if (!detail || !detail.feeDueDate) {
    return undefined;
  }
  const mailLeadMonths = 2;
  const [year, month, day] = detail.feeDueDate.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toIso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const cc = (detail.country ?? "").toUpperCase();
  const registrationBased = cc === "KR" || cc === "US";
  const basisText = registrationBased
    ? (detail.registrationDate ?? detail.applicationDate)
    : (detail.applicationDate ?? detail.registrationDate);
  const basisYear = basisText ? parseInt(basisText.slice(0, 4), 10) : null;

  let nextAssigned = false;
  const items: FeeScheduleEntry[] = Array.from({ length: 7 }, (_, index) => {
    const offset = index - 3;
    const dueDate = new Date(year + offset, month - 1, day);
    const reviewStartDate = new Date(year + offset, month - 1 - mailLeadMonths, day);
    const past = dueDate.getTime() < today.getTime();
    const isNext = !past && !nextAssigned;
    if (isNext) {
      nextAssigned = true;
    }
    const ageYears = basisYear != null ? (year + offset) - basisYear : 5;
    const { estimatedAmount, currency } = getMockFeeEntry(cc, ageYears);
    return {
      yearLabel: `${year + offset}년`,
      yearNumber: ageYears >= 0 ? Math.round(ageYears) : 0,
      lump: false,
      dueDate: toIso(dueDate),
      reviewStartDate: toIso(reviewStartDate),
      status: past ? "PAST" : isNext ? "NEXT" : "FUTURE",
      adjusted: false,
      estimatedAmount,
      currency,
    };
  });

  return {
    patentId,
    country: detail.country,
    basis: "APPLICATION_DATE",
    basisDate: detail.applicationDate ?? null,
    paymentRuleLabel: "출원일 기준 매년 도래하는 연차료",
    initialLumpYears: 0,
    mailLeadMonths,
    recipient: detail.departmentName
      ? {
          departmentId: detail.departmentId ?? "",
          departmentName: detail.departmentName,
          managerName: `${detail.departmentName} 담당자`,
          managerEmail: "",
          ccEmails: [],
        }
      : null,
    items,
  };
}

/**
 * @relatedFR FR-LEGAL-13
 * MAIL-13: 특허 PDF 첨부 mock — 업로드 메타만 인메모리로 보관한다(본문 저장·다운로드는 BE 전용).
 */
const mockPatentPdfMetas = new Map<string, PatentPdfMeta>();

export function getMockPatentPdfMeta(patentId: string): PatentPdfMeta {
  return (
    mockPatentPdfMetas.get(patentId) ?? {
      patentId,
      exists: false,
      storageType: null,
      docName: null,
      contentLength: null,
      uploadedBy: null,
      createdAt: null,
    }
  );
}

export function setMockPatentPdf(patentId: string, docName: string, contentLength: number): PatentPdfMeta {
  const meta: PatentPdfMeta = {
    patentId,
    exists: true,
    storageType: "UPLOADED",
    docName,
    contentLength,
    uploadedBy: "Legal팀(mock)",
    createdAt: new Date().toISOString(),
  };
  mockPatentPdfMetas.set(patentId, meta);
  return meta;
}

export function removeMockPatentPdf(patentId: string) {
  mockPatentPdfMetas.delete(patentId);
}
