import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import {
  createMockUser,
  deleteMockUser,
  getMockUsers,
  resetMockUserPassword,
  updateMockUser,
} from "../mocks/users.mock";

export interface UserItem {
  id: string;
  email: string;        // 로그인 ID
  username: string;     // 실제 이름
  role: "ADMIN" | "BUSINESS";
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;        // 로그인 ID — 이메일 형식 필수
  role: "ADMIN" | "BUSINESS";
  departmentId: string | null;
  departmentName: string | null;
  username: string;     // 실제 이름
}

export type UpdateUserRequest = CreateUserRequest;

export interface ResetPasswordResult {
  userId: string;
  email: string;          // 임시 비밀번호를 발송한 수신 이메일 = 로그인 ID (구 username 필드)
  temporaryPassword: string;
}

export async function getUsers(): Promise<UserItem[]> {
  if (!isBackendApiEnabled()) return getMockUsers();
  const res = await requestJson<ApiEnvelope<UserItem[]>>("/admin/users");
  return res.data ?? [];
}

export async function createUser(request: CreateUserRequest): Promise<UserItem> {
  if (!isBackendApiEnabled()) return createMockUser(request);
  const res = await requestJson<ApiEnvelope<UserItem>>("/admin/users", {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (!res.data) throw new Error("계정 생성 응답이 비어 있습니다.");
  return res.data;
}

export async function deleteUser(userId: string): Promise<void> {
  if (!isBackendApiEnabled()) return deleteMockUser(userId);
  await requestJson<ApiEnvelope<null>>(`/admin/users/${userId}`, { method: "DELETE" });
}

/**
 * @relatedFR FR-COM-01, FR-LEGAL-16
 * @relatedUI UI-LEGAL-08
 * @description 관리자 설정 화면에서 사용자 계정 정보를 수정한다.
 */
export async function updateUser(userId: string, request: UpdateUserRequest): Promise<UserItem> {
  if (!isBackendApiEnabled()) return updateMockUser(userId, request);
  const res = await requestJson<ApiEnvelope<UserItem>>(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
  if (!res.data) throw new Error("계정 수정 응답이 비어 있습니다.");
  return res.data;
}

export async function resetUserPassword(userId: string): Promise<ResetPasswordResult> {
  if (!isBackendApiEnabled()) return resetMockUserPassword(userId);
  const res = await requestJson<ApiEnvelope<ResetPasswordResult>>(
    `/admin/users/${userId}/reset-password`,
    { method: "POST" },
  );
  if (!res.data) throw new Error("비밀번호 초기화 응답이 비어 있습니다.");
  return res.data;
}
