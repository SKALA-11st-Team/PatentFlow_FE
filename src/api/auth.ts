import { isBackendApiEnabled, isMockApiEnabled, requestJson, type ApiEnvelope } from "./client";
import { clearAuthSession, storeAuthSession, type AuthUser } from "./authStorage";

export interface LoginRequest {
  password: string;
  username: string;
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
    const mockLoginResult = createMockLoginResult(request.username);

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

  if (!response.data) {
    throw new Error("로그인 응답이 비어 있습니다.");
  }

  storeAuthSession(response.data.user, response.data.accessToken);

  return response.data;
}

export async function updateProfile(displayName: string): Promise<void> {
  if (!isBackendApiEnabled()) return;
  await requestJson<ApiEnvelope<unknown>>("/auth/me", {
    body: JSON.stringify({ displayName }),
    method: "PATCH",
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isMockApiEnabled()) {
    return null;
  }
  if (!isBackendApiEnabled()) {
    clearAuthSession();
    return null;
  }

  const response = await requestJson<ApiEnvelope<AuthUser>>("/auth/me");

  if (!response.data) {
    clearAuthSession();
    return null;
  }

  storeAuthSession(response.data);
  return response.data;
}

export function logout() {
  if (isBackendApiEnabled()) {
    requestJson("/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  clearAuthSession();
}

function createMockLoginResult(username: string): LoginResult {
  const role = username === "business" ? "BUSINESS" : "ADMIN";
  const user: AuthUser = {
    departmentId: role === "BUSINESS" ? "DEPT-RND" : null,
    departmentName: role === "BUSINESS" ? "R&D본부" : null,
    displayName: role === "BUSINESS" ? "사업부사용자" : "특허관리자",
    email: role === "BUSINESS" ? "business@syuuk.test" : "admin@syuuk.test",
    name: role === "BUSINESS" ? "사업부사용자" : "특허관리자",
    role,
    roles: [role === "BUSINESS" ? "ROLE_BUSINESS" : "ROLE_ADMIN"],
    userId: username,
    username,
  };

  return {
    accessToken: "mock-access-token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    refreshToken: null,
    tokenType: "Bearer",
    user,
  };
}
