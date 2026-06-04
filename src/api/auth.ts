import { isBackendApiEnabled, isMockApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { clearAuthSession, storeAuthSession, type AuthUser } from "./authStorage";

export interface LoginRequest {
  // BE /auth/login 은 email 필드를 로그인 ID로 받는다.
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  expiresAt: string;
  refreshToken?: string | null;
  tokenType: string;
  user: AuthUser;
}

export async function login(request: LoginRequest): Promise<LoginResult> {
  if (isMockApiEnabled()) {
    const mockLoginResult = createMockLoginResult(request.email);
    storeAuthSession(mockLoginResult.user, mockLoginResult.accessToken);
    return mockLoginResult;
  }

  if (!isBackendApiEnabled()) {
    throw new Error("백엔드 API 주소가 설정되어 있지 않습니다. VITE_API_BASE_URL을 확인해 주세요.");
  }

  const response = await requestJson<ApiEnvelope<LoginResult>>("/auth/login", {
    body: JSON.stringify(request),
    method: "POST",
  });

  if (!response.data) throw new Error("로그인 응답이 비어 있습니다.");
  storeAuthSession(response.data.user, response.data.accessToken);
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await requestJson<ApiEnvelope<unknown>>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateProfile(username: string): Promise<void> {
  if (!isBackendApiEnabled()) return;
  await requestJson<ApiEnvelope<unknown>>("/auth/me", {
    body: JSON.stringify({ username }),
    method: "PATCH",
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isMockApiEnabled()) return null;
  if (!isBackendApiEnabled()) {
    // 백엔드 미설정 상태에서 세션을 유지하면 잘못된 캐시 데이터가 남으므로 즉시 제거
    clearAuthSession();
    return null;
  }
  const response = await requestJson<ApiEnvelope<AuthUser>>("/auth/me");
  if (!response.data) {
    clearAuthSession();
    return null;
  }
  // accessToken 없이 user만 갱신 — 토큰은 로그인 시에만 교체, 여기서는 프로필 동기화만 수행
  storeAuthSession(response.data);
  return response.data;
}

export function logout() {
  if (isBackendApiEnabled()) {
    requestJson("/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  clearAuthSession();
}

function createMockLoginResult(loginId: string): LoginResult {
  // "business@…" 이외의 모든 ID는 ADMIN으로 처리 — 목업이므로 패턴 매칭으로 역할 결정
  const role = loginId === "business@syuuk.test" ? "BUSINESS" : "ADMIN";
  const user: AuthUser = {
    departmentId: role === "BUSINESS" ? "DEPT-RND" : null,
    departmentName: role === "BUSINESS" ? "R&D본부" : null,
    email: loginId,
    username: role === "BUSINESS" ? "사업부사용자" : "특허관리자",
    role,
    roles: [role === "BUSINESS" ? "ROLE_BUSINESS" : "ROLE_ADMIN"],
    userId: loginId,
  };
  return {
    accessToken: "mock-access-token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    refreshToken: null,
    tokenType: "Bearer",
    user,
  };
}
