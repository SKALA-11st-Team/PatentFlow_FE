import type {
  BusinessOpinionDecision,
  EvaluationCategory,
  ExecutiveApprovalDecision,
  LegalActionResult,
  PatentDetail,
  PatentHistoryItem,
  PatentListItem,
  Recommendation,
  ReviewWorkflowStatus,
} from "../types/patent";
import { getNextAnnualFeeDueDate } from "../utils/annualFee";
import { skaxPatentRows, type SkaxPatentRow } from "./skaxPatents.raw";

// Patent metadata is based on docs/skax_patents_list.md.
// Evaluation, opinion, summary, and workflow values are demo mock data layered on top.

const reviewTargetWorkflowCycle: ReviewWorkflowStatus[] = [
  "REVIEW_QUARTER_STARTED",
  "REPORT_GENERATED",
  "MAIL_READY",
  "WAITING_BUSINESS_RESPONSE",
  "BUSINESS_RESPONSE_RECEIVED",
  "LEGAL_ACTION_RECORDED",
];

const businessAreaDepartmentMap: Record<string, { id: string; name: string }> = {
  AI: { id: "DEPT-AI", name: "AI 사업부" },
  Blockchain: { id: "DEPT-CHAIN", name: "Blockchain 사업부" },
  Data: { id: "DEPT-DATA", name: "Data 사업부" },
  ESG: { id: "DEPT-ESG", name: "ESG 사업부" },
  "금융/전략": { id: "DEPT-FIN", name: "금융/전략 사업부" },
  기존사업: { id: "DEPT-LEGACY", name: "기존사업 담당" },
  솔루션: { id: "DEPT-SOLUTION", name: "솔루션 사업부" },
  제조: { id: "DEPT-MFG", name: "제조 사업부" },
  통신: { id: "DEPT-COMM", name: "통신 사업부" },
};

export const patentDetails: PatentDetail[] = skaxPatentRows.map((row, index) =>
  createPatentDetail(row, index),
);

export const patents: PatentListItem[] = patentDetails.map(
  ({
    patentId,
    managementNumber,
    applicationNumber,
    registrationNumber,
    title,
    draftTitle,
    businessArea,
    technologyArea,
    productName,
    country,
    coApplicants,
    applicationDate,
    registrationDate,
    expectedExpirationDate,
    departmentId,
    departmentName,
    lifecycleStatus,
    reviewWorkflowStatus,
    annualFeeDueDate,
    reviewReason,
    currentRecommendation,
    businessOpinionDecision,
    executiveApprovalDecision,
    legalActionResult,
  }) => ({
    patentId,
    managementNumber,
    applicationNumber,
    registrationNumber,
    title,
    draftTitle,
    businessArea,
    technologyArea,
    productName,
    country,
    coApplicants,
    applicationDate,
    registrationDate,
    expectedExpirationDate,
    departmentId,
    departmentName,
    lifecycleStatus,
    reviewWorkflowStatus,
    annualFeeDueDate,
    reviewReason,
    currentRecommendation,
    businessOpinionDecision,
    executiveApprovalDecision,
    legalActionResult,
  }),
);

export const patentHistory: Record<string, PatentHistoryItem[]> = Object.fromEntries(
  patentDetails.map((patent) => [patent.patentId, createHistory(patent)]),
);

function createPatentDetail(row: SkaxPatentRow, index: number): PatentDetail {
  const department = getDepartment(row.businessArea);
  const reviewWorkflowStatus = getMockReviewWorkflowStatus(index);
  const recommendation = getRecommendation(row, reviewWorkflowStatus, index);
  const businessOpinionDecision = getBusinessOpinion(reviewWorkflowStatus, recommendation);
  const legalActionResult = getLegalActionResult(reviewWorkflowStatus, recommendation);
  const executiveApprovalDecision = getExecutiveApprovalDecision(legalActionResult);
  const annualFeeDueDate = getMockDeadlineDate(row.registrationDate, reviewWorkflowStatus, index);
  const productName = normalizeProductName(row.productName);

  return {
    patentId: row.managementNumber,
    managementNumber: row.managementNumber,
    applicationNumber: row.applicationNumber,
    registrationNumber: row.registrationNumber,
    title: row.title || row.draftTitle || row.managementNumber,
    draftTitle: row.draftTitle || row.title || row.managementNumber,
    businessArea: row.businessArea || "N/A",
    technologyArea: row.technologyArea || "N/A",
    productName,
    country: row.country || "N/A",
    coApplicants: row.coApplicants,
    applicationDate: row.applicationDate,
    registrationDate: row.registrationDate,
    expectedExpirationDate: row.expectedExpirationDate,
    departmentId: department.id,
    departmentName: department.name,
    lifecycleStatus: legalActionResult === "SOLD" ? "SOLD" : legalActionResult === "ABANDONED" ? "ABANDONED" : "ACTIVE",
    reviewWorkflowStatus,
    annualFeeDueDate,
    reviewReason: getReviewReason(reviewWorkflowStatus, annualFeeDueDate),
    currentRecommendation: recommendation,
    businessOpinionDecision,
    executiveApprovalDecision,
    legalActionResult,
    summary: {
      summaryText: `${row.title || row.draftTitle}은(는) ${row.businessArea || "미분류"} 분야의 ${row.technologyArea || "관련 기술"} 특허입니다. ${productName ? `관련 제품은 ${productName}입니다.` : "관련 제품 정보는 비어 있습니다."}`,
      problemSolved: `${row.technologyArea || "해당 기술"} 영역에서 ${productName || "관련 제품"}의 운영, 성능, 관리 효율을 높이기 위한 문제를 다룹니다.`,
      coreTechnicalPoints: [
        row.technologyArea || "관련 기술",
        productName ? `${productName} 적용 가능성` : "제품 적용 여부 확인 필요",
        row.isJointApplication ? "공동출원 권리 관계 확인 필요" : "단독 출원 특허",
      ],
      claimsSummary: `${row.title || row.draftTitle}의 시스템 또는 방법 구성을 중심으로 권리를 주장합니다.`,
      missingFields: getMissingFields(row),
    },
    aiEvaluationReport: {
      evaluationId: `EVAL-${row.managementNumber}`,
      createdAt: getAiReportCreatedAt(index),
      recommendation,
      recommendationText: getRecommendationText(recommendation, row),
      totalScore: getTotalScore(recommendation, index),
      scores: getScores(row, recommendation, index),
      missingInformation: getMissingFields(row),
    },
    finalDecisionRecord: {
      decisionId: legalActionResult ? `DEC-${row.managementNumber}` : null,
      decision: executiveApprovalDecision,
      reason: legalActionResult ? `${getLegalActionText(legalActionResult)} 결과가 데모 데이터로 입력되었습니다.` : null,
      decidedAt: legalActionResult ? "2026-05-01T11:10:00+09:00" : null,
    },
    businessOpinion: {
      opinion: businessOpinionDecision,
      comment: businessOpinionDecision
        ? `${department.name}에서 ${businessOpinionDecision === "MAINTAIN" ? "유지" : "포기"} 의견을 제출했습니다.`
        : `${department.name} 의견 대기 중입니다.`,
      submittedAt: businessOpinionDecision ? "2026-05-01T14:20:00+09:00" : null,
    },
  };
}

function getExecutiveApprovalDecision(legalActionResult: LegalActionResult | null): ExecutiveApprovalDecision | null {
  if (legalActionResult === "ABANDONED") {
    return "APPROVED_ABANDON";
  }
  if (legalActionResult === "SOLD") {
    return "APPROVED_SELL";
  }
  if (legalActionResult === "MAINTAINED") {
    return "APPROVED_MAINTAIN";
  }
  return null;
}

function normalizeProductName(productName: string) {
  return productName && productName !== "해당사항없음" ? productName : "";
}

function getMockReviewWorkflowStatus(index: number): ReviewWorkflowStatus {
  if (index === 0 || index % 4 !== 0) {
    return "NOT_IN_REVIEW_QUARTER";
  }

  const reviewTargetIndex = Math.floor(index / 4) - 1;
  return reviewTargetWorkflowCycle[reviewTargetIndex % reviewTargetWorkflowCycle.length];
}

/**
 * @relatedFR FR-001, FR-009
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-BUS-01, UI-BUS-02
 * @description 검토 workflow 대상 특허의 데모 마감 기한은 중간발표 시점에 가까운 날짜로 보정한다.
 */
function getMockDeadlineDate(registrationDate: string, status: ReviewWorkflowStatus, index: number) {
  if (status === "NOT_IN_REVIEW_QUARTER") {
    return getNextAnnualFeeDueDate(registrationDate);
  }

  const day = 8 + ((Math.floor(index / 4) * 3) % 45);
  const deadline = new Date(2026, 4, day);

  return formatMockDate(deadline);
}

function getDepartment(businessArea: string) {
  return businessAreaDepartmentMap[businessArea] ?? { id: "DEPT-ETC", name: `${businessArea || "미분류"} 담당` };
}

function getReviewReason(status: ReviewWorkflowStatus, annualFeeDueDate: string) {
  const reasonMap: Record<ReviewWorkflowStatus, string> = {
    NOT_IN_REVIEW_QUARTER: "이번 분기 연차료 납부 대상이 아닙니다.",
    REVIEW_QUARTER_STARTED: `이번 분기 연차료 납부 대상이며 납부 기한은 ${annualFeeDueDate}입니다.`,
    REPORT_GENERATED: "이번 분기 납부 대상이며 AI 특허 평가 레포트가 생성되었습니다.",
    MAIL_READY: "AI 특허 평가 레포트가 생성되었고 관리자 메일 발송 명령이 필요합니다.",
    WAITING_BUSINESS_RESPONSE: "메일과 레포트를 발송했고 사업부서 담당자의 응답을 기다리고 있습니다.",
    BUSINESS_RESPONSE_RECEIVED: "사업부서 담당자의 응답이 제출되어 최종 처리 결과 입력이 필요합니다.",
    WAITING_EXECUTIVE_APPROVAL: "사업부 의견이 제출되어 임원 승인 대기 중입니다.",
    APPROVAL_COMPLETED: "임원 승인이 완료되어 법무 처리 결과 기록이 필요합니다.",
    LEGAL_ACTION_RECORDED: "최종 처리 결과가 입력되어 이번 검토 workflow가 완료되었습니다.",
  };
  return reasonMap[status];
}

function getRecommendation(row: SkaxPatentRow, status: ReviewWorkflowStatus, index: number): Recommendation {
  if (status === "LEGAL_ACTION_RECORDED" && index % 3 === 0) {
    return "SALES_CANDIDATE";
  }

  if (!row.productName || row.productName === "해당사항없음") {
    return "REVIEW_AGAIN";
  }

  if (row.businessArea === "기존사업" && index % 4 === 0) {
    return "ABANDON";
  }

  if (row.isJointApplication && index % 2 === 0) {
    return "REVIEW_AGAIN";
  }

  return "MAINTAIN";
}

function getBusinessOpinion(
  status: ReviewWorkflowStatus,
  recommendation: Recommendation,
): BusinessOpinionDecision | null {
  const respondedStatuses: ReviewWorkflowStatus[] = [
    "BUSINESS_RESPONSE_RECEIVED",
    "LEGAL_ACTION_RECORDED",
  ];

  if (!respondedStatuses.includes(status)) {
    return null;
  }

  return recommendation === "ABANDON" || recommendation === "SALES_CANDIDATE" ? "ABANDON" : "MAINTAIN";
}

function getLegalActionResult(
  status: ReviewWorkflowStatus,
  recommendation: Recommendation,
): LegalActionResult | null {
  if (status !== "LEGAL_ACTION_RECORDED") {
    return null;
  }

  if (recommendation === "SALES_CANDIDATE") {
    return "SOLD";
  }

  if (recommendation === "ABANDON") {
    return "ABANDONED";
  }

  return "MAINTAINED";
}

function getMissingFields(row: SkaxPatentRow) {
  const fields = ["현재 제품 적용 여부", "사업부 활용 계획"];

  if (!row.productName || row.productName === "해당사항없음") {
    fields.push("관련제품 정보");
  }

  if (row.isJointApplication) {
    fields.push("공동출원인 협의 조건");
  }

  return fields;
}

function getRecommendationText(recommendation: Recommendation, row: SkaxPatentRow) {
  const productText = normalizeProductName(row.productName) || "관련 제품";
  const textMap: Record<Recommendation, string> = {
    MAINTAIN: `${productText} 관련 기술성, 권리성, 유지 비용 대비 가치가 확인되어 유지 권고가 타당한 AI 특허 평가 레포트입니다.`,
    REVIEW_AGAIN: "권리성, 기술성, 시장성, 라이프사이클 경제성 중 일부 근거 보완이 필요한 AI 특허 평가 레포트입니다.",
    ABANDON: "권리성 또는 라이프사이클 경제성 보완 근거가 부족해 포기 검토가 가능한 AI 특허 평가 레포트입니다.",
    SALES_CANDIDATE: "현재 내부 활용도는 낮고 유지 필요성이 부족해 포기 검토가 필요한 AI 특허 평가 레포트입니다.",
    HOLD: "권리성, 시장성, 라이프사이클 경제성 일부 정보가 부족해 추가 정보 확인이 필요한 AI 특허 평가 레포트입니다.",
  };

  return textMap[recommendation];
}

function getAiReportCreatedAt(index: number) {
  const day = 1 + (index % 5);

  return `2026-05-${String(day).padStart(2, "0")}T09:00:00+09:00`;
}

function getTotalScore(recommendation: Recommendation, index: number) {
  const baseScore: Record<Recommendation, number> = {
    MAINTAIN: 82,
    REVIEW_AGAIN: 68,
    ABANDON: 45,
    SALES_CANDIDATE: 52,
    HOLD: 60,
  };

  return Math.min(95, baseScore[recommendation] + (index % 7));
}

function getScores(row: SkaxPatentRow, recommendation: Recommendation, index: number) {
  const rightsScore = row.isJointApplication ? 58 : recommendation === "ABANDON" ? 52 : 76 + (index % 8);
  const technologyScore = recommendation === "MAINTAIN" ? 82 : recommendation === "ABANDON" ? 48 : 68;
  const marketScore = recommendation === "SALES_CANDIDATE" ? 74 : 62 + (index % 14);
  const lifecycleScore = recommendation === "ABANDON" ? 44 : recommendation === "REVIEW_AGAIN" ? 61 : 72 + (index % 9);

  return [
    createScore(
      "RIGHTS",
      rightsScore,
      row.isJointApplication
        ? "공동출원 관계로 권리 행사 조건과 법적 안정성 확인이 필요합니다."
        : "청구항 기반 보호 범위와 권리 안정성은 기본 검토 가능한 수준입니다.",
    ),
    createScore(
      "TECHNOLOGY",
      technologyScore,
      `${row.technologyArea || "관련 기술"} 분야의 기술 영향력과 구현 가능성을 함께 검토했습니다.`,
    ),
    createScore(
      "MARKET",
      marketScore,
      `${row.businessArea || "미분류"} 분야의 시장 범위, 경쟁 활동, 산업 트렌드 확인이 필요합니다.`,
    ),
    createScore(
      "LIFECYCLE_ECONOMICS",
      lifecycleScore,
      "잔여 보호 기간, 유지 비용, 경제적 효과를 기준으로 비용 대비 가치를 산정했습니다.",
    ),
  ];
}

function createScore(category: EvaluationCategory, score: number | null, evidenceSummary: string) {
  return { category, score, evidenceSummary };
}

function getLegalActionText(result: LegalActionResult) {
  const textMap: Record<LegalActionResult, string> = {
    MAINTAINED: "유지 처리",
    ABANDONED: "포기 처리",
    SOLD: "매각 처리",
  };

  return textMap[result];
}

function formatMockDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createHistory(patent: PatentDetail): PatentHistoryItem[] {
  const history: PatentHistoryItem[] = [];

  if (patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER") {
    history.push({
      historyId: `HIST-${patent.patentId}-REPORT`,
      type: "AI_EVALUATION_CREATED",
      title: "AI 특허 평가 레포트 생성",
      description: "이번 분기 연차료 검토를 위한 평가 레포트가 생성되었습니다.",
      actorName: "AI Evaluation Service",
      createdAt: "2026-05-01T09:00:00+09:00",
    });
  }

  if (patent.businessOpinionDecision) {
    history.push({
      historyId: `HIST-${patent.patentId}-OPINION`,
      type: "BUSINESS_OPINION_SUBMITTED",
      title: "사업부 의견 제출",
      description: `${patent.departmentName}에서 ${patent.businessOpinionDecision === "MAINTAIN" ? "유지" : "포기"} 의견을 제출했습니다.`,
      actorName: patent.departmentName,
      createdAt: "2026-05-01T14:20:00+09:00",
    });
  }

  if (patent.legalActionResult) {
    history.push({
      historyId: `HIST-${patent.patentId}-ACTION`,
      type: "HUMAN_DECISION_UPDATED",
      title: "법적 액션 결과 입력",
      description: `${getLegalActionText(patent.legalActionResult)} 결과가 입력되었습니다.`,
      actorName: "관리자",
      createdAt: "2026-05-01T17:30:00+09:00",
    });
  }

  return history;
}
