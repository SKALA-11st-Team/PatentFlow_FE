/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-BUS-01, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-11, FR-LEGAL-15
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-04, UI-LEGAL-06, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05
 * @description 특허 목록, 상세, AI 평가 레포트, 사업부 의견, 최종 판단 화면 모델 타입
 */
import type {
  BusinessOpinionDecision,
  CoApplicantConsentStatus,
  EvaluationCategory,
  LegalActionResult,
  PatentLifecycleStatus,
  Recommendation,
  ReviewWorkflowStatus,
} from "../constants/status";

export type {
  BusinessOpinionDecision,
  EvaluationCategory,
  LegalActionResult,
  PatentLifecycleStatus,
  Recommendation,
  ReviewWorkflowStatus,
} from "../constants/status";

// I3: LEGAL — 검토 업무는 ADMIN과 동일, 운영(계정·설정)만 제한되는 역할.
export type UserRole = "ADMIN" | "LEGAL" | "BUSINESS";
export type AiReportReadinessStatus = "READY" | "FAILED" | "PENDING";

/** I3: 관리자형 역할 여부 — 라우팅·API 경로 선택에서 ADMIN과 동일하게 취급한다. */
export function isAdminLikeRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "LEGAL";
}

export interface PatentListItem {
  patentId: string;
  managementNumber: string;
  applicationNumber: string;
  registrationNumber: string | null;
  title: string;
  draftTitle: string;
  businessArea: string;
  technologyArea: string;
  productName: string;
  country: string;
  coApplicants: string;
  applicationDate: string;
  registrationDate: string;
  expectedExpirationDate: string;
  departmentId: string;
  departmentName: string;
  lifecycleStatus: PatentLifecycleStatus;
  reviewWorkflowStatus: ReviewWorkflowStatus;
  feeDueDate: string;
  reviewReason: string;
  currentRecommendation: Recommendation;
  businessOpinionDecision: BusinessOpinionDecision | null;
  legalActionResult: LegalActionResult | null;
  aiReportReadinessStatus?: AiReportReadinessStatus;
  aiReportFailureReason?: string | null;
  originalPatentUrl?: string | null;
}

export interface PatentSummary {
  summaryText: string;
  problemSolved: string;
  coreTechnicalPoints: string[];
  claimsSummary: string;
  missingFields: string[];
  // 데모 mock 데이터가 채우는 요약 원문 마크다운(선택). 실제 BE PatentSummaryResponse 는 이 필드를
  // 내보내지 않으므로 wire 매핑(mapBackendSummary)에서는 읽지 않는다. — CONTRACT-10
  rawMarkdown?: string;
}

export interface EvaluationScore {
  category: EvaluationCategory;
  score: number | null;
  grade?: string | null;
  evidenceSummary: string;
  evidenceDetails?: EvaluationEvidenceDetail[];
}

export interface EvaluationEvidenceDetail {
  text: string;
  // ORCH-06/AIREPORT-02: 산업 보고서 등 URL 없는 출처도 있어 url은 선택값이다(있으면 클릭형 링크).
  source?: {
    title: string;
    url?: string;
  };
}

export interface AiEvaluationReport {
  evaluationId: string;
  createdAt: string;
  recommendation: Recommendation;
  recommendationText: string;
  totalScore: number;
  totalScoreText?: string;
  averageScore?: number;
  finalGrade?: string | null;
  degraded?: boolean;
  failureReason?: string | null;
  // xcomp-be-agent-2: Agent 계약 신호(품질 경고·근거 신뢰도).
  warnings?: string[];
  evidenceConfidence?: string | null;
  keyEvidence?: string;
  judgementGrounds?: string[];
  scores: EvaluationScore[];
  missingInformation: string[];
  businessCheckRequests?: string[];
  externalSources?: {
    title: string;
    url?: string;
  }[];
  rawMarkdown?: string;
  markdownFilePath?: string;
  // ── 법무 편집 메타(FR-LEGAL-09). 값 필드들은 편집이 반영된 '유효' 값이다. ──
  edited?: boolean;
  editedBy?: string | null;
  editedAt?: string | null;
  // 낙관적 락 토큰 — 편집 PATCH의 expectedEditVersion으로 그대로 돌려보낸다(미편집 시 0).
  editVersion?: number;
  // 편집 이후 레포트가 재생성되어 편집 기준이 낡았는지(경고 표시용).
  editStale?: boolean;
  // 이 레포트 생성에 적용된 가치평가 기준(valuationConfig) 스냅샷.
  appliedCriteria?: Record<string, unknown> | null;
  // AIREPORT-RICH: 에이전트가 FE 렌더링용으로 구조화한 필드(BE가 풀스루).
  // 요약 카드(③): 한줄/문제/핵심아이디어/주요기술/작동단계/기대효과.
  summaryBrief?: AiSummaryBrief | null;
  // 보고서 섹션별 본문: evaluationScope·judgmentBasis·axisDetails·roleChecklist·finalOpinion.
  reportSections?: Partial<Record<ReportSectionKey, string>> | null;
}

// 에이전트 summaryBrief(요약 카드 ③) 구조. 모든 필드 결측 가능.
export interface AiSummaryBrief {
  one_line_summary?: string;
  problem?: string;
  core_idea?: string;
  key_components?: string[];
  operation_steps?: string[];
  expected_effect?: string;
}

// 보고서 섹션 키(④ 펼침 패널 / ⑤ 역할별 확인).
export type ReportSectionKey =
  | "evaluationScope"
  | "judgmentBasis"
  | "axisDetails"
  | "roleChecklist"
  | "finalOpinion";

/** 법무 편집 오버라이드 — 수정한 필드만 담는다(없는 필드는 AI 원본 유지). */
export interface AiReportScoreOverridePayload {
  category: EvaluationCategory;
  score?: number | null;
  grade?: string | null;
  evidenceSummary?: string | null;
}

export interface AiReportOverridesPayload {
  recommendation?: Recommendation;
  recommendationText?: string;
  keyEvidence?: string;
  judgementGrounds?: string[];
  businessCheckRequests?: string[];
  scores?: AiReportScoreOverridePayload[];
  rawMarkdown?: string;
}

export interface AiReportEditPayload {
  baseReportId: string;
  expectedEditVersion: number;
  overrides: AiReportOverridesPayload;
}

export type AiReportJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "DEGRADED";

export interface AiReportJob {
  jobId: string | null;
  patentId: string;
  status: AiReportJobStatus | null;
  requestedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
  reportId: string | null;
  // W1: RUNNING일 때 agent 진행 단계(근거 수집/압축/4축 평가/레포트 작성). 미지원이면 null.
  progressStage?: string | null;
  progressStageLabel?: string | null;
}

export interface FinalDecisionRecord {
  decisionId: string | null;
  reason: string | null;
  decidedAt: string | null;
}

export interface BusinessOpinion {
  opinion: BusinessOpinionDecision | null;
  comment: string | null;
  submittedAt: string | null;
}

// 공동출원 특허는 연차료 유지/포기 최종 판단 전 공동출원인 합의(AGREED)가 필요하다.
// CoApplicantConsentStatus 는 constants/status 에 정의(다른 상태 enum과 동일 패턴).
export interface CoApplicantConsent {
  status: CoApplicantConsentStatus;
  reason: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface PatentDetail extends PatentListItem {
  summary: PatentSummary;
  aiEvaluationReport: AiEvaluationReport;
  finalDecisionRecord: FinalDecisionRecord;
  businessOpinion: BusinessOpinion;
  // 공동출원 합의 게이트: jointApplication 이면 최종 판단 전 coApplicantConsent(AGREED) 필요.
  jointApplication?: boolean;
  coApplicantConsent?: CoApplicantConsent | null;
}

export interface PatentHistoryItem {
  historyId: string;
  type: string;
  title: string;
  description: string;
  actorName: string;
  createdAt: string;
}

export interface PatentBibliographicInfo {
  managementNumber: string;
  title: string;
  applicationDate: string;
  coApplicants: string;
  country: string;
  registrationDate: string;
  applicationNumber: string;
  registrationNumber: string | null;
  expectedExpirationDate: string;
  source: "KIPRIS" | "GOOGLE_PATENTS" | "CSV_IMPORT";
}

export interface PatentUpsertPayload extends PatentBibliographicInfo {
  businessArea: string;
  technologyArea: string;
  productName: string;
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-04, UI-BUS-02
 * FEE-06: 특허 상세 연차료 일정 — BE fee-schedule API가 국가 규칙(KR 일괄 납부, US 유지료)을
 * 단일 출처로 계산해 내려준다. FE는 표시만 담당한다.
 */
export interface FeeScheduleRecipient {
  departmentId: string;
  departmentName: string;
  managerName: string;
  managerEmail: string;
  ccEmails: string[];
}

export type FeeScheduleEntryStatus = "PAID_LUMP" | "PAST" | "NEXT" | "FUTURE";

export interface FeeScheduleEntry {
  yearLabel: string;
  yearNumber: number;
  lump: boolean;
  dueDate: string;
  reviewStartDate: string | null;
  status: FeeScheduleEntryStatus;
  adjusted: boolean;
  // F2: 납부 예상액(국가 요금표 기반 개략치) — 요금표 없는 국가는 null.
  estimatedAmount: number | null;
  currency: string | null;
}

export interface PatentFeeSchedule {
  patentId: string;
  country: string;
  basis: "APPLICATION_DATE" | "REGISTRATION_DATE";
  basisDate: string | null;
  paymentRuleLabel: string;
  initialLumpYears: number;
  mailLeadMonths: number;
  recipient: FeeScheduleRecipient | null;
  items: FeeScheduleEntry[];
}

/**
 * @relatedFR FR-LEGAL-13
 * MAIL-13: 특허 PDF 첨부 상태 — 법무팀 직접 업로드(UPLOADED, TW·UAE 등 KIPRIS 미지원 국가) 또는
 * KIPRIS S3 캐시(KIPRIS_S3). 등록/수정 화면의 업로드 위젯과 상세 화면의 다운로드 버튼이 사용한다.
 */
export interface PatentPdfMeta {
  patentId: string;
  exists: boolean;
  storageType: "UPLOADED" | "KIPRIS_S3" | null;
  docName: string | null;
  contentLength: number | null;
  uploadedBy: string | null;
  createdAt: string | null;
}
