import type { PatentListItem } from "../types/patent";
import type { BusinessReviewMailSendDraft, DepartmentRecipientMapping } from "../types/mailing";

export interface BusinessReviewMailDraft {
  body: string;
  ccEmails: string[];
  patents: PatentListItem[];
  recipientEmail: string;
  recipientName: string;
  subject: string;
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04
 * @description 선택 특허와 부서 담당자 정보를 기반으로 사업부 검토 요청 메일 초안을 만든다.
 */
export function createBusinessReviewMailDraft(
  patent: PatentListItem,
  recipientMappings: DepartmentRecipientMapping[] = [],
): BusinessReviewMailDraft {
  return createBusinessReviewMailDraftFromPatents([patent], recipientMappings);
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04, UI-LEGAL-05
 * @description 같은 담당자에게 보낼 여러 특허를 하나의 사업부 검토 요청 메일 초안으로 묶는다.
 */
export function createBusinessReviewMailDraftFromPatents(
  patents: PatentListItem[],
  recipientMappings: DepartmentRecipientMapping[] = [],
): BusinessReviewMailDraft {
  const [firstPatent] = patents;

  if (!firstPatent) {
    throw new Error("메일 초안을 만들 특허가 없습니다.");
  }

  const recipient = getDepartmentRecipient(firstPatent, recipientMappings);
  const patentLines = patents.flatMap((patent, index) => [
    `${index + 1}. ${patent.managementNumber} · ${patent.title}`,
    `   - 관련 사업: ${getDisplayValue(patent.businessArea)}`,
    `   - 관련 기술: ${getDisplayValue(patent.technologyArea)}`,
    `   - 납부 기한: ${patent.feeDueDate}`,
  ]);

  return {
    body: [
      `${recipient.name}님,`,
      "",
      `아래 ${patents.length}건의 특허가 연차료 납부 검토 대상에 포함되어 사업부 의견을 요청드립니다.`,
      "",
      ...patentLines,
      "",
      "각 특허의 AI 특허 평가 레포트와 평가 근거를 확인한 뒤 유지 또는 포기 의견을 제출해 주세요.",
      "접속 URL: https://patentflow.example.com (실제 URL로 변경 필요)",
    ].join("\n"),
    ccEmails: recipient.ccEmails,
    patents,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    subject:
      patents.length === 1
        ? `[PatentFlow] ${firstPatent.managementNumber} 사업부 검토 요청`
        : `[PatentFlow] ${firstPatent.departmentName} 연차료 검토 요청 ${patents.length}건`,
  };
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04, UI-LEGAL-05
 * @description 선택 특허를 부서 담당자 이메일 기준으로 묶어 메일 초안 목록을 만든다.
 */
export function createGroupedBusinessReviewMailDrafts(
  patents: PatentListItem[],
  recipientMappings: DepartmentRecipientMapping[] = [],
) {
  const groupedPatents = new Map<string, PatentListItem[]>();

  patents.forEach((patent) => {
    const recipient = getDepartmentRecipient(patent, recipientMappings);
    const groupKey = `${recipient.email}::${recipient.name}`;

    groupedPatents.set(groupKey, [...(groupedPatents.get(groupKey) ?? []), patent]);
  });

  return Array.from(groupedPatents.values()).map((groupedPatentList) =>
    createBusinessReviewMailDraftFromPatents(groupedPatentList, recipientMappings),
  );
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04, UI-LEGAL-05
 * @description 메일 발송 대기 목록과 상세 화면에서 부서별 담당자 이름과 이메일을 표시한다.
 */
export function getDepartmentRecipient(
  patent: PatentListItem,
  recipientMappings: DepartmentRecipientMapping[] = [],
) {
  const savedMapping = recipientMappings.find((mapping) => mapping.departmentId === patent.departmentId);

  if (savedMapping) {
    return {
      email: savedMapping.managerEmail,
      name: savedMapping.managerName,
      ccEmails: savedMapping.ccEmails,
    };
  }

  return {
    ccEmails: [],
    email: "",
    name: `${patent.departmentName} 담당자`,
  };
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04, UI-LEGAL-05
 * @description 화면에서 수정한 메일 초안을 BE 발송 요청 payload로 변환한다.
 */
export function toBusinessReviewMailSendDraft(draft: BusinessReviewMailDraft): BusinessReviewMailSendDraft {
  return {
    body: draft.body,
    ccEmails: draft.ccEmails.map((email) => email.trim()).filter(Boolean),
    patents: draft.patents.map((patent) => ({
      managementNumber: patent.managementNumber,
      patentId: patent.patentId,
      title: patent.title,
    })),
    recipientEmail: draft.recipientEmail,
    recipientName: draft.recipientName,
    subject: draft.subject,
  };
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04
 * @description 메일 초안에서 빈 특허 컨텍스트 값을 표시 가능한 문구로 변환한다.
 */
function getDisplayValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue && normalizedValue !== "N/A" ? normalizedValue : "미분류";
}
