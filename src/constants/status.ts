/**
 * @relatedFR FR-001, FR-002, FR-006, FR-009, FR-011, FR-012, FR-017
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-05, UI-LEGAL-07, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05
 * @description PatentFlow FE에서 사용하는 상태값, 라벨, 표시 순서, 배지 tone을 한 곳에서 관리한다.
 */

export type StatusTone = "neutral" | "primary" | "warning" | "success" | "danger";

export const PATENT_LIFECYCLE_STATUSES = ["ACTIVE", "ABANDONED", "SOLD", "EXPIRED"] as const;

export type PatentLifecycleStatus = (typeof PATENT_LIFECYCLE_STATUSES)[number];

export const REVIEW_WORKFLOW_STATUSES = [
  "NOT_IN_REVIEW_QUARTER",
  "REVIEW_QUARTER_STARTED",
  "REPORT_GENERATED",
  "MAIL_READY",
  "WAITING_BUSINESS_RESPONSE",
  "BUSINESS_RESPONSE_RECEIVED",
  "WAITING_EXECUTIVE_APPROVAL",
  "APPROVAL_COMPLETED",
  "LEGAL_ACTION_RECORDED",
] as const;

export type ReviewWorkflowStatus = (typeof REVIEW_WORKFLOW_STATUSES)[number];

export const RECOMMENDATIONS = ["MAINTAIN", "REVIEW_AGAIN", "ABANDON", "SALES_CANDIDATE", "HOLD"] as const;

export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const BUSINESS_OPINION_DECISIONS = ["MAINTAIN", "ABANDON"] as const;

export type BusinessOpinionDecision = (typeof BUSINESS_OPINION_DECISIONS)[number];

export const EXECUTIVE_APPROVAL_DECISIONS = [
  "APPROVED_MAINTAIN",
  "APPROVED_ABANDON",
  "APPROVED_SELL",
  "REJECTED",
  "REQUEST_CHANGES",
] as const;

export type ExecutiveApprovalDecision = (typeof EXECUTIVE_APPROVAL_DECISIONS)[number];

export const LEGAL_ACTION_RESULTS = ["MAINTAINED", "ABANDONED", "SOLD"] as const;

export type LegalActionResult = (typeof LEGAL_ACTION_RESULTS)[number];

export const EVALUATION_CATEGORIES = [
  "RIGHTS",
  "TECHNOLOGY",
  "MARKET",
  "BUSINESS_ALIGNMENT",
] as const;

export type EvaluationCategory = (typeof EVALUATION_CATEGORIES)[number];

export const PATENT_CONTEXT_CATEGORY_OPTIONS = [
  {
    businessArea: "AI",
    technologyAreas: [
      "자연어처리",
      "음성인식",
      "Vision AI",
      "eXplainable AI",
      "AI/Bigdata",
      "비정형 논문 검색",
      "검색",
      "인지",
    ],
  },
  {
    businessArea: "Data",
    technologyAreas: ["데이터분석", "AB Testing"],
  },
  {
    businessArea: "Blockchain",
    technologyAreas: ["Blockchain"],
  },
  {
    businessArea: "Cloud",
    technologyAreas: ["Cloud", "시스템 운영", "장애관리", "서버실"],
  },
  {
    businessArea: "ESG",
    technologyAreas: ["ESG", "Green IT (AMR)", "Green IT (BMS)", "Green IT (EMS)", "Green IT (ESS)"],
  },
  {
    businessArea: "제조",
    technologyAreas: [
      "Smart Factory",
      "제조공정",
      "반도체공정",
      "물류",
      "AGV Align 기술",
      "CMP Pad 물류 기술",
      "CMP Pad 건조기술",
      "CMP Pad Cutting, Aging 기술",
      "CMP Pad Marking 기술",
      "NF3 생산 공정 장비",
    ],
  },
  {
    businessArea: "통신",
    technologyAreas: ["Network", "LBS", "NFC", "이동통신서비스", "네비게이션", "단말 원격제어"],
  },
  {
    businessArea: "금융/전략",
    technologyAreas: ["인증", "OTP", "보안", "저장장치 보안", "Watermark"],
  },
  {
    businessArea: "통합서비스",
    technologyAreas: ["AR", "VR (Avatar)", "3D솔루션 (MAP)", "사내시스템", "신변보호", "위험감지", "열차 관련", "도유방지"],
  },
] as const;

export type PatentBusinessAreaCategory = (typeof PATENT_CONTEXT_CATEGORY_OPTIONS)[number]["businessArea"];

export const PATENT_BUSINESS_AREA_CATEGORIES = PATENT_CONTEXT_CATEGORY_OPTIONS.map(
  (option) => option.businessArea,
) as PatentBusinessAreaCategory[];

export const PATENT_TECHNOLOGY_AREA_CATEGORIES = Array.from(
  new Set(PATENT_CONTEXT_CATEGORY_OPTIONS.flatMap((option) => option.technologyAreas)),
);

export const lifecycleStatusLabels: Record<PatentLifecycleStatus, string> = {
  ACTIVE: "보유 중",
  ABANDONED: "포기 완료",
  SOLD: "매각 완료",
  EXPIRED: "소멸",
};

export const reviewWorkflowStatusLabels: Record<ReviewWorkflowStatus, string> = {
  NOT_IN_REVIEW_QUARTER: "검토 분기 아님",
  REVIEW_QUARTER_STARTED: "이번 분기 납부 대상",
  REPORT_GENERATED: "레포트 생성 완료",
  MAIL_READY: "메일 발송 대기",
  WAITING_BUSINESS_RESPONSE: "사업부 응답 대기",
  BUSINESS_RESPONSE_RECEIVED: "사업부 응답 완료",
  WAITING_EXECUTIVE_APPROVAL: "임원 승인 대기",
  APPROVAL_COMPLETED: "승인 완료",
  LEGAL_ACTION_RECORDED: "처리 완료",
};

export const reviewWorkflowShortLabels: Record<ReviewWorkflowStatus, string> = {
  NOT_IN_REVIEW_QUARTER: "대상 아님",
  REVIEW_QUARTER_STARTED: "대상 확정",
  REPORT_GENERATED: "AI 레포트",
  MAIL_READY: "발송 대기",
  WAITING_BUSINESS_RESPONSE: "회신 대기",
  BUSINESS_RESPONSE_RECEIVED: "회신 완료",
  WAITING_EXECUTIVE_APPROVAL: "승인 대기",
  APPROVAL_COMPLETED: "승인 완료",
  LEGAL_ACTION_RECORDED: "처리 완료",
};

export const recommendationLabels: Record<Recommendation, string> = {
  MAINTAIN: "유지 권고",
  REVIEW_AGAIN: "추가 정보 필요",
  ABANDON: "포기 검토",
  SALES_CANDIDATE: "포기 검토",
  HOLD: "추가 정보 필요",
};

export const recommendationTone: Record<Recommendation, StatusTone> = {
  MAINTAIN: "success",
  REVIEW_AGAIN: "warning",
  ABANDON: "danger",
  SALES_CANDIDATE: "danger",
  HOLD: "warning",
};

/**
 * @relatedFR FR-006, FR-008
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-05, UI-BUS-01, UI-BUS-02, UI-BUS-03
 * @description AI 권고값을 특허 목록과 상세 화면의 일관된 배지 tone으로 변환한다.
 */
export function getRecommendationTone(recommendation: Recommendation) {
  return recommendationTone[recommendation];
}

export const RECOMMENDATION_FILTER_OPTIONS = [
  {
    label: "전체",
    recommendations: RECOMMENDATIONS,
    value: "ALL",
  },
  {
    label: recommendationLabels.MAINTAIN,
    recommendations: ["MAINTAIN"],
    value: "MAINTAIN",
  },
  {
    label: recommendationLabels.REVIEW_AGAIN,
    recommendations: ["REVIEW_AGAIN", "HOLD"],
    value: "REVIEW_AGAIN_OR_HOLD",
  },
  {
    label: recommendationLabels.ABANDON,
    recommendations: ["ABANDON", "SALES_CANDIDATE"],
    value: "ABANDON_OR_SALES_CANDIDATE",
  },
] as const satisfies readonly {
  label: string;
  recommendations: readonly Recommendation[];
  value: string;
}[];

export type RecommendationFilter = (typeof RECOMMENDATION_FILTER_OPTIONS)[number]["value"];

/**
 * @relatedFR FR-001, FR-002, FR-006, FR-009
 * @relatedUI UI-BUS-01, UI-BUS-02
 * @description 같은 표시 라벨을 공유하는 AI 권고값을 화면 필터용 그룹으로 변환한다.
 */
export function getRecommendationsByFilter(recommendationFilter: RecommendationFilter): readonly Recommendation[] {
  const matchedOption = RECOMMENDATION_FILTER_OPTIONS.find((option) => option.value === recommendationFilter);

  return matchedOption ? (matchedOption.recommendations as readonly Recommendation[]) : RECOMMENDATIONS;
}

export const businessOpinionLabels: Record<BusinessOpinionDecision, string> = {
  MAINTAIN: "유지",
  ABANDON: "포기",
};

export const businessOpinionTone: Record<BusinessOpinionDecision, StatusTone> = {
  MAINTAIN: "success",
  ABANDON: "danger",
};

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05
 * @description 사업부 유지/포기 의견을 일관된 배지 tone으로 변환한다.
 */
export function getBusinessOpinionTone(opinion: BusinessOpinionDecision) {
  return businessOpinionTone[opinion];
}

export const executiveApprovalLabels: Record<ExecutiveApprovalDecision, string> = {
  APPROVED_MAINTAIN: "유지 승인",
  APPROVED_ABANDON: "포기 승인",
  APPROVED_SELL: "매각 승인",
  REJECTED: "반려",
  REQUEST_CHANGES: "수정 요청",
};

export const legalActionResultLabels: Record<LegalActionResult, string> = {
  MAINTAINED: "유지 처리",
  ABANDONED: "포기 처리",
  SOLD: "매각 처리",
};

export const evaluationCategoryLabels: Record<EvaluationCategory, string> = {
  RIGHTS: "권리성",
  TECHNOLOGY: "기술성",
  MARKET: "시장성",
  BUSINESS_ALIGNMENT: "사업 연계성",
};

export const REVIEW_WORKFLOW_FILTER_OPTIONS = [
  "ALL",
  ...REVIEW_WORKFLOW_STATUSES,
] as const;

export type ReviewWorkflowFilter = (typeof REVIEW_WORKFLOW_FILTER_OPTIONS)[number];

export const REVIEW_WORKFLOW_PROGRESS_STATUSES = [
  "REVIEW_QUARTER_STARTED",
  "MAIL_READY",
  "WAITING_BUSINESS_RESPONSE",
  "BUSINESS_RESPONSE_RECEIVED",
  "WAITING_EXECUTIVE_APPROVAL",
  "APPROVAL_COMPLETED",
  "LEGAL_ACTION_RECORDED",
] as const satisfies readonly ReviewWorkflowStatus[];

export const workflowStageActions: Record<ReviewWorkflowStatus, string> = {
  NOT_IN_REVIEW_QUARTER: "대상 제외",
  REVIEW_QUARTER_STARTED: "검토 시작",
  REPORT_GENERATED: "발송 준비",
  MAIL_READY: "메일 발송",
  WAITING_BUSINESS_RESPONSE: "사업부 확인",
  BUSINESS_RESPONSE_RECEIVED: "결과 입력",
  WAITING_EXECUTIVE_APPROVAL: "승인 대기",
  APPROVAL_COMPLETED: "승인 완료",
  LEGAL_ACTION_RECORDED: "종료",
};

export const workflowBottleneckDescriptions: Record<ReviewWorkflowStatus, string> = {
  NOT_IN_REVIEW_QUARTER: "이번 분기 검토 대상이 아닙니다.",
  REVIEW_QUARTER_STARTED: "검토 대상 확정 후 메일 발송 준비가 필요합니다.",
  REPORT_GENERATED: "AI 레포트 생성 후 발송 준비 단계로 넘겨야 합니다.",
  MAIL_READY: "관리자가 사업부 검토 요청 메일을 발송해야 합니다.",
  WAITING_BUSINESS_RESPONSE: "사업부 회신 독려와 제출 여부 확인이 필요합니다.",
  BUSINESS_RESPONSE_RECEIVED: "제출된 사업부 의견을 확인하고 유지/포기/매각 처리 결과 입력이 필요합니다.",
  WAITING_EXECUTIVE_APPROVAL: "임원 승인 대기 중인 특허입니다.",
  APPROVAL_COMPLETED: "승인이 완료되어 법무 처리 결과 기록이 필요합니다.",
  LEGAL_ACTION_RECORDED: "이번 분기 처리 workflow가 완료되었습니다.",
};

export const workflowUrgencyRank: Record<ReviewWorkflowStatus, number> = {
  NOT_IN_REVIEW_QUARTER: 99,
  REVIEW_QUARTER_STARTED: 5,
  REPORT_GENERATED: 6,
  MAIL_READY: 1,
  WAITING_BUSINESS_RESPONSE: 2,
  BUSINESS_RESPONSE_RECEIVED: 4,
  WAITING_EXECUTIVE_APPROVAL: 3,
  APPROVAL_COMPLETED: 7,
  LEGAL_ACTION_RECORDED: 99,
};

export const reviewWorkflowTone: Record<ReviewWorkflowStatus, StatusTone> = {
  NOT_IN_REVIEW_QUARTER: "neutral",
  REVIEW_QUARTER_STARTED: "warning",
  REPORT_GENERATED: "neutral",
  MAIL_READY: "primary",
  WAITING_BUSINESS_RESPONSE: "warning",
  BUSINESS_RESPONSE_RECEIVED: "success",
  WAITING_EXECUTIVE_APPROVAL: "warning",
  APPROVAL_COMPLETED: "success",
  LEGAL_ACTION_RECORDED: "success",
};

export function getReviewWorkflowTone(status: ReviewWorkflowStatus) {
  return reviewWorkflowTone[status];
}
