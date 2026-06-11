import type { UserRole } from "../types/patent";

const USER_STORAGE_KEY = "patentflow.user";

// 보안(SEC-01): accessToken은 localStorage에 보관하지 않고 파일 레벨 메모리에만 둔다.
// 새로고침 시 메모리 토큰은 사라지며, httpOnly refresh 쿠키 기반 /auth/refresh 로 재발급한다.
let accessTokenInMemory: string | null = null;

export interface AuthUser {
  departmentId: string | null;
  departmentName: string | null;
  email: string;       // 로그인 ID
  username: string;    // 실제 이름 (예: 이소율)
  role: UserRole;
  roles?: string[];
  userId: string;
}

export function getStoredAccessToken() {
  return accessTokenInMemory;
}

export function hasStoredAuthSession() {
  return getStoredAuthUser() !== null;
}

export function getStoredAuthUser(): AuthUser | null {
  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function storeAuthSession(user: AuthUser, accessToken?: string | null) {
  // accessToken을 생략(undefined)하면 user 정보만 갱신 — 메모리 토큰은 건드리지 않는다
  if (accessToken === undefined) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  // null이면 메모리 토큰 삭제(로그아웃 후 user만 남기는 시나리오 대비), 값이 있으면 교체
  accessTokenInMemory = accessToken ? accessToken : null;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

// API-04: /auth/refresh 성공 시 새 accessToken을 메모리에 반영한다. 과거에는 refresh 응답을
// 버려 메모리 토큰이 만료된 채 남았고, BE의 쿠키 fallback 덕에 우연히 동작하는 구조였다.
export function updateAccessToken(accessToken: string | null) {
  accessTokenInMemory = accessToken;
}

export function clearAuthSession() {
  accessTokenInMemory = null;
  window.localStorage.removeItem(USER_STORAGE_KEY);
}
