import type { UserRole } from "../types/patent";

const ACCESS_TOKEN_STORAGE_KEY = "patentflow.accessToken";
const USER_STORAGE_KEY = "patentflow.user";

export interface AuthUser {
  departmentId: string | null;
  departmentName: string | null;
  displayName?: string;
  email: string;
  name: string;
  role: UserRole;
  roles?: string[];
  userId: string;
  username?: string;
}

export function getStoredAccessToken() {
  return null;
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

export function storeAuthSession(user: AuthUser) {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}
