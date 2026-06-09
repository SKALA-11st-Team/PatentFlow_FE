import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { patents } from "../mocks/patents.mock";

export interface LegalDashboardSummary {
  totalPatents: number;
  // DASH-01: 이번 분기 검토 대상 수(KPI 분모 단일 출처).
  quarterlyTargetCount: number;
  pendingReview: number;
  waitingBusinessResponse: number;
  businessResponseReceived: number;
  pendingFinalDecision: number;
  legalActionCompleted: number;
}

export interface BusinessDashboardSummary {
  totalAssigned: number;
  pendingReview: number;
  reviewed: number;
  maintained: number;
  abandoned: number;
}

/**
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드 KPI 요약을 백엔드에서 조회한다.
 */
export async function getLegalDashboardSummary(): Promise<LegalDashboardSummary> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<LegalDashboardSummary>>("/legal/dashboard/summary");
    return response.data ?? createEmptyLegalDashboardSummary();
  }

  return {
    totalPatents: patents.length,
    quarterlyTargetCount: patents.filter((patent) => patent.reviewWorkflowStatus !== "NOT_IN_REVIEW").length,
    pendingReview: patents.filter((patent) => patent.reviewWorkflowStatus === "MAIL_READY").length,
    waitingBusinessResponse: patents.filter((patent) => patent.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE").length,
    businessResponseReceived: patents.filter((patent) => patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED").length,
    pendingFinalDecision: patents.filter(
      (patent) => patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED" && patent.legalActionResult === null,
    ).length,
    legalActionCompleted: patents.filter((patent) => patent.legalActionResult !== null).length,
  };
}

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-BUS-01
 * @description 사업부 대시보드 KPI 요약을 백엔드에서 조회한다.
 */
export async function getBusinessDashboardSummary(): Promise<BusinessDashboardSummary> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessDashboardSummary>>("/business/dashboard/summary");
    return response.data ?? createEmptyBusinessDashboardSummary();
  }

  return {
    totalAssigned: patents.length,
    pendingReview: patents.filter((patent) => patent.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE").length,
    reviewed: patents.filter((patent) =>
      patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED" ||
      patent.legalActionResult !== null,
    ).length,
    maintained: patents.filter((patent) => patent.businessOpinionDecision === "MAINTAIN").length,
    abandoned: patents.filter((patent) => patent.businessOpinionDecision === "ABANDON").length,
  };
}

function createEmptyLegalDashboardSummary(): LegalDashboardSummary {
  return {
    totalPatents: 0,
    quarterlyTargetCount: 0,
    pendingReview: 0,
    waitingBusinessResponse: 0,
    businessResponseReceived: 0,
    pendingFinalDecision: 0,
    legalActionCompleted: 0,
  };
}

function createEmptyBusinessDashboardSummary(): BusinessDashboardSummary {
  return {
    totalAssigned: 0,
    pendingReview: 0,
    reviewed: 0,
    maintained: 0,
    abandoned: 0,
  };
}
