import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";

export interface Department {
  departmentId: string;
  departmentName: string;
  managerEmail?: string;
  managerName?: string;
  ccEmails?: string[];
  updatedAt?: string;
}

export async function getDepartments(): Promise<Department[]> {
  if (!isBackendApiEnabled()) {
    return MOCK_DEPARTMENTS;
  }
  const res = await requestJson<ApiEnvelope<Department[]>>("/departments");
  return res.data ?? [];
}

const MOCK_DEPARTMENTS: Department[] = [
  { departmentId: "DEPT-RND", departmentName: "R&D본부" },
  { departmentId: "DEPT-PLATFORM", departmentName: "플랫폼사업부" },
  { departmentId: "DEPT-ESG", departmentName: "ESG사업부" },
  { departmentId: "DEPT-ICT", departmentName: "ICT사업부" },
  { departmentId: "DEPT-MFG", departmentName: "제조사업부" },
  { departmentId: "DEPT-BIZ", departmentName: "사업기획팀" },
];

export async function createDepartment(departmentId: string, departmentName: string): Promise<Department> {
  if (!isBackendApiEnabled()) {
    throw new Error("백엔드 API가 비활성화되어 있습니다.");
  }
  const res = await requestJson<ApiEnvelope<Department>>("/admin/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ departmentId, departmentName }),
  });
  return res.data!;
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-16
 * @relatedUI UI-LEGAL-07
 * @description 관리자 설정 화면에서 사업부 이름을 수정한다.
 */
export async function updateDepartment(departmentId: string, departmentName: string): Promise<Department> {
  if (!isBackendApiEnabled()) {
    throw new Error("백엔드 API가 비활성화되어 있습니다.");
  }
  const res = await requestJson<ApiEnvelope<Department>>(`/admin/departments/${departmentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ departmentName }),
  });
  return res.data!;
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  if (!isBackendApiEnabled()) {
    throw new Error("백엔드 API가 비활성화되어 있습니다.");
  }
  await requestJson<ApiEnvelope<null>>(`/admin/departments/${departmentId}`, {
    method: "DELETE",
  });
}
