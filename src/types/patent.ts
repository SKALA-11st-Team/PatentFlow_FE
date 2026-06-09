/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-BUS-01, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-11, FR-LEGAL-15
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-04, UI-LEGAL-06, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05
 * @description 특허 목록, 상세, AI 평가 레포트, 사업부 의견, 최종 판단 화면 모델 타입
 */
import type {
  BusinessOpinionDecision,
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

export type UserRole = "ADMIN" | "BUSINESS";

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
  originalPatentUrl?: string | null;
}

export interface PatentSummary {
  summaryText: string;
  problemSolved: string;
  coreTechnicalPoints: string[];
  claimsSummary: string;
  missingFields: string[];
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
  finalIndicator?: string | null;
  degraded?: boolean;
  failureReason?: string | null;
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

export interface PatentDetail extends PatentListItem {
  summary: PatentSummary;
  aiEvaluationReport: AiEvaluationReport;
  finalDecisionRecord: FinalDecisionRecord;
  businessOpinion: BusinessOpinion;
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
  source: "KIPRIS" | "GOOGLE_PATENTS";
}

export interface PatentUpsertPayload extends PatentBibliographicInfo {
  businessArea: string;
  technologyArea: string;
  productName: string;
}
