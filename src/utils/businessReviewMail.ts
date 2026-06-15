import type { PatentListItem } from "../types/patent";
import type { BusinessReviewMailSendDraft, DepartmentRecipientMapping, PatentPdfLink } from "../types/mailing";

export interface BusinessReviewMailDraft {
  body: string;
  ccEmails: string[];
  patents: PatentListItem[];
  // MAIL-12: 특허별 PDF 다운로드 링크(있을 때만). 발송 payload와 이력에 보존된다.
  pdfLinkByPatentId: Map<string, PatentPdfLink>;
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
  pdfLinks: PatentPdfLink[] = [],
): BusinessReviewMailDraft {
  return createBusinessReviewMailDraftFromPatents([patent], recipientMappings, pdfLinks);
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04, UI-LEGAL-05
 * @description 같은 담당자에게 보낼 여러 특허를 하나의 사업부 검토 요청 메일 초안으로 묶는다.
 */
export function createBusinessReviewMailDraftFromPatents(
  patents: PatentListItem[],
  recipientMappings: DepartmentRecipientMapping[] = [],
  pdfLinks: PatentPdfLink[] = [],
  // FR-LEGAL-23: 활성 분기 회신 기한(있을 때만 본문에 명시). 값이 없으면 해당 라인을 생략한다.
  submissionDeadline: string | null = null,
): BusinessReviewMailDraft {
  const [firstPatent] = patents;

  if (!firstPatent) {
    throw new Error("메일 초안을 만들 특허가 없습니다.");
  }

  // MAIL-12/MAIL-13: KIPRIS_S3는 presigned 링크, UPLOADED(법무팀 직접 업로드 — TW·UAE 등)는
  // 인증이 필요한 앱 내 다운로드라 특허 상세 딥링크를 안내한다. ORIGINAL_URL 폴백은 원문 라인으로 충분.
  const pdfLinkByPatentId = new Map(
    pdfLinks
      .filter((link) => link.source === "UPLOADED" || (link.source === "KIPRIS_S3" && link.pdfUrl))
      .map((link) => [link.patentId, link]),
  );
  const recipient = getDepartmentRecipient(firstPatent, recipientMappings);

  // MAIL-10: placeholder(patentflow.example.com) 대신 실제 앱 URL — VITE_APP_URL 우선, 없으면 현재 origin,
  // 둘 다 없으면 접속 URL 라인을 생략한다(메일에 가짜 URL 노출 방지).
  const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const accessUrl = (importMetaEnv?.VITE_APP_URL?.trim())
    || (typeof window !== "undefined" ? window.location.origin : "");

  const patentLines = patents.flatMap((patent, index) => {
    const pdfLink = pdfLinkByPatentId.get(patent.patentId);
    return [
      `${index + 1}. ${patent.managementNumber} · ${patent.title}`,
      `   - 관련 사업: ${getDisplayValue(patent.businessArea)}`,
      `   - 관련 기술: ${getDisplayValue(patent.technologyArea)}`,
      `   - 연차료 납부 예정일: ${patent.feeDueDate}`,
      `   - 특허 원문: ${getOriginalPatentUrl(patent)}`,
      ...(pdfLink?.source === "KIPRIS_S3"
        ? [`   - 특허 PDF 다운로드: ${pdfLink.pdfUrl} (7일간 유효)`]
        : []),
      ...(pdfLink?.source === "UPLOADED"
        ? [
            `   - 특허 PDF: 시스템 특허 상세에서 다운로드${
              accessUrl ? ` (${accessUrl}/business/patents/${patent.patentId})` : ""
            }`,
          ]
        : []),
    ];
  });
  return {
    body: [
      `${recipient.name}님,`,
      "",
      `아래 ${patents.length}건의 특허가 연차료 납부 검토 대상에 포함되어 사업부 의견을 요청드립니다.`,
      "",
      ...patentLines,
      "",
      ...(submissionDeadline
        ? [`회신 기한: ${submissionDeadline}`, "회신 기한까지 사업부 의견을 제출해 주세요."]
        : ["관리자가 안내한 회신 기한까지 사업부 의견을 제출해 주세요."]),
      "각 특허의 AI 특허 평가 레포트와 평가 근거를 확인한 뒤 유지 또는 포기 의견을 제출해 주세요.",
      "PatentFlow에 로그인해 유지/포기 의견을 제출해 주세요.",
      ...(accessUrl ? [`접속 URL: ${accessUrl}`] : []),
    ].join("\n"),
    ccEmails: recipient.ccEmails,
    patents,
    pdfLinkByPatentId,
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
  pdfLinks: PatentPdfLink[] = [],
  submissionDeadline: string | null = null,
) {
  const groupedPatents = new Map<string, PatentListItem[]>();

  patents.forEach((patent) => {
    const recipient = getDepartmentRecipient(patent, recipientMappings);
    const groupKey = `${recipient.email}::${recipient.name}`;

    groupedPatents.set(groupKey, [...(groupedPatents.get(groupKey) ?? []), patent]);
  });

  return Array.from(groupedPatents.values()).map((groupedPatentList) =>
    createBusinessReviewMailDraftFromPatents(groupedPatentList, recipientMappings, pdfLinks, submissionDeadline),
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
      originalPatentUrl: getOriginalPatentUrl(patent),
      patentId: patent.patentId,
      title: patent.title,
      pdfDownloadUrl: draft.pdfLinkByPatentId.get(patent.patentId)?.pdfUrl ?? null,
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

// 특허 원문(KIPRIS/Google Patents) URL. 등록된 URL 우선, 없으면 번호로 Google Patents 자동 생성.
// 상세 페이지 "특허 원문 보기"·"원문 링크"에서도 재사용한다. 번호도 없으면 "원문 URL 미등록" 반환.
export function getOriginalPatentUrl(patent: PatentListItem) {
  if (patent.originalPatentUrl?.trim()) {
    return patent.originalPatentUrl.trim();
  }

  const number = (patent.registrationNumber || patent.applicationNumber || "").replace(/[^0-9A-Za-z]/g, "");
  if (!number) {
    return "원문 URL 미등록";
  }

  const country = (patent.country || "KR").trim().toUpperCase();
  return `https://patents.google.com/patent/${country}${number}/ko`;
}
