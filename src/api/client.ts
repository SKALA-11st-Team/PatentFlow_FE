import { clearAuthSession, getStoredAccessToken, updateAccessToken } from "./authStorage";

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
  return requestJsonInternal<T>(path, init, true, true);
}

/**
 * @relatedFR FR-LEGAL-13
 * @description MAIL-13: 인증이 필요한 바이너리(특허 PDF 등) 다운로드 — requestJson과 동일한
 * 토큰/401 갱신 처리를 거쳐 Blob을 돌려준다.
 */
export async function requestBlob(path: string, allowRefresh = true): Promise<Blob> {
  const headers = new Headers();
  const accessToken = getStoredAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", headers });

  if (response.status === 401 && allowRefresh) {
    try {
      await refreshAccessTokenOnce();
    } catch (refreshError) {
      clearAuthSession();
      redirectToLogin();
      throw refreshError;
    }
    return requestBlob(path, false);
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, response.statusText, await parseErrorEnvelope(response));
  }

  return response.blob();
}

async function requestJsonInternal<T>(
  path: string,
  init: RequestInit,
  allowRefresh: boolean,
  allowCsrfRetry = false,
): Promise<T> {
  const method = init.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // MAIL-13: FormData 업로드는 브라우저가 multipart boundary를 포함한 Content-Type을
  // 자동 생성해야 하므로 강제 설정하지 않는다(설정하면 boundary 누락으로 업로드가 깨진다).
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
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
    return requestJsonInternal<T>(path, init, false, allowCsrfRetry);
  }

  // BE-14: CSRF 토큰이 stale하면 BE가 403 CSRF_TOKEN_INVALID로 응답한다.
  // /auth/csrf로 신선한 XSRF-TOKEN 쿠키를 받아 정확히 1회만 재시도한다(쿠키는 위에서 매번 재독).
  // 권한 부족 등 다른 403은 재시도하지 않는다.
  if (response.status === 403 && allowCsrfRetry && !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    const errorEnvelope = await parseErrorEnvelope(response);
    if (errorEnvelope?.code === "CSRF_TOKEN_INVALID") {
      await primeCsrfTokenOnce();
      return requestJsonInternal<T>(path, init, allowRefresh, false);
    }
    throw new ApiRequestError(response.status, response.statusText, errorEnvelope);
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
    inFlightRefresh = requestJsonInternal<ApiEnvelope<{ accessToken?: string | null }>>(
      "/auth/refresh",
      { method: "POST" },
      false,
    )
      .then((response) => {
        // API-04: 새 accessToken을 메모리에 반영한다 — 버리면 재시도가 만료 토큰 헤더로 나가
        // BE의 쿠키 fallback에만 의존하게 된다(쿠키 차단 환경에서 무한 401).
        const nextAccessToken = response.data?.accessToken;
        if (nextAccessToken) {
          updateAccessToken(nextAccessToken);
        }
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

// BE-14: 동시 다발 CSRF 재발급도 refresh처럼 single-flight로 직렬화한다.
let inFlightCsrfPrime: Promise<void> | null = null;

function primeCsrfTokenOnce(): Promise<void> {
  if (!inFlightCsrfPrime) {
    inFlightCsrfPrime = fetch(`${API_BASE_URL}/auth/csrf`, { credentials: "include" })
      .then(() => undefined)
      // 프라이밍 실패는 삼킨다 — 이어지는 재시도가 실제 실패를 드러낸다.
      .catch(() => undefined)
      .finally(() => {
        inFlightCsrfPrime = null;
      });
  }
  return inFlightCsrfPrime;
}

function redirectToLogin() {
  // API-04: 세션 만료 시 로그인으로 보내되, window.location.assign 같은 강제 풀 리로드는 SPA 라우팅을
  // 깨고 ProtectedRoute의 <Navigate>와 경쟁한다. history.pushState + popstate로 React Router에 위임해
  // 인메모리 상태를 유지한 채 SPA 내비게이션으로 처리한다.
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
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
    // BE GlobalExceptionHandler는 @Valid 위반 시 message에 고정 문구('요청 값을 확인해주세요.')만 담고
    // 실제 필드별 사유는 details 맵에 넣는다. INVALID_REQUEST면 details를 풀어 사용자에게 노출한다.
    if (error.code === "INVALID_REQUEST" && error.details) {
      const fieldMessages = Object.values(error.details)
        .filter((value): value is string => typeof value === "string" && value.length > 0);
      if (fieldMessages.length > 0) {
        return fieldMessages.join("\n");
      }
    }
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
