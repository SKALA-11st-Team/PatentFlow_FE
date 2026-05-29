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

export async function updateReviewSchedule(
  year: number,
  mailLeadMonths: number,
  businessResponseDueDate: string | null,
): Promise<QuarterSetting[]> {
  const response = await requestJson<ApiEnvelope<QuarterSetting[]>>(
    "/settings/review-schedule",
    {
      method: "PATCH",
      body: JSON.stringify({ year, mailLeadMonths, businessResponseDueDate }),
    },
  );
  return response.data ?? [];
}

export async function getActiveQuarter(): Promise<QuarterSetting | null> {
  if (!isBackendApiEnabled()) return null;
  const response = await requestJson<ApiEnvelope<QuarterSetting>>(
    "/settings/review-quarters/active",
  );
  return response.data ?? null;
}

export async function endReviewQuarter(quarterKey: string): Promise<QuarterSetting> {
  const response = await requestJson<ApiEnvelope<QuarterSetting>>(
    `/settings/review-quarters/${quarterKey}/end`,
    { method: "POST" },
  );
  return response.data!;
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
