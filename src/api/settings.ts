import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { businessChecklistItems as mockChecklistSeed } from "../mocks/businessChecklist.mock";
import type { BusinessChecklistItem } from "../types/businessChecklist";

export interface QuarterSetting {
  quarterKey: string;
  year: number;
  quarterNumber: number;
  quarterLabel: string;
  startDate: string | null;
  endDate: string | null;
  activated: boolean;
  activatedAt: string | null;
  ended: boolean;
  endedAt: string | null;
  targetPatentCount: number;
  submissionDeadline: string | null;
  businessResponseDueDate: string | null;
  mailLeadMonths: number;
  scheduledMailSendDate: string | null;
}

export interface QuarterActivateResult {
  quarterKey: string;
  reviewStartedCount: number;
  autoCompletedCount: number;
  reviewStartedPatentIds: string[];
  autoCompletedPatentIds: string[];
}

export async function getReviewQuarters(year?: number): Promise<QuarterSetting[]> {
  if (!isBackendApiEnabled()) return [];
  const query = year ? `?year=${year}` : "";
  const response = await requestJson<ApiEnvelope<QuarterSetting[]>>(
    `/settings/review-quarters${query}`,
  );
  return response.data ?? [];
}

// 연도 무관 분기 경계(월/일) 템플릿 — BE의 ReviewPeriodTemplateEntity와 1:1 대응.
// 연도별로 분기 레코드를 미리 시드하지 않아도 임의 연도의 분기 날짜를 계산할 수 있다.
export interface ReviewPeriodTemplate {
  periodNumber: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  label: string;
}

export async function getReviewPeriodTemplates(): Promise<ReviewPeriodTemplate[]> {
  if (!isBackendApiEnabled()) return [];
  const response = await requestJson<ApiEnvelope<ReviewPeriodTemplate[]>>("/settings/review-periods");
  return response.data ?? [];
}

// 기본값 2 = BE DEFAULT_MAIL_LEAD_MONTHS와 동일 — 백엔드 미연결 시 UI가 같은 기준으로 렌더링
export async function getMailLeadMonths(): Promise<number> {
  if (!isBackendApiEnabled()) return 2;
  const response = await requestJson<ApiEnvelope<{ mailLeadMonths: number }>>("/settings/mail-lead-months");
  return response.data?.mailLeadMonths ?? 2;
}

export async function updateMailLeadMonths(months: number): Promise<number> {
  const response = await requestJson<ApiEnvelope<{ mailLeadMonths: number }>>(
    "/settings/mail-lead-months",
    { method: "PATCH", body: JSON.stringify({ mailLeadMonths: months }) },
  );
  return response.data?.mailLeadMonths ?? months;
}

// 회신 기한 = 분기 활성화일 + months개월 + days일
// 기본값 { months: 1, days: 0 } = BE DEFAULT_RESPONSE_DEADLINE_MONTHS/DAYS와 동일
export interface ResponseDeadline {
  months: number;
  days: number;
}

export async function getResponseDeadline(): Promise<ResponseDeadline> {
  if (!isBackendApiEnabled()) return { months: 1, days: 0 };
  const response = await requestJson<ApiEnvelope<ResponseDeadline>>("/settings/response-deadline");
  return response.data ?? { months: 1, days: 0 };
}

export async function updateResponseDeadline(months: number, days: number): Promise<ResponseDeadline> {
  const response = await requestJson<ApiEnvelope<ResponseDeadline>>(
    "/settings/response-deadline",
    { method: "PATCH", body: JSON.stringify({ months, days }) },
  );
  return response.data ?? { months, days };
}

// ── AI 가치평가 기준 (UI-008) ─────────────────────────────────

export interface ValuationCriteriaConfig {
  version: number;
  axisWeights: Record<string, number>;
  gradeCutoffs: Record<string, number>;
  maintainThreshold: number;
  subscoreWeights: Record<string, Record<string, number>>;
}

export interface ValuationCriteria {
  config: ValuationCriteriaConfig;
  isDefault: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ValuationCriteriaVersion {
  version: number;
  createdBy: string | null;
  createdAt: string;
  config: ValuationCriteriaConfig;
}

export type ValuationCriteriaPayload = Omit<ValuationCriteriaConfig, "version">;

// agent 기본값(schemas/valuation.py DEFAULT_*)과 동일 — mock 모드 및 '기본값 복원' 표시용.
export const DEFAULT_VALUATION_CRITERIA: ValuationCriteria = {
  config: {
    version: 0,
    axisWeights: { legal: 25, technology: 25, market: 25, business_fit: 25 },
    gradeCutoffs: { A: 80, B: 60, C: 40 },
    maintainThreshold: 60,
    subscoreWeights: {
      legal: { right_stability: 35, claim_protection: 40, portfolio_defensive_value: 25 },
      business_fit: { official_business_evidence: 30, product_function_direct_match: 45, business_context_fit: 25 },
    },
  },
  isDefault: true,
  updatedBy: null,
  updatedAt: null,
};

// 데모(mock) 모드에서도 저장/이력이 동작하도록 인메모리로 유지한다.
let mockValuationCriteria: ValuationCriteria = structuredClone(DEFAULT_VALUATION_CRITERIA);
const mockValuationCriteriaHistory: ValuationCriteriaVersion[] = [];

export async function getValuationCriteria(): Promise<ValuationCriteria> {
  if (!isBackendApiEnabled()) return structuredClone(mockValuationCriteria);
  const response = await requestJson<ApiEnvelope<ValuationCriteria>>("/settings/valuation-criteria");
  return response.data ?? structuredClone(DEFAULT_VALUATION_CRITERIA);
}

export async function updateValuationCriteria(payload: ValuationCriteriaPayload): Promise<ValuationCriteria> {
  if (!isBackendApiEnabled()) {
    const nextVersion = mockValuationCriteria.config.version + 1;
    const updatedAt = new Date().toISOString();
    mockValuationCriteria = {
      config: { ...structuredClone(payload), version: nextVersion },
      isDefault: false,
      updatedBy: "데모 관리자",
      updatedAt,
    };
    mockValuationCriteriaHistory.unshift({
      version: nextVersion,
      createdBy: "데모 관리자",
      createdAt: updatedAt,
      config: structuredClone(mockValuationCriteria.config),
    });
    return structuredClone(mockValuationCriteria);
  }
  const response = await requestJson<ApiEnvelope<ValuationCriteria>>("/settings/valuation-criteria", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data ?? structuredClone(DEFAULT_VALUATION_CRITERIA);
}

export async function getValuationCriteriaHistory(): Promise<ValuationCriteriaVersion[]> {
  if (!isBackendApiEnabled()) return structuredClone(mockValuationCriteriaHistory);
  const response = await requestJson<ApiEnvelope<ValuationCriteriaVersion[]>>("/settings/valuation-criteria/history");
  return response.data ?? [];
}


export interface ValuationPrompt {
  axis: string;
  label: string;
  path: string;
  markdown: string;
  checksum: string;
  updatedAt: string | null;
}

export interface ValuationPromptPayload {
  markdown: string;
  reason?: string;
  expectedChecksum?: string;
}

const DEFAULT_VALUATION_PROMPTS: ValuationPrompt[] = [
  {
    axis: "legal",
    label: "권리성",
    path: "prompts/valuation/valuation_legal.md",
    markdown: "# Valuation Legal Axis Prompt\n\n권리성 축의 세부 평가 기준 md입니다.",
    checksum: "mock-legal",
    updatedAt: null,
  },
  {
    axis: "technology",
    label: "기술성",
    path: "prompts/valuation/valuation_technology.md",
    markdown: "# Valuation Technology Axis Prompt\n\n기술성 축의 세부 평가 기준 md입니다.",
    checksum: "mock-technology",
    updatedAt: null,
  },
  {
    axis: "market",
    label: "시장성",
    path: "prompts/valuation/valuation_market.md",
    markdown: "# Valuation Market Axis Prompt\n\n시장성 축의 세부 평가 기준 md입니다.",
    checksum: "mock-market",
    updatedAt: null,
  },
  {
    axis: "business_fit",
    label: "사업 연계성",
    path: "prompts/valuation/valuation_business_fit.md",
    markdown: "# Valuation Business Fit Axis Prompt\n\n사업 연계성 축의 세부 평가 기준 md입니다.",
    checksum: "mock-business-fit",
    updatedAt: null,
  },
];

let mockValuationPrompts = structuredClone(DEFAULT_VALUATION_PROMPTS);

export async function getValuationPrompts(): Promise<ValuationPrompt[]> {
  if (!isBackendApiEnabled()) return structuredClone(mockValuationPrompts);
  const response = await requestJson<ApiEnvelope<ValuationPrompt[]>>("/settings/valuation-criteria/prompts");
  return response.data ?? [];
}

export async function getValuationPrompt(axis: string): Promise<ValuationPrompt> {
  if (!isBackendApiEnabled()) {
    return structuredClone(mockValuationPrompts.find((item) => item.axis === axis) ?? mockValuationPrompts[0]);
  }
  const response = await requestJson<ApiEnvelope<ValuationPrompt>>(
    `/settings/valuation-criteria/prompts/${encodeURIComponent(axis)}`,
  );
  return response.data as ValuationPrompt;
}

export async function updateValuationPrompt(axis: string, payload: ValuationPromptPayload): Promise<ValuationPrompt> {
  if (!isBackendApiEnabled()) {
    const updated: ValuationPrompt = {
      ...(mockValuationPrompts.find((item) => item.axis === axis) ?? mockValuationPrompts[0]),
      markdown: payload.markdown,
      checksum: `mock-${axis}-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    mockValuationPrompts = mockValuationPrompts.map((item) => (item.axis === axis ? updated : item));
    return structuredClone(updated);
  }
  const response = await requestJson<ApiEnvelope<ValuationPrompt>>(
    `/settings/valuation-criteria/prompts/${encodeURIComponent(axis)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return response.data as ValuationPrompt;
}

// ── 사업부 체크리스트 항목 관리 (리걸팀) ─────────────────────

export interface BusinessChecklistItemPayload {
  category: string;
  title: string;
  description: string;
  score4Label: string;
  score3Label: string;
  score2Label: string;
  score1Label: string;
}

// 데모(mock) 모드에서도 편집이 동작하도록 인메모리 사본을 유지한다.
let mockChecklistItems: BusinessChecklistItem[] = structuredClone(mockChecklistSeed);

function payloadToItem(id: string, payload: BusinessChecklistItemPayload): BusinessChecklistItem {
  return {
    id,
    category: payload.category,
    title: payload.title,
    description: payload.description,
    options: [
      { score: 4, label: payload.score4Label },
      { score: 3, label: payload.score3Label },
      { score: 2, label: payload.score2Label },
      { score: 1, label: payload.score1Label },
    ],
  };
}

export async function getAdminChecklistItems(): Promise<BusinessChecklistItem[]> {
  if (!isBackendApiEnabled()) return structuredClone(mockChecklistItems);
  const response = await requestJson<ApiEnvelope<BusinessChecklistItem[]>>("/settings/business-checklist-items");
  return response.data ?? [];
}

export async function createChecklistItem(payload: BusinessChecklistItemPayload): Promise<BusinessChecklistItem> {
  if (!isBackendApiEnabled()) {
    const item = payloadToItem(`CHK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, payload);
    mockChecklistItems.push(item);
    return structuredClone(item);
  }
  const response = await requestJson<ApiEnvelope<BusinessChecklistItem>>("/settings/business-checklist-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data as BusinessChecklistItem;
}

export async function updateChecklistItem(
  itemId: string,
  payload: BusinessChecklistItemPayload,
): Promise<BusinessChecklistItem> {
  if (!isBackendApiEnabled()) {
    const item = payloadToItem(itemId, payload);
    mockChecklistItems = mockChecklistItems.map((current) => (current.id === itemId ? item : current));
    return structuredClone(item);
  }
  const response = await requestJson<ApiEnvelope<BusinessChecklistItem>>(
    `/settings/business-checklist-items/${itemId}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return response.data as BusinessChecklistItem;
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  if (!isBackendApiEnabled()) {
    if (mockChecklistItems.length <= 1) {
      throw new Error("체크리스트 항목은 최소 1개가 있어야 합니다.");
    }
    mockChecklistItems = mockChecklistItems.filter((current) => current.id !== itemId);
    return;
  }
  await requestJson<ApiEnvelope<void>>(`/settings/business-checklist-items/${itemId}`, { method: "DELETE" });
}

export interface MailOAuth2Status {
  connected: boolean;
  connectedEmail: string | null;
}

export async function getMailOAuth2Status(): Promise<MailOAuth2Status> {
  if (!isBackendApiEnabled()) return { connected: false, connectedEmail: null };
  const response = await requestJson<ApiEnvelope<MailOAuth2Status>>("/admin/settings/mail/oauth2/google/status");
  return response.data ?? { connected: false, connectedEmail: null };
}

export async function disconnectMailOAuth2(): Promise<void> {
  await requestJson<ApiEnvelope<MailOAuth2Status>>(
    "/admin/settings/mail/oauth2/google",
    { method: "DELETE" },
  );
}

export async function redirectToGoogleOAuth2(): Promise<void> {
  const response = await requestJson<ApiEnvelope<string>>("/admin/settings/mail/oauth2/google/authorize-url");
  const url = response.data;
  if (url) window.location.href = url;
}

export async function getActiveQuarter(): Promise<QuarterSetting | null> {
  if (!isBackendApiEnabled()) return null;
  const response = await requestJson<ApiEnvelope<QuarterSetting>>(
    "/settings/review-quarters/active",
  );
  return response.data ?? null;
}

export async function activateReviewQuarter(quarterKey: string): Promise<QuarterActivateResult> {
  const response = await requestJson<ApiEnvelope<QuarterActivateResult>>(
    `/settings/review-quarters/${quarterKey}/activate`,
    { method: "POST" },
  );
  return response.data!;
}

export interface CountryExtension {
  country: string;
  label: string;
  extensionMonths: number;
  // SETTINGS-11(항목8): 유지 결정 회차별 연장 기간(1회차부터). 회차 설정이 없으면 단일값 1개.
  extensionMonthsByRound: number[];
}

export async function getCountryExtensions(): Promise<CountryExtension[]> {
  if (!isBackendApiEnabled()) return [];
  const response = await requestJson<ApiEnvelope<CountryExtension[]>>("/settings/country-extensions");
  return response.data ?? [];
}

export async function updateCountryExtension(
  country: string,
  extensionMonthsByRound: number[],
): Promise<CountryExtension> {
  const response = await requestJson<ApiEnvelope<CountryExtension>>(
    `/settings/country-extensions/${country}`,
    {
      method: "PUT",
      body: JSON.stringify({ extensionMonths: extensionMonthsByRound[0] ?? 12, extensionMonthsByRound }),
    },
  );
  return response.data!;
}

export interface AnnualFeeAdjustmentHistory {
  adjustmentId: string;
  previousDueDate: string | null;
  adjustedDueDate: string;
  reason: string | null;
  adjustedBy: string | null;
  adjustedAt: string;
}

export interface AnnualFeeScheduleItem {
  patentId: string;
  managementNumber: string;
  title: string;
  country: string;
  domesticPatent: boolean;
  applicationDate: string | null;
  registrationDate: string | null;
  expectedExpirationDate: string | null;
  annualFeeBaseDate: string | null;
  // FEE-06: 납부일 의미 분리 — calculated(국가 규칙 재계산) / stored(저장값, 과거일 수 있음) /
  // effective(과거면 미래로 굴린 실효 납부일). nextAnnualFeeDueDate는 effective와 동일(하위호환).
  calculatedAnnualFeeDueDate: string | null;
  storedAnnualFeeDueDate: string | null;
  effectiveAnnualFeeDueDate: string | null;
  nextAnnualFeeDueDate: string | null;
  adjustedAnnualFeeDueDate: string | null;
  latestAdjustmentReason: string | null;
  countryExtensionMonths: number;
  annualFeeBasis: "APPLICATION_DATE" | "REGISTRATION_DATE" | string;
  paymentRuleLabel: string | null;
  adjustmentHistory: AnnualFeeAdjustmentHistory[];
}

export async function getAnnualFeeSchedule(country = "ALL"): Promise<AnnualFeeScheduleItem[]> {
  if (!isBackendApiEnabled()) return [];
  const query = country && country !== "ALL" ? `?country=${encodeURIComponent(country)}` : "";
  const response = await requestJson<ApiEnvelope<AnnualFeeScheduleItem[]>>(`/annual-fees/schedule${query}`);
  return response.data ?? [];
}

export async function adjustAnnualFeeSchedule(
  patentId: string,
  adjustedDueDate: string,
  reason: string,
): Promise<AnnualFeeScheduleItem> {
  const response = await requestJson<ApiEnvelope<AnnualFeeScheduleItem>>(
    `/annual-fees/schedule/${encodeURIComponent(patentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ adjustedDueDate, reason, adjustedBy: "관리자" }),
    },
  );
  return response.data!;
}

export type ClassificationType = "BUSINESS" | "TECHNOLOGY";

export interface ClassificationGroup {
  type: ClassificationType;
  values: string[];
}

const fallbackClassifications: ClassificationGroup[] = [
  {
    type: "BUSINESS",
    values: ["AI", "Data", "Blockchain", "Cloud", "ESG", "제조", "통신", "금융/전략", "통합서비스", "기존 사업"],
  },
  {
    type: "TECHNOLOGY",
    values: ["데이터분석", "AB Testing", "Blockchain", "Cloud", "시스템 운영", "장애관리", "인증", "보안", "Network"],
  },
];

export async function getClassifications(): Promise<ClassificationGroup[]> {
  if (!isBackendApiEnabled()) return fallbackClassifications;
  const response = await requestJson<ApiEnvelope<ClassificationGroup[]>>("/settings/classifications");
  return response.data ?? fallbackClassifications;
}

export async function addClassification(type: ClassificationType, value: string): Promise<ClassificationGroup> {
  if (!isBackendApiEnabled()) return updateFallbackClassification(type, value);
  const response = await requestJson<ApiEnvelope<ClassificationGroup>>(`/settings/classifications/${type}`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
  return response.data!;
}

export async function renameClassification(
  type: ClassificationType,
  currentValue: string,
  nextValue: string,
): Promise<ClassificationGroup> {
  if (!isBackendApiEnabled()) return updateFallbackClassification(type, nextValue, currentValue);
  const response = await requestJson<ApiEnvelope<ClassificationGroup>>(
    `/settings/classifications/${type}/${encodeURIComponent(currentValue)}`,
    {
      method: "PUT",
      body: JSON.stringify({ value: nextValue }),
    },
  );
  return response.data!;
}

export async function deleteClassification(type: ClassificationType, value: string): Promise<ClassificationGroup> {
  if (!isBackendApiEnabled()) {
    const group = fallbackClassifications.find((item) => item.type === type)!;
    return { ...group, values: group.values.filter((item) => item !== value) };
  }
  const response = await requestJson<ApiEnvelope<ClassificationGroup>>(
    `/settings/classifications/${type}/${encodeURIComponent(value)}`,
    { method: "DELETE" },
  );
  return response.data!;
}

function updateFallbackClassification(type: ClassificationType, nextValue: string, currentValue?: string) {
  const group = fallbackClassifications.find((item) => item.type === type)!;
  const values = group.values.filter((item) => item !== currentValue);
  if (!values.includes(nextValue)) values.push(nextValue);
  return { ...group, values: values.sort((a, b) => a.localeCompare(b, "ko")) };
}


/**
 * @relatedFR FR-LEGAL-24
 * @description I4: 국가별 연차료 규칙(기산일·일괄 연차·납부 주기) 조회/수정 — fee.rule 오버라이드.
 */
export interface FeeRule {
  country: string;
  countryLabel: string;
  basis: "APPLICATION_DATE" | "REGISTRATION_DATE";
  initialLumpYears: number;
  cycleMonths: number;
  ruleLabel: string;
}

export async function getFeeRules(): Promise<FeeRule[]> {
  if (!isBackendApiEnabled()) {
    return [];
  }
  const response = await requestJson<ApiEnvelope<FeeRule[]>>("/settings/fee-rules");
  return response.data ?? [];
}

export async function updateFeeRule(
  country: string,
  payload: { basis?: FeeRule["basis"]; initialLumpYears?: number; cycleMonths?: number },
): Promise<FeeRule | undefined> {
  const response = await requestJson<ApiEnvelope<FeeRule>>(`/settings/fee-rules/${country}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.data ?? undefined;
}
