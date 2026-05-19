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

export async function resetUserPassword(userId: string): Promise<ResetPasswordResult> {
  const res = await requestJson<ApiEnvelope<ResetPasswordResult>>(
    `/admin/users/${userId}/reset-password`,
    { method: "POST" },
  );
  if (!res.data) throw new Error("비밀번호 초기화 응답이 비어 있습니다.");
  return res.data;
}
