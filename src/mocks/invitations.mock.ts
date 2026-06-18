/**
 * @author 유건욱
 * @date 2026-06-14
 */
import type { BusinessInvitationStatus, InvitationValidation } from "../types/invitation";

// 9개 사업부(DEPT-*)에 1:1 대응하는 사업부 계정 초대 상태 시드.
// 회신 기한(responseDeadline)은 전 부서 공통값으로 두고, 계정/초대 상태 분포만 의미있게 구성한다.
// 날짜는 결정론을 위해 하드코딩한다(Date.now() 사용 금지).
const RESPONSE_DEADLINE = "2026-07-31";

let businessInvitations: BusinessInvitationStatus[] = [
  {
    userId: "USER-AI",
    email: "ai.owner@syuuk.test",
    username: "AI 담당자",
    departmentId: "DEPT-AI",
    departmentName: "AI 사업부",
    accountStatus: "ACTIVE",
    invitationStatus: "ACCEPTED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-21T10:12:00+09:00",
    lastAccessAt: "2026-02-18T14:05:00+09:00",
  },
  {
    userId: "USER-CHAIN",
    email: "blockchain.owner@syuuk.test",
    username: "Blockchain 담당자",
    departmentId: "DEPT-CHAIN",
    departmentName: "Blockchain 사업부",
    accountStatus: "ACTIVE",
    invitationStatus: "ACCEPTED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-22T11:40:00+09:00",
    lastAccessAt: "2026-02-15T09:30:00+09:00",
  },
  {
    userId: "USER-ESG",
    email: "esg.owner@syuuk.test",
    username: "ESG 담당자",
    departmentId: "DEPT-ESG",
    departmentName: "ESG 사업부",
    accountStatus: "ACTIVE",
    invitationStatus: "ACCEPTED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-21T16:20:00+09:00",
    lastAccessAt: "2026-02-19T11:10:00+09:00",
  },
  {
    userId: "USER-DATA",
    email: "data.owner@syuuk.test",
    username: "Data 담당자",
    departmentId: "DEPT-DATA",
    departmentName: "Data 사업부",
    accountStatus: "ACTIVE",
    invitationStatus: "ACCEPTED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-20T13:05:00+09:00",
    lastAccessAt: "2026-02-20T08:45:00+09:00",
  },
  {
    userId: "USER-FIN",
    email: "finance.owner@syuuk.test",
    username: "금융/전략 담당자",
    departmentId: "DEPT-FIN",
    departmentName: "금융/전략 사업부",
    accountStatus: "ACTIVE",
    invitationStatus: "ACCEPTED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-23T09:55:00+09:00",
    lastAccessAt: "2026-02-17T15:25:00+09:00",
  },
  // 인사개편으로 새 담당자에게 재발송됐으나 아직 수락 전(초대됨·대기, 만료 전).
  {
    userId: "USER-LEGACY",
    email: "legacy.owner@syuuk.test",
    username: "기존사업 담당자",
    departmentId: "DEPT-LEGACY",
    departmentName: "기존사업 담당",
    accountStatus: "PENDING",
    invitationStatus: "PENDING",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-02-18T09:00:00+09:00",
    expiresAt: "2026-12-31T09:00:00+09:00",
    acceptedAt: null,
    lastAccessAt: null,
  },
  // 초대 후 수락하지 않은 채 토큰이 만료됨(초대됨·만료). 재발송 필요.
  {
    userId: "USER-SOLUTION",
    email: "solution.owner@syuuk.test",
    username: "솔루션 담당자",
    departmentId: "DEPT-SOLUTION",
    departmentName: "솔루션 사업부",
    accountStatus: "PENDING",
    invitationStatus: "EXPIRED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-05T09:00:00+09:00",
    expiresAt: "2026-01-12T09:00:00+09:00",
    acceptedAt: null,
    lastAccessAt: null,
  },
  // 담당자 퇴사로 계정이 회수됨(비활성·회수).
  {
    userId: "USER-MFG",
    email: "mfg.owner@syuuk.test",
    username: "제조 담당자",
    departmentId: "DEPT-MFG",
    departmentName: "제조 사업부",
    accountStatus: "INACTIVE",
    invitationStatus: "REVOKED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-21T10:00:00+09:00",
    lastAccessAt: "2026-02-02T10:00:00+09:00",
  },
  {
    userId: "USER-COMM",
    email: "comm.owner@syuuk.test",
    username: "통신 담당자",
    departmentId: "DEPT-COMM",
    departmentName: "통신 사업부",
    accountStatus: "ACTIVE",
    invitationStatus: "ACCEPTED",
    responseDeadline: RESPONSE_DEADLINE,
    invitedAt: "2026-01-20T09:00:00+09:00",
    expiresAt: "2026-01-27T09:00:00+09:00",
    acceptedAt: "2026-01-24T14:15:00+09:00",
    lastAccessAt: "2026-02-16T13:50:00+09:00",
  },
];

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-23
 * @relatedUI UI-LEGAL-08
 * @description mock 사업부 계정 초대 상태(계정/초대/회신 기한) 목록을 조회한다.
 */
export function getMockBusinessInvitations() {
  return businessInvitations.map((invitation) => ({ ...invitation }));
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-23
 * @relatedUI UI-LEGAL-08
 * @description mock 초대를 재발송한다 — 해당 계정을 초대됨/대기로 되돌리고 초대일·만료일을 갱신해 돌려준다.
 */
export function resendMockInvitation(userId: string): BusinessInvitationStatus {
  const index = businessInvitations.findIndex((invitation) => invitation.userId === userId);
  if (index < 0) {
    throw new Error("초대를 재발송할 사업부 계정을 찾을 수 없습니다.");
  }

  const resent: BusinessInvitationStatus = {
    ...businessInvitations[index],
    accountStatus: "PENDING",
    invitationStatus: "PENDING",
    invitedAt: "2026-02-20T09:00:00+09:00",
    expiresAt: "2026-12-31T09:00:00+09:00",
    acceptedAt: null,
  };

  businessInvitations = businessInvitations.map((invitation, current) =>
    current === index ? resent : invitation,
  );

  return { ...resent };
}

// 수락 화면 데모용 토큰. "demo-invite-token"은 유효, "expired-invite-token"은 만료, 그 외는 무효로 처리한다.
const MOCK_VALID_TOKEN = "demo-invite-token";
const MOCK_EXPIRED_TOKEN = "expired-invite-token";

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-COM-04
 * @description mock 초대 토큰 검증 — 데모 토큰만 유효(PENDING)로 응답한다.
 */
export function validateMockInvitation(token: string): InvitationValidation {
  if (token === MOCK_VALID_TOKEN) {
    return { valid: true, status: "PENDING", email: "legacy.owner@syuuk.test", responseDeadline: RESPONSE_DEADLINE };
  }
  if (token === MOCK_EXPIRED_TOKEN) {
    return { valid: false, status: "EXPIRED", email: "solution.owner@syuuk.test", responseDeadline: RESPONSE_DEADLINE };
  }
  return { valid: false, status: "REVOKED", email: null, responseDeadline: null };
}

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-COM-04
 * @description mock 초대 수락 — 유효 토큰이면 성공, 그 외는 거부한다.
 */
export function acceptMockInvitation(token: string): void {
  if (token !== MOCK_VALID_TOKEN) {
    throw new Error("초대 링크가 만료되었거나 유효하지 않습니다.");
  }
}
