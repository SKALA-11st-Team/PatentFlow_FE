import type { CreateUserRequest, UpdateUserRequest, UserItem } from "../api/adminUsers";

// 계정 관리(UI-LEGAL-08) mock 시드.
// 사업부 계정의 userId/email/departmentId는 invitations.mock.ts와 1:1로 맞춰
// 법무 화면에서 초대/접근 상태 컬럼이 행마다 매칭되도록 한다.
// 날짜는 결정론을 위해 하드코딩한다(Date.now() 사용 금지).
let users: UserItem[] = [
  {
    id: "USER-ADMIN",
    email: "admin@syuuk.test",
    username: "특허관리자",
    role: "ADMIN",
    departmentId: null,
    departmentName: null,
    createdAt: "2026-01-02T09:00:00+09:00",
  },
  { id: "USER-AI", email: "ai.owner@syuuk.test", username: "AI 담당자", role: "BUSINESS", departmentId: "DEPT-AI", departmentName: "AI 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
  { id: "USER-CHAIN", email: "blockchain.owner@syuuk.test", username: "Blockchain 담당자", role: "BUSINESS", departmentId: "DEPT-CHAIN", departmentName: "Blockchain 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
  { id: "USER-ESG", email: "esg.owner@syuuk.test", username: "ESG 담당자", role: "BUSINESS", departmentId: "DEPT-ESG", departmentName: "ESG 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
  { id: "USER-DATA", email: "data.owner@syuuk.test", username: "Data 담당자", role: "BUSINESS", departmentId: "DEPT-DATA", departmentName: "Data 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
  { id: "USER-FIN", email: "finance.owner@syuuk.test", username: "금융/전략 담당자", role: "BUSINESS", departmentId: "DEPT-FIN", departmentName: "금융/전략 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
  { id: "USER-LEGACY", email: "legacy.owner@syuuk.test", username: "기존사업 담당자", role: "BUSINESS", departmentId: "DEPT-LEGACY", departmentName: "기존사업 담당", createdAt: "2026-02-18T09:00:00+09:00" },
  { id: "USER-SOLUTION", email: "solution.owner@syuuk.test", username: "솔루션 담당자", role: "BUSINESS", departmentId: "DEPT-SOLUTION", departmentName: "솔루션 사업부", createdAt: "2026-01-05T09:00:00+09:00" },
  { id: "USER-MFG", email: "mfg.owner@syuuk.test", username: "제조 담당자", role: "BUSINESS", departmentId: "DEPT-MFG", departmentName: "제조 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
  { id: "USER-COMM", email: "comm.owner@syuuk.test", username: "통신 담당자", role: "BUSINESS", departmentId: "DEPT-COMM", departmentName: "통신 사업부", createdAt: "2026-01-20T09:00:00+09:00" },
];

// 신규 계정 mock id 부여용 카운터 — Date.now() 대신 사용해 결정론을 유지한다.
let mockUserSequence = 1;

/**
 * @relatedFR FR-COM-01, FR-LEGAL-16
 * @relatedUI UI-LEGAL-08
 * @description mock 사용자 계정 목록을 조회한다.
 */
export function getMockUsers(): UserItem[] {
  return users.map((user) => ({ ...user }));
}

/**
 * @relatedFR FR-COM-01
 * @relatedUI UI-LEGAL-08
 * @description mock 계정을 생성한다 — 초대 발송 전제이므로 createdAt만 부여하고 목록에 추가한다.
 */
export function createMockUser(request: CreateUserRequest): UserItem {
  const user: UserItem = {
    id: `USER-MOCK-${mockUserSequence++}`,
    email: request.email,
    username: request.username,
    role: request.role,
    departmentId: request.departmentId,
    departmentName: request.departmentName,
    createdAt: "2026-03-02T09:00:00+09:00",
  };
  users = [...users, user];
  return { ...user };
}

/**
 * @relatedFR FR-COM-01, FR-LEGAL-16
 * @relatedUI UI-LEGAL-08
 * @description mock 계정 정보를 수정한다.
 */
export function updateMockUser(userId: string, request: UpdateUserRequest): UserItem {
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) throw new Error("수정할 계정을 찾을 수 없습니다.");
  const next: UserItem = { ...users[index], ...request };
  users = users.map((user, current) => (current === index ? next : user));
  return { ...next };
}

/**
 * @relatedUI UI-LEGAL-08
 * @description mock 계정을 삭제한다.
 */
export function deleteMockUser(userId: string): void {
  users = users.filter((user) => user.id !== userId);
}

/**
 * @relatedUI UI-LEGAL-08
 * @description mock 임시 비밀번호 발급 — 평문 비밀번호는 노출하지 않고 수신 이메일만 돌려준다.
 */
export function resetMockUserPassword(userId: string): { userId: string; email: string; temporaryPassword: string } {
  const user = users.find((item) => item.id === userId);
  if (!user) throw new Error("비밀번호를 발급할 계정을 찾을 수 없습니다.");
  return { userId, email: user.email, temporaryPassword: "(mock)" };
}
