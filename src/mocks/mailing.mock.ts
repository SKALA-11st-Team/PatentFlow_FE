import type {
  BusinessReviewMailSendDraft,
  DepartmentRecipientMapping,
  MailingHistoryItem,
} from "../types/mailing";

export const departmentRecipientMappings: DepartmentRecipientMapping[] = [
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-AI",
    departmentName: "AI 사업부",
    managerEmail: "ai.owner@syuuk.test",
    managerName: "AI 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-CHAIN",
    departmentName: "Blockchain 사업부",
    managerEmail: "blockchain.owner@syuuk.test",
    managerName: "Blockchain 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-ESG",
    departmentName: "ESG 사업부",
    managerEmail: "esg.owner@syuuk.test",
    managerName: "ESG 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-DATA",
    departmentName: "Data 사업부",
    managerEmail: "data.owner@syuuk.test",
    managerName: "Data 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-FIN",
    departmentName: "금융/전략 사업부",
    managerEmail: "finance.owner@syuuk.test",
    managerName: "금융/전략 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-LEGACY",
    departmentName: "기존사업 담당",
    managerEmail: "legacy.owner@syuuk.test",
    managerName: "기존사업 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-SOLUTION",
    departmentName: "솔루션 사업부",
    managerEmail: "solution.owner@syuuk.test",
    managerName: "솔루션 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-MFG",
    departmentName: "제조 사업부",
    managerEmail: "mfg.owner@syuuk.test",
    managerName: "제조 담당자",
    updatedAt: "2026-05-11",
  },
  {
    ccEmails: ["legal-review@syuuk.test"],
    departmentId: "DEPT-COMM",
    departmentName: "통신 사업부",
    managerEmail: "comm.owner@syuuk.test",
    managerName: "통신 담당자",
    updatedAt: "2026-05-11",
  },
];

export const mailingHistoryItems: MailingHistoryItem[] = [
  {
    body: [
      "AI 담당자님,",
      "",
      "아래 특허가 연차료 납부 검토 대상에 포함되어 사업부 의견을 요청드립니다.",
      "",
      "1. P202405001-KR0 · 상품 트렌드 예측을 반영한 강화학습 모델을 적용한 자산배분 시스템 및 방법",
      "",
      "AI 특허 평가 레포트와 평가 근거를 확인한 뒤 유지 또는 포기 의견을 제출해 주세요.",
    ].join("\n"),
    ccEmails: ["legal-review@syuuk.test"],
    mailingId: "MAIL-20260511-001",
    patentCount: 1,
    patents: [
      {
        managementNumber: "P202405001-KR0",
        patentId: "P202405001-KR0",
        title: "상품 트렌드 예측을 반영한 강화학습 모델을 적용한 자산배분 시스템 및 방법",
      },
    ],
    recipientEmail: "ai.owner@syuuk.test",
    recipientName: "AI 담당자",
    sentAt: "2026-05-11T09:20:00+09:00",
    sentBy: "Legal팀 관리자",
    status: "SENT",
    subject: "[PatentFlow] P202405001-KR0 사업부 검토 요청",
  },
  {
    body: [
      "Data 담당자님,",
      "",
      "아래 2건의 특허가 연차료 납부 검토 대상에 포함되어 사업부 의견을 요청드립니다.",
      "",
      "1. P202107001-KR0 · 한글로 표현된 숫자 표현 추출 방법 및 시스템",
      "2. P202207001-KR0 · 비정형 문서 기반 검색 정확도 개선 방법",
    ].join("\n"),
    ccEmails: ["legal-review@syuuk.test", "patent-admin@syuuk.test"],
    mailingId: "MAIL-20260510-002",
    patentCount: 2,
    patents: [
      {
        managementNumber: "P202107001-KR0",
        patentId: "P202107001-KR0",
        title: "한글로 표현된 숫자 표현 추출 방법 및 시스템",
      },
      {
        managementNumber: "P202207001-KR0",
        patentId: "P202207001-KR0",
        title: "비정형 문서 기반 검색 정확도 개선 방법",
      },
    ],
    recipientEmail: "data.owner@syuuk.test",
    recipientName: "Data 담당자",
    sentAt: "2026-05-10T16:35:00+09:00",
    sentBy: "Legal팀 관리자",
    status: "SENT",
    subject: "[PatentFlow] Data 사업부 연차료 검토 요청 2건",
  },
  {
    body: "메일 서버 응답 지연으로 재시도 대기 중인 mock 이력입니다.",
    ccEmails: ["legal-review@syuuk.test"],
    mailingId: "MAIL-20260509-003",
    patentCount: 1,
    patents: [
      {
        managementNumber: "P202301010-KR0",
        patentId: "P202301010-KR0",
        title: "CMP Pad 물류 관리 최적화 방법",
      },
    ],
    recipientEmail: "mfg.owner@syuuk.test",
    recipientName: "제조 담당자",
    sentAt: "2026-05-09T11:05:00+09:00",
    sentBy: "Legal팀 관리자",
    status: "PENDING",
    subject: "[PatentFlow] P202301010-KR0 사업부 검토 요청",
  },
];

/**
 * @relatedFR FR-014
 * @relatedUI UI-LEGAL-06
 * @description mock 부서별 담당자 매핑 목록을 조회한다.
 */
export function getMockDepartmentRecipientMappings() {
  return [...departmentRecipientMappings];
}

/**
 * @relatedFR FR-014
 * @relatedUI UI-LEGAL-06
 * @description mock 부서별 담당자 이름, 이메일, 부서명을 수정한다.
 */
export function updateMockDepartmentRecipientMapping(nextMapping: DepartmentRecipientMapping) {
  const index = departmentRecipientMappings.findIndex(
    (mapping) => mapping.departmentId === nextMapping.departmentId,
  );

  if (index >= 0) {
    departmentRecipientMappings[index] = nextMapping;
    return nextMapping;
  }

  departmentRecipientMappings.push(nextMapping);
  return nextMapping;
}

/**
 * @relatedFR FR-016
 * @relatedUI UI-LEGAL-05, UI-LEGAL-06
 * @description mock 메일 발송 이력을 특허, 수신자 기준으로 조회한다.
 */
export function getMockMailingHistory({
  patentId,
  recipientEmail,
}: {
  patentId?: string;
  recipientEmail?: string;
} = {}) {
  return mailingHistoryItems.filter((history) => {
    const matchesPatent = !patentId || history.patents.some((patent) => patent.patentId === patentId);
    const matchesRecipient = !recipientEmail || history.recipientEmail === recipientEmail;

    return matchesPatent && matchesRecipient;
  });
}

/**
 * @relatedFR FR-016
 * @relatedUI UI-LEGAL-02, UI-LEGAL-05, UI-LEGAL-06
 * @description mock 메일 발송 처리 결과를 발송 이력 목록 상단에 추가한다.
 */
export function appendMockMailingHistory(drafts: BusinessReviewMailSendDraft[]) {
  const sentAt = new Date().toISOString();

  const nextItems = drafts.map((draft, index) => ({
    body: draft.body,
    ccEmails: draft.ccEmails.length > 0 ? draft.ccEmails : getCcEmailsByRecipient(draft.recipientEmail),
    mailingId: `MAIL-${Date.now()}-${index + 1}`,
    patentCount: draft.patents.length,
    patents: draft.patents,
    recipientEmail: draft.recipientEmail,
    recipientName: draft.recipientName,
    sentAt,
    sentBy: "Legal팀 관리자",
    status: "SENT" as const,
    subject: draft.subject,
  }));

  mailingHistoryItems.unshift(...nextItems);
}

function getCcEmailsByRecipient(recipientEmail: string) {
  return departmentRecipientMappings.find((mapping) => mapping.managerEmail === recipientEmail)?.ccEmails ?? [
    "legal-review@syuuk.test",
  ];
}
