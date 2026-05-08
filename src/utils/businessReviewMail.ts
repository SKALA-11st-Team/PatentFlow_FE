import type { PatentListItem } from "../types/patent";

export interface BusinessReviewMailDraft {
  body: string;
  patent: PatentListItem;
  recipientEmail: string;
  recipientName: string;
  subject: string;
}

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-02, UI-LEGAL-05
 * @description 선택 특허와 부서 담당자 정보를 기반으로 사업부 검토 요청 메일 초안을 만든다.
 */
export function createBusinessReviewMailDraft(patent: PatentListItem): BusinessReviewMailDraft {
  const recipient = getDepartmentRecipient(patent);

  return {
    body: [
      `${recipient.name}님,`,
      "",
      "아래 특허가 연차료 납부 검토 대상에 포함되어 사업부 의견을 요청드립니다.",
      "",
      `- 관리번호: ${patent.managementNumber}`,
      `- 특허명: ${patent.title}`,
      `- 관련 사업: ${getDisplayValue(patent.businessArea)}`,
      `- 관련 기술: ${getDisplayValue(patent.technologyArea)}`,
      `- 납부 기한: ${patent.annualFeeDueDate}`,
      "",
      "AI 특허 평가 레포트와 평가 근거를 확인한 뒤 유지 또는 포기 의견을 제출해 주세요.",
      "본 메일 내용은 Gmail/BE 연동 전까지 UI 미리보기용 mock 초안입니다.",
    ].join("\n"),
    patent,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    subject: `[PatentFlow] ${patent.managementNumber} 사업부 검토 요청`,
  };
}

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-02, UI-LEGAL-05
 * @description 메일 발송 대기 목록과 상세 화면에서 부서별 담당자 이름과 이메일을 표시한다.
 */
export function getDepartmentRecipient(patent: PatentListItem) {
  const localPart = patent.departmentId.replace(/^DEPT-/, "").toLowerCase();

  return {
    email: `${localPart}.owner@syuuk.test`,
    name: `${patent.departmentName} 담당자`,
  };
}

/**
 * @relatedFR FR-014, FR-015
 * @relatedUI UI-LEGAL-02, UI-LEGAL-05
 * @description 메일 초안에서 빈 특허 컨텍스트 값을 표시 가능한 문구로 변환한다.
 */
function getDisplayValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue && normalizedValue !== "N/A" ? normalizedValue : "미분류";
}
