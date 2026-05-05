const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const API_BASE_URL = (importMetaEnv?.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
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

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description VITE_API_BASE_URL 설정 여부로 실제 백엔드 API 사용 가능 상태를 확인한다.
 */
export function isBackendApiEnabled() {
  return API_BASE_URL.length > 0;
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description Spring Boot API 연동 시 공통 JSON 요청과 에러 처리를 담당한다.
 */
export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
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
