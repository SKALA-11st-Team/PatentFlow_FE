import type {
  BusinessOpinionDecision,
  EvaluationCategory,
  ExecutiveApprovalDecision,
  LegalActionResult,
  PatentLifecycleStatus,
  Recommendation,
  ReviewWorkflowStatus,
} from "../constants/status";

export type {
  BusinessOpinionDecision,
  EvaluationCategory,
  ExecutiveApprovalDecision,
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
  annualFeeDueDate: string;
  reviewReason: string;
  currentRecommendation: Recommendation;
  businessOpinionDecision: BusinessOpinionDecision | null;
  executiveApprovalDecision: ExecutiveApprovalDecision | null;
  legalActionResult: LegalActionResult | null;
}

export interface PatentSummary {
  summaryText: string;
  problemSolved: string;
  coreTechnicalPoints: string[];
  claimsSummary: string;
  missingFields: string[];
}

export interface EvaluationScore {
  category: EvaluationCategory;
  score: number | null;
  evidenceSummary: string;
}

export interface AiEvaluationReport {
  evaluationId: string;
  createdAt: string;
  recommendation: Recommendation;
  recommendationText: string;
  totalScore: number;
  scores: EvaluationScore[];
  missingInformation: string[];
}

export interface FinalDecisionRecord {
  decisionId: string | null;
  decision: LegalActionResult | null;
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
  type: "AI_EVALUATION_CREATED" | "BUSINESS_OPINION_SUBMITTED" | "HUMAN_DECISION_UPDATED";
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
