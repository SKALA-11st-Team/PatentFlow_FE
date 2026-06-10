import { clearAuthSession, getStoredAccessToken } from "./authStorage";

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

export function isMockApiEnabled() {
  return USE_MOCK_API;
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
  const method = init.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = getStoredAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // CSRF protection: add X-XSRF-TOKEN header for state-changing requests
  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    const xsrfToken = getCookie("XSRF-TOKEN");
    if (xsrfToken) {
      headers.set("X-XSRF-TOKEN", xsrfToken);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && allowRefresh && path !== "/auth/login" && path !== "/auth/refresh") {
    try {
      await refreshAccessTokenOnce();
    } catch (refreshError) {
      // API-04: refresh마저 실패하면 세션이 만료된 것 — 강제 로그아웃 후 로그인 화면으로 이동
      clearAuthSession();
      redirectToLogin();
      throw refreshError;
    }
    return requestJsonInternal<T>(path, init, false);
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, response.statusText, await parseErrorEnvelope(response));
  }

  return response.json() as Promise<T>;
}

// SEC-10/AUTH-05: 동시 401들이 각자 /auth/refresh를 호출하면, 회전형 리프레시 토큰(BE가 사용 즉시 폐기)에서
// 한쪽이 이미 폐기된 토큰을 보내 재사용 탐지가 발동해 양쪽이 강제 로그아웃된다. single-flight로 직렬화 —
// 진행 중 refresh가 있으면 그 프로미스를 공유하고, 끝나면 초기화한다.
let inFlightRefresh: Promise<void> | null = null;

function refreshAccessTokenOnce(): Promise<void> {
  if (!inFlightRefresh) {
    inFlightRefresh = requestJsonInternal<ApiEnvelope<unknown>>("/auth/refresh", { method: "POST" }, false)
      .then(() => undefined)
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRequestError) {
    return error.message || fallbackMessage;
  }

  if (error instanceof TypeError) {
    return "서버에 연결하지 못했습니다. 네트워크 상태 또는 BE 실행 상태를 확인해 주세요.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
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
