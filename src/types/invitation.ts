/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-23
 * @relatedUI UI-LEGAL-08
 * @description 사업부 계정 초대 토큰 온보딩과 회신 기한 기반 접근 윈도우 상태 모델 타입.
 *              계정은 개인에 묶이되 사업부(부서) 단위 연속성을 유지하며, 접근 가능 기간은 회신 기한에 연동된다.
 * @author 유건욱
 * @date 2026-06-14
 */

// 계정 상태: 초대됨(미수락) / 활성 / 비활성(회수)
export type AccountStatus = "PENDING" | "ACTIVE" | "INACTIVE";

// 초대 상태: 대기 / 수락 / 만료 / 회수
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

// 접근 윈도우 상태(사업부 계산값): 열림 / 마감(회신 기한 경과) / 없음(열린 검토 없음)
export type AccessWindowState = "OPEN" | "CLOSED" | "NONE";

// 공개 초대 토큰 검증 결과(수락 화면용). 만료/무효 시 valid=false, 가능하면 이메일을 노출한다.
export interface InvitationValidation {
  valid: boolean;
  status: InvitationStatus;
  email: string | null;
  responseDeadline: string | null;
}

export interface BusinessInvitationStatus {
  userId: string;
  email: string;
  username: string;
  departmentId: string;
  departmentName: string;
  accountStatus: AccountStatus;
  // 초대 정보는 피처 도입 전 생성된 계정(미초대) 등에서 비어 있을 수 있으므로 nullable.
  invitationStatus: InvitationStatus | null;
  responseDeadline: string | null;
  invitedAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  lastAccessAt: string | null;
}
