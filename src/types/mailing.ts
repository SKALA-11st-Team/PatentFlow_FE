/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-06
 * @description 부서별 메일 담당자 설정과 사업부 검토 요청 메일 화면 모델 타입
 */
export interface DepartmentRecipientMapping {
  departmentId: string;
  departmentName: string;
  managerEmail: string;
  managerName: string;
  ccEmails: string[];
  updatedAt: string;
}

export interface BusinessReviewMailPatentSummary {
  patentId: string;
  managementNumber: string;
  title: string;
}

export interface BusinessReviewMailSendDraft {
  body: string;
  patents: BusinessReviewMailPatentSummary[];
  recipientEmail: string;
  recipientName: string;
  subject: string;
}

export type MailingDeliveryStatus = "SENT" | "FAILED" | "PENDING";

export interface MailingHistoryItem {
  body: string;
  ccEmails: string[];
  mailingId: string;
  patentCount: number;
  patents: BusinessReviewMailPatentSummary[];
  recipientEmail: string;
  recipientName: string;
  sentAt: string;
  sentBy: string;
  status: MailingDeliveryStatus;
  subject: string;
}
