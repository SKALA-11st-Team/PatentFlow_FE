import { isBackendApiEnabled, requestJson, toQueryString, type ApiEnvelope } from "./client";
import { patents } from "../mocks/patents.mock";
import type { PatentListItem } from "../types/patent";
import type { PatentListQuery } from "./patents";

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

// DASH-F3: 영역(사업/기술/제품) 분포의 한 그룹. color/share/정렬은 표시 시점에 FE에서 계산한다.
export interface AreaGroup {
  value: string;
  count: number;
  relatedLabels: string[];
}

export interface AreaDistribution {
  totalCount: number;
  businessArea: AreaGroup[];
  technologyArea: AreaGroup[];
  product: AreaGroup[];
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
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01
 * @description DASH-F3: 관리자 대시보드 영역별(사업/기술/제품) 분포를 서버 집계로 조회한다. mock 모드에서는
 *     동일 규칙으로 클라이언트 집계한다. review-targets 와 같은 필터를 전달해 분포 카드와 목록을 정합시킨다.
 */
export async function getAreaDistribution(query: PatentListQuery = {}): Promise<AreaDistribution> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<AreaDistribution>>(
      `/legal/dashboard/area-distribution${toQueryString({
        reviewWorkflowStatus: query.reviewWorkflowStatus,
      })}`,
    );
    return response.data ?? createEmptyAreaDistribution();
  }

  return computeAreaDistribution(patents);
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

function createEmptyAreaDistribution(): AreaDistribution {
  return { totalCount: 0, businessArea: [], technologyArea: [], product: [] };
}

// mock 모드용 클라이언트 집계 — BE DashboardSummaryService.getAreaDistribution 과 동일 규칙(보조 라벨 매핑·정규화).
function computeAreaDistribution(patentList: PatentListItem[]): AreaDistribution {
  return {
    totalCount: patentList.length,
    businessArea: groupArea(patentList, (patent) => patent.businessArea, (patent) => patent.departmentName),
    technologyArea: groupArea(patentList, (patent) => patent.technologyArea, (patent) => patent.businessArea),
    product: groupArea(patentList, (patent) => patent.productName, (patent) => patent.technologyArea),
  };
}

function groupArea(
  patentList: PatentListItem[],
  primary: (patent: PatentListItem) => string,
  secondary: (patent: PatentListItem) => string,
): AreaGroup[] {
  const groups = new Map<string, AreaGroup>();

  patentList.forEach((patent) => {
    const value = normalizeAreaValue(primary(patent));
    const relatedLabel = normalizeAreaValue(secondary(patent));
    const group = groups.get(value) ?? { value, count: 0, relatedLabels: [] };

    group.count += 1;
    if (!group.relatedLabels.includes(relatedLabel)) {
      group.relatedLabels.push(relatedLabel);
    }

    groups.set(value, group);
  });

  return Array.from(groups.values());
}

// FE/BE 공통: 공백·"N/A"는 "미분류" 버킷으로 정규화한다(BusinessAreaReviewCards.getDisplayValue 와 동일).
function normalizeAreaValue(value: string): string {
  const normalized = value.trim();
  return normalized && normalized !== "N/A" ? normalized : "미분류";
}
