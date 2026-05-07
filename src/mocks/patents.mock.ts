import type {
  AiEvaluationReport,
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

const demoAiEvaluationReports: Record<string, AiEvaluationReport> = {
  "P202405001-KR0": {
    evaluationId: "EVAL-P202405001-KR0",
    createdAt: "2026-05-01T09:00:00+09:00",
    recommendation: "MAINTAIN",
    recommendationText:
      "로보어드바이저 자산배분 엔진에 직접 연결 가능한 강화학습 기반 예측 기술로, 현재 제품 적용 가능성과 잔여 권리기간을 고려할 때 유지 권고가 타당합니다.",
    totalScore: 86,
    scores: [
      createScore(
        "RIGHTS",
        82,
        "단독 출원이며 자산배분 시스템과 방법 청구항이 함께 구성되어 서비스 구현 방어 범위가 비교적 명확합니다.",
      ),
      createScore(
        "TECHNOLOGY",
        88,
        "상품 트렌드 예측과 강화학습 기반 의사결정을 결합해 금융 AI 제품의 핵심 알고리즘 차별화 근거로 활용할 수 있습니다.",
      ),
      createScore(
        "MARKET",
        84,
        "로보어드바이저와 금융 상품 추천 시장에서 개인화 투자, 자동 리밸런싱 수요가 지속되어 사업 활용성이 높습니다.",
      ),
      createScore(
        "LIFECYCLE_ECONOMICS",
        90,
        "등록 초기 특허로 잔여 보호기간이 길고 유지 비용 대비 제품/제안서 차별화 효과가 큽니다.",
      ),
    ],
    missingInformation: ["실제 서비스 적용 모듈", "최근 1년 제안서 활용 여부"],
  },
  "P202307002-KR0": {
    evaluationId: "EVAL-P202307002-KR0",
    createdAt: "2026-05-02T09:00:00+09:00",
    recommendation: "MAINTAIN",
    recommendationText:
      "ChainZ 합의 성능 개선과 직접 관련된 서명 검증 최적화 특허입니다. 블록체인 플랫폼의 처리량 개선 근거로 활용 가능해 유지 권고합니다.",
    totalScore: 83,
    scores: [
      createScore(
        "RIGHTS",
        79,
        "합의 과정의 서명 검증 절차를 시스템 관점에서 보호하고 있어 플랫폼 내부 구현 방어에 활용 가능합니다.",
      ),
      createScore(
        "TECHNOLOGY",
        86,
        "블록체인 합의 병목인 검증 비용을 줄이는 기술로 ChainZ 성능 개선 설명과 연결성이 높습니다.",
      ),
      createScore(
        "MARKET",
        78,
        "엔터프라이즈 블록체인 수요는 제한적이나 인증, 추적, 정산 영역에서 성능 안정성 요구가 유지되고 있습니다.",
      ),
      createScore(
        "LIFECYCLE_ECONOMICS",
        88,
        "등록 초기 특허이며 플랫폼 핵심 성능 지표와 연결되어 유지 비용 대비 방어 가치가 있습니다.",
      ),
    ],
    missingInformation: ["ChainZ 현재 적용 여부", "외부 고객 PoC 활용 사례"],
  },
  "P202301010-KR0": {
    evaluationId: "EVAL-P202301010-KR0",
    createdAt: "2026-05-03T09:00:00+09:00",
    recommendation: "REVIEW_AGAIN",
    recommendationText:
      "CMP Pad 물류 관리 영역의 현장 적용성은 있으나 공동출원 특허이므로 권리 행사 조건과 현재 제품 활용 여부를 추가 확인한 뒤 유지 여부를 결정해야 합니다.",
    totalScore: 69,
    scores: [
      createScore(
        "RIGHTS",
        58,
        "공동출원인 플로소프트와의 권리 행사, 비용 분담, 처분 조건 확인이 필요합니다.",
      ),
      createScore(
        "TECHNOLOGY",
        74,
        "CMP Pad 물류 흐름 최적화라는 제조 현장 문제와 직접 연결되어 기술 적용성은 확인됩니다.",
      ),
      createScore(
        "MARKET",
        66,
        "반도체 제조 물류 자동화 수요는 있으나 내부 장비/고객 적용 범위 확인이 필요합니다.",
      ),
      createScore(
        "LIFECYCLE_ECONOMICS",
        78,
        "잔여 보호기간은 충분하지만 공동출원 관리 비용과 실제 사용 여부에 따라 경제성이 달라질 수 있습니다.",
      ),
    ],
    missingInformation: ["공동출원인 협의 조건", "CMP Pad 물류 시스템 현재 운영 여부", "유지 비용 분담 기준"],
  },
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
    aiEvaluationReport: getAiEvaluationReport(row, recommendation, index),
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

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 발표에서 바로 보여줄 수 있는 대표 특허의 작성 완료 AI 평가 레포트를 반환한다.
 */
function getAiEvaluationReport(row: SkaxPatentRow, recommendation: Recommendation, index: number): AiEvaluationReport {
  const demoReport = demoAiEvaluationReports[row.managementNumber];

  if (demoReport) {
    return demoReport;
  }

  return {
    evaluationId: `EVAL-${row.managementNumber}`,
    createdAt: getAiReportCreatedAt(index),
    recommendation,
    recommendationText: getRecommendationText(recommendation, row),
    totalScore: getTotalScore(recommendation, index),
    scores: getScores(row, recommendation, index),
    missingInformation: getMissingFields(row),
  };
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
