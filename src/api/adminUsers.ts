import { requestJson, type ApiEnvelope } from "./client";

export interface UserItem {
  id: string;
  username: string;
  role: "ADMIN" | "BUSINESS";
  departmentId: string | null;
  departmentName: string | null;
  displayName: string;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  role: "ADMIN" | "BUSINESS";
  departmentId: string | null;
  departmentName: string | null;
  displayName: string;
}

export type UpdateUserRequest = CreateUserRequest;

export interface ResetPasswordResult {
  userId: string;
  username: string;
  temporaryPassword: string;
}

export async function getUsers(): Promise<UserItem[]> {
  const res = await requestJson<ApiEnvelope<UserItem[]>>("/admin/users");
  return res.data ?? [];
}

export async function createUser(request: CreateUserRequest): Promise<UserItem> {
  const res = await requestJson<ApiEnvelope<UserItem>>("/admin/users", {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (!res.data) throw new Error("계정 생성 응답이 비어 있습니다.");
  return res.data;
}

export async function deleteUser(userId: string): Promise<void> {
  await requestJson<ApiEnvelope<null>>(`/admin/users/${userId}`, { method: "DELETE" });
}

/**
 * @relatedFR FR-COM-01, FR-LEGAL-16
 * @relatedUI UI-LEGAL-08
 * @description 관리자 설정 화면에서 사용자 계정 정보를 수정한다.
 */
export async function updateUser(userId: string, request: UpdateUserRequest): Promise<UserItem> {
  const res = await requestJson<ApiEnvelope<UserItem>>(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
  if (!res.data) throw new Error("계정 수정 응답이 비어 있습니다.");
  return res.data;
}

export async function resetUserPassword(userId: string): Promise<ResetPasswordResult> {
  const res = await requestJson<ApiEnvelope<ResetPasswordResult>>(
    `/admin/users/${userId}/reset-password`,
    { method: "POST" },
  );
  if (!res.data) throw new Error("비밀번호 초기화 응답이 비어 있습니다.");
  return res.data;
}
