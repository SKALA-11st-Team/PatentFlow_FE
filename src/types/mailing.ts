/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-05
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
  ccEmails: string[];
  patents: BusinessReviewMailPatentSummary[];
  recipientEmail: string;
  recipientName: string;
  subject: string;
}

export type MailingDeliveryStatus = "SENT" | "FAILED" | "PENDING" | "RECORDED";

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
