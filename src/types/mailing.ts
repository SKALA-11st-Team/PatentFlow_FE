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
  originalPatentUrl?: string | null;
  title: string;
  // MAIL-12: KR 특허 공개전문 PDF의 presigned 다운로드 링크(만료 있음). 비KR/실패 시 없음.
  pdfDownloadUrl?: string | null;
}

/**
 * @relatedFR FR-LEGAL-13
 * MAIL-12: 특허별 PDF 다운로드 링크 해석 결과 — KIPRIS_S3는 presigned 링크, ORIGINAL_URL은 원문 폴백.
 */
export interface PatentPdfLink {
  patentId: string;
  pdfUrl: string | null;
  source: "KIPRIS_S3" | "ORIGINAL_URL";
  expiresAt: string | null;
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
