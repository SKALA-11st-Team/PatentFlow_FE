import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";

export interface MailSettings {
  gmailUsername: string | null;
  isAppPasswordConfigured: boolean;
}

export async function getMailSettings(): Promise<MailSettings> {
  if (!isBackendApiEnabled()) return { gmailUsername: null, isAppPasswordConfigured: false };
  const response = await requestJson<ApiEnvelope<MailSettings>>("/admin/settings/mail");
  return response.data ?? { gmailUsername: null, isAppPasswordConfigured: false };
}

export async function updateMailSettings(
  gmailUsername: string,
  gmailAppPassword: string,
): Promise<MailSettings> {
  const response = await requestJson<ApiEnvelope<MailSettings>>("/admin/settings/mail", {
    method: "PUT",
    body: JSON.stringify({ gmailUsername, gmailAppPassword }),
  });
  return response.data!;
}

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

export async function updateReviewQuarter(
  quarterKey: string,
  startDate: string | null,
  endDate: string | null,
  businessResponseDueDate: string | null,
): Promise<QuarterSetting> {
  const response = await requestJson<ApiEnvelope<QuarterSetting>>(
    `/settings/review-quarters/${quarterKey}`,
    {
      body: JSON.stringify({ startDate, endDate, businessResponseDueDate, submissionDeadline: businessResponseDueDate }),
      method: "PUT",
    },
  );
  return response.data!;
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

// 현재 AdminSettingsPage의 "분기 기준" 섹션은 정적 테이블로 표시하므로 미사용.
// 분기 경계를 UI에서 직접 편집할 때 연결한다.
export async function updateReviewPeriodTemplate(
  periodNumber: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): Promise<ReviewPeriodTemplate> {
  const response = await requestJson<ApiEnvelope<ReviewPeriodTemplate>>(
    `/settings/review-periods/${periodNumber}`,
    { method: "PUT", body: JSON.stringify({ startMonth, startDay, endMonth, endDay }) },
  );
  return response.data!;
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

export async function getActiveQuarter(): Promise<QuarterSetting | null> {
  if (!isBackendApiEnabled()) return null;
  try {
    const response = await requestJson<ApiEnvelope<QuarterSetting>>(
      "/settings/review-quarters/active",
    );
    return response.data ?? null;
  } catch {
    return null;
  }
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
}

export async function getCountryExtensions(): Promise<CountryExtension[]> {
  if (!isBackendApiEnabled()) return [];
  const response = await requestJson<ApiEnvelope<CountryExtension[]>>("/settings/country-extensions");
  return response.data ?? [];
}

export async function updateCountryExtension(country: string, extensionMonths: number): Promise<CountryExtension> {
  const response = await requestJson<ApiEnvelope<CountryExtension>>(
    `/settings/country-extensions/${country}`,
    { method: "PUT", body: JSON.stringify({ extensionMonths }) },
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
  nextAnnualFeeDueDate: string | null;
  adjustedAnnualFeeDueDate: string | null;
  latestAdjustmentReason: string | null;
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
