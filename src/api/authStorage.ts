import type { UserRole } from "../types/patent";

const ACCESS_TOKEN_STORAGE_KEY = "patentflow.accessToken";
const USER_STORAGE_KEY = "patentflow.user";

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
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
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
  // accessToken을 생략(undefined)하면 user 정보만 갱신 — 토큰은 건드리지 않는다
  if (accessToken === undefined) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  // null이면 토큰 삭제(로그아웃 후 user만 남기는 시나리오 대비), 값이 있으면 교체
  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}
