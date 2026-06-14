import { isBackendApiEnabled, requestJson, type ApiEnvelope } from "./client";
import {
  acceptMockInvitation,
  getMockBusinessInvitations,
  resendMockInvitation,
  validateMockInvitation,
} from "../mocks/invitations.mock";
import type { BusinessInvitationStatus, InvitationValidation } from "../types/invitation";

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-23
 * @relatedUI UI-LEGAL-08
 * @description 사업부 계정의 초대 토큰 상태와 회신 기한 기반 접근 윈도우 상태 목록을 조회한다.
 */
export async function getBusinessInvitations(): Promise<BusinessInvitationStatus[]> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessInvitationStatus[]>>("/admin/invitations");
    return response.data ?? [];
  }

  return getMockBusinessInvitations();
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-23
 * @relatedUI UI-LEGAL-08
 * @description 미수락/만료된 사업부 계정 초대를 재발송한다(계정을 초대됨/대기로 되돌린다).
 */
export async function resendInvitation(userId: string): Promise<BusinessInvitationStatus> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<BusinessInvitationStatus>>(
      `/admin/users/${userId}/invitation/resend`,
      { method: "POST" },
    );
    return response.data!;
  }

  return resendMockInvitation(userId);
}

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-COM-04
 * @description 공개 초대 토큰을 검증한다(수락 화면 진입 시). 만료/무효도 valid=false로 표현한다.
 */
export async function validateInvitation(token: string): Promise<InvitationValidation> {
  if (isBackendApiEnabled()) {
    const response = await requestJson<ApiEnvelope<InvitationValidation>>(
      `/invitations/${encodeURIComponent(token)}`,
    );
    if (!response.data) throw new Error("초대 토큰 검증 응답이 비어 있습니다.");
    return response.data;
  }

  return validateMockInvitation(token);
}

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-COM-04
 * @description 초대를 수락하고 최초 비밀번호를 설정한다. 성공 시 계정이 활성화된다.
 */
export async function acceptInvitation(token: string, newPassword: string): Promise<void> {
  if (isBackendApiEnabled()) {
    await requestJson<ApiEnvelope<null>>("/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
    return;
  }

  acceptMockInvitation(token);
}
