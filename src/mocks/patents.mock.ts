/**
 * @relatedFR FR-001, FR-002, FR-005, FR-006, FR-007, FR-008, FR-009, FR-011, FR-012, FR-013, FR-017
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-05, UI-LEGAL-07, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05
 * @description docs 기반 특허 메타데이터에 발표용 AI 평가 레포트, workflow, 의견/판단 mock 데이터를 결합한다.
 */
import type {
  AiEvaluationReport,
  BusinessOpinionDecision,
  EvaluationEvidenceDetail,
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
import { aiReportsByManagementNumber, patentSummariesByManagementNumber } from "./aiReports.mock";
import { skaxPatentRows, type SkaxPatentRow } from "./skaxPatents.raw";

// Patent metadata is based on docs/skax_patents_list.md.
// Evaluation, opinion, summary, and workflow values are demo mock data layered on top.

const reviewTargetWorkflowCycle: ReviewWorkflowStatus[] = [
  "REVIEW_QUARTER_STARTED",
  "REPORT_GENERATED",
  "MAIL_READY",
  "BUSINESS_RESPONSE_RECEIVED",
  "WAITING_EXECUTIVE_APPROVAL",
  "APPROVAL_COMPLETED",
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
    createdAt: "2026-05-08T09:00:00+09:00",
    recommendation: "REVIEW_AGAIN",
    recommendationText:
      '종합적으로 권리·기술·시장성은 대체로 긍정적이나, 포트폴리오 연계·구체적 구현·상용화 성과 등 핵심 정보의 부재로 인해 추가 확인이 필요하므로 "조건부 유지" 권고입니다.',
    totalScore: 359,
    totalScoreText: "359/500점, 평균 71.8점",
    averageScore: 71.8,
    keyEvidence:
      "권리성·기술성은 액터-크리틱 구조와 기간별 리워드 가중결합의 구체적 절차가 기재되어 비교적 명확한 보호 가능성을 보이며, 시장 흐름은 강화학습 기반 자산배분과 로보어드바이저 수요 확대를 뒷받침합니다. 다만 종속항 전문·심사이력·구체적 가중비율 산식·실증 데이터·내부 적용 계획 등 핵심 정보의 부재로 상용화 가능성·경제성 판단에는 추가 확인이 필요합니다.",
    judgementGrounds: [
      "권리·기술 측면에서 발명의 개념과 구성(액터-크리틱 복수 크리틱, 운용기간별 리워드 반영비율 조정)은 명시되어 있어 특허의 보호 대상과 적용 아이디어가 분명합니다. 다만 종속항·심사 보정 내역·가중비율 산식 등 세부 구현 정보 부재로 권리범위 해석과 침해·회피 가능성 평가에는 불확실성이 존재합니다.",
      "기술적으로는 설계 아이디어가 실무 적용 가능성을 제시하나, 학습데이터·하이퍼파라미터·백테스트 같은 실증 근거가 없어 성능 우위·운영비용·리스크(예: 레짐 전환 시 일반화성)를 확정하기 어렵습니다.",
      "시장·사업 관점에서는 로보어드바이저·자산배분 자동화에 대한 수요와 강화학습 관심이 확인되어 상업화 기회가 존재합니다. 다만 외부 근거는 산업 흐름을 보여줄 뿐 본 발명의 특정 가중조정 방식의 채택·성과를 직접 입증하지 못하므로 실제 채택 가능성은 추가 검증이 필요합니다.",
      "경제성 관점에서는 장기간의 보호기간(2044년까지)과 업계 수요 확대가 유지의 실익을 뒷받침합니다. 그러나 내부 적용 계획·수익모델·연차료 등 정량적 경제성 자료 부재로 비용 대비 기대가 불명확합니다.",
    ],
    scores: [
      createScore(
        "RIGHTS",
        74,
        "점수/등급: 74 / B",
        [
          { text: "대표 청구항은 액터-크리틱 구조와 크리틱의 상품별·자산군별 평균수익률 및 변동성 예측을 통한 리워드 제공, 운용기간에 따른 리워드 가중결합 절차를 구체적으로 기재하고 있어 권리의 기술적 구성과 보호대상이 비교적 명확합니다." },
          { text: "시스템 청구항(등록된 독립항)과 방법 청구항을 모두 확보하고 있어 실시형태별 권리 확보에 유리한 측면이 있습니다." },
          { text: "청구항 수가 총 6개(독립항 2개, 종속항 4개)로 상대적으로 축소되어 있고 심사 과정에서 삭제된 청구항 기록이 있어(삭제 내역 상세 불명) 권리범위가 일부 좁혀졌을 가능성이 있습니다." },
          { text: "가중비율 산정의 구체적 수식·파라미터가 청구항에 상세하지 않아 권리범위 해석상 모호성이 발생할 위험이 있습니다." },
          { text: "종속항 전문과 심사이력의 상세 내용이 제공되지 않아 포트폴리오 차원의 권리 강화 가능성 평가 및 보강 방안 도출에 추가 확인이 필요합니다." },
        ],
      ),
      createScore(
        "TECHNOLOGY",
        75,
        "점수/등급: 75 / B",
        [
          { text: "문제정의(예측오류에 따른 노이즈 및 기간별 트렌드 반영 미흡)와 해결 아이디어(복수 크리틱의 지도학습 예측값을 운용기간에 따라 가중결합)는 기술적 논리·구성이 명확하게 제시되어 기술적 구체성이 높습니다." },
          { text: "복수 크리틱, 운용기간별 대표값 산출, 리워드 반영비율의 반복적 최적화 같은 구성은 실제 적용 가능성을 지원하는 설계 요소로 보입니다." },
          { text: "구현 관련(학습데이터, 입력 피처, 모델 아키텍처, 하이퍼파라미터 등) 세부 정보가 제공되지 않아 성능 우위나 운영 특성(추론 비용·실시간성 등)을 확정하기 어려워 추가 검증이 필요합니다。" },
          { text: "크리틱 예측 품질에 따른 액터 성능 의존성, 레짐 전환 등 시장 변화에 대한 일반화·강건성 불확실성 등 운영 리스크가 존재합니다。" },
          { text: "백테스트·실증 자료 부재로 실무 적용을 위한 튜닝 노력(파라미터·보상 설계) 범위와 비용을 추정하기 어려워 파일럿 검증이 적절합니다。" },
        ],
      ),
      createScore(
        "MARKET",
        75,
        "점수/등급: 75 / B",
        [
          {
            text: "강화학습 기반 자산배분이 백테스트에서 유의한 위험조정 성과와 동적 자산비중 조정 능력을 보였다는 시장 리포트는 기술의 업계 적용 가능성을 지지합니다.",
            source: {
              title: "자료: AI 강화학습, 자산관리 '새 지평', 2026-03-10",
              url: "http://www.ftoday.co.kr/news/articleView.html?idxno=356248",
            },
          },
          {
            text: "로보어드바이저·ISA 등 자산관리 플랫폼에서 자동화된 자산배분 서비스의 고객자산 증가 사례는 관련 기술 수요의 상업적 기회를 시사합니다. 다만 해당 보도는 플랫폼 확대를 보여줄 뿐 본 발명의 특정 가중조정 방식의 채택·성과를 직접 입증하지 않습니다.",
            source: {
              title: "자료: \"3개월에 5조 '쑥'\\\"…미래에셋증권, ISA 고객자산 15조 돌파, 2026-05-07",
              url: "https://www.dailian.co.kr/news/view/1641648/?sc=Naver",
            },
          },
          {
            text: "금융권의 디지털·자산관리·투자 플랫폼 고도화 및 포트폴리오 구조 설계 중심 전략 전환은 대상 특허가 제공하는 기간별 리워드 반영 방식의 시장 적합성을 뒷받침합니다. 다만 산업 동향 근거는 전반적 수요를 보여주는 참고자료로서 대상 특허의 직접적 도입 사례를 입증하지는 않습니다.",
            source: {
              title: "자료: [서울타임즈뉴스] 금융·증권업계, 디지털·포용·자산관리 전략 강화, 2026-03-19",
              url: "https://www.seoultimes.news/news/article.html?no=2000093875",
            },
          },
        ],
      ),
      createScore(
        "LIFECYCLE_ECONOMICS",
        70,
        "점수/등급: 70 / B",
        [
          { text: "등록일(2026-02-25) 기준으로 예상 소멸일(2044-08-28)까지 장기간의 보호기간을 보유하고 있어 장기 유지 시 가치 실현의 시간이 충분합니다." },
          { text: "시장 측면에서 로보어드바이저·강화학습 기반 자산배분 수요 확대는 경제적 수익화 가능성을 지지하나, 본 특허의 구체적 기능 채택 사례·라이선스·내부 적용 계획이 부재하여 실제 수익화 가능성은 불확실합니다." },
          { text: "특허의 권리범위가 상대적으로 축소된 점과 알고리즘적 기능이 플랫폼에 통합될 경우 개별 특허의 상업적 가치가 희석될 가능성은 경제성 리스크로 작용합니다." },
          { text: "연차료·유지비용 추정치, 예상 ROI·내부 매출 연계 자료가 없으므로 비용 대비 기대수익 분석을 수행할 수 없어 보수적 유지 판단이 필요합니다。" },
        ],
      ),
    ],
    missingInformation: [
      "종속항 전문",
      "심사 보정 이력 상세",
      "가중비율 산식·파라미터",
      "백테스트·실증 데이터",
      "내부 적용 계획",
      "연차료·유지비용 추정치",
    ],
    businessCheckRequests: [
      "대상 특허 기술을 현재 운영 중인 로보어드바이저 또는 내부 자산배분 프로토타입에 적용한 파일럿·테스트 사례(있다면 백테스트·실거래 성과 지표 포함)를 확인 후 최종 검토가 필요합니다。",
      "해당 기술을 적용했을 때 예상되는 구현 난이도(데이터 확보·전처리 요구사항, 학습·추론 비용, 운영 인력 소요)와 예상 연차료·유지비용을 비교한 비용·편익 관점의 평가를 확인 후 최종 검토가 필요합니다。",
      "동일 포트폴리오 내 유사·보완 특허의 존재 여부 및 각 특허와의 기능적 중복·보완 관계(포트폴리오 차원의 활용계획 포함)를 확인 후 최종 검토가 필요합니다。",
    ],
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
  const generatedReport = aiReportsByManagementNumber[row.managementNumber];
  const generatedSummary = patentSummariesByManagementNumber[row.managementNumber];
  const reviewWorkflowStatus = getMockReviewWorkflowStatus(index, Boolean(generatedReport));
  const recommendation = generatedReport?.recommendation ?? getRecommendation(row, reviewWorkflowStatus, index);
  const businessOpinionDecision = getBusinessOpinion(reviewWorkflowStatus, recommendation);
  const legalActionResult = getLegalActionResult(reviewWorkflowStatus, recommendation);
  const executiveApprovalDecision = getExecutiveApprovalDecision(legalActionResult);
  const annualFeeDueDate = getMockDeadlineDate(row.registrationDate, reviewWorkflowStatus, index);
  const title = normalizeDisplayText(row.title || row.draftTitle || row.managementNumber);
  const draftTitle = normalizeDisplayText(row.draftTitle || row.title || row.managementNumber);
  const businessArea = normalizeDisplayText(row.businessArea || "N/A");
  const technologyArea = normalizeDisplayText(row.technologyArea || "N/A");
  const productName = normalizeProductName(row.productName);
  const coApplicants = normalizeDisplayText(row.coApplicants);

  return {
    patentId: row.managementNumber,
    managementNumber: row.managementNumber,
    applicationNumber: row.applicationNumber,
    registrationNumber: row.registrationNumber,
    title,
    draftTitle,
    businessArea,
    technologyArea,
    productName,
    country: row.country || "N/A",
    coApplicants,
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
    summary: generatedSummary ?? {
      summaryText: `${title}은(는) ${businessArea} 분야의 ${technologyArea} 특허입니다. ${productName ? `관련 제품은 ${productName}입니다.` : "관련 제품 정보는 비어 있습니다."}`,
      problemSolved: `${technologyArea} 영역에서 ${productName || "관련 제품"}의 운영, 성능, 관리 효율을 높이기 위한 문제를 다룹니다.`,
      coreTechnicalPoints: [
        technologyArea,
        productName ? `${productName} 적용 가능성` : "제품 적용 여부 확인 필요",
        row.isJointApplication ? "공동출원 권리 관계 확인 필요" : "단독 출원 특허",
      ],
      claimsSummary: `${title}의 시스템 또는 방법 구성을 중심으로 권리를 주장합니다.`,
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
  const normalizedProductName = normalizeDisplayText(productName);

  return normalizedProductName && normalizedProductName !== "해당사항없음" ? normalizedProductName : "";
}

/**
 * @relatedFR FR-001, FR-005
 * @relatedUI UI-LEGAL-01, UI-LEGAL-05, UI-BUS-03
 * @description 원천 특허 목록에 섞인 전각 영문/숫자/괄호와 중복 공백을 화면 표시용 문자열로 정규화한다.
 */
function normalizeDisplayText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function getMockReviewWorkflowStatus(index: number, hasGeneratedReport = false): ReviewWorkflowStatus {
  if (hasGeneratedReport) {
    return "WAITING_BUSINESS_RESPONSE";
  }

  if (index % 4 !== 0) {
    return "NOT_IN_REVIEW_QUARTER";
  }

  const reviewTargetIndex = Math.floor(index / 4) - 1;
  return reviewTargetWorkflowCycle[Math.max(0, reviewTargetIndex) % reviewTargetWorkflowCycle.length];
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
  const generatedReport = aiReportsByManagementNumber[row.managementNumber];

  if (generatedReport) {
    return generatedReport;
  }

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

function createScore(
  category: EvaluationCategory,
  score: number | null,
  evidenceSummary: string,
  evidenceDetails?: EvaluationEvidenceDetail[],
) {
  return { category, evidenceDetails, evidenceSummary, score };
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
