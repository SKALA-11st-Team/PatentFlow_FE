const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const API_BASE_URL = normalizeApiBaseUrl(importMetaEnv?.VITE_API_BASE_URL ?? "");
const USE_MOCK_API = importMetaEnv?.VITE_USE_MOCK_API === "true";

export interface ApiEnvelope<T> {
  data: T | null;
  message: "OK";
  timestamp?: string;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginatedApiEnvelope<T> extends ApiEnvelope<T[]> {
  page: PageMeta;
}

export interface ErrorEnvelope {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  timestamp?: string;
}

export class ApiRequestError extends Error {
  code?: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(status: number, statusText: string, error?: ErrorEnvelope) {
    super(error?.message ?? `API request failed: ${status} ${statusText}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error?.code;
    this.details = error?.details;
  }
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description VITE_API_BASE_URL 설정 여부로 실제 백엔드 API 사용 가능 상태를 확인한다.
 */
export function isBackendApiEnabled() {
  return !USE_MOCK_API && API_BASE_URL.length > 0;
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description Spring Boot API 연동 시 공통 JSON 요청과 에러 처리를 담당한다.
 */
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestJsonInternal<T>(path, init, true);
}

async function requestJsonInternal<T>(path: string, init: RequestInit, allowRefresh: boolean): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 401 && allowRefresh && path !== "/auth/login" && path !== "/auth/refresh") {
    await requestJsonInternal<ApiEnvelope<unknown>>("/auth/refresh", { method: "POST" }, false);
    return requestJsonInternal<T>(path, init, false);
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, response.statusText, await parseErrorEnvelope(response));
  }

  return response.json() as Promise<T>;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRequestError) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}

function normalizeApiBaseUrl(value: string) {
  const trimmedValue = value.trim().replace(/\/$/, "");

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.endsWith("/api/v1") ? trimmedValue : `${trimmedValue}/api/v1`;
}

export function toQueryString(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

async function parseErrorEnvelope(response: Response) {
  try {
    return (await response.clone().json()) as ErrorEnvelope;
  } catch {
    return undefined;
  }
}
