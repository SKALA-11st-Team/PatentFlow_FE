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
  submissionDeadline: string | null,
): Promise<QuarterSetting> {
  const response = await requestJson<ApiEnvelope<QuarterSetting>>(
    `/settings/review-quarters/${quarterKey}`,
    {
      body: JSON.stringify({ startDate, endDate, submissionDeadline }),
      method: "PUT",
    },
  );
  return response.data!;
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
