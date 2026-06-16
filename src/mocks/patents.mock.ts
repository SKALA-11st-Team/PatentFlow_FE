/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-BUS-01, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-11, FR-LEGAL-15
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-04, UI-LEGAL-06, UI-BUS-01, UI-BUS-02, UI-BUS-03, UI-BUS-04, UI-BUS-05
 * @description docs 기반 특허 메타데이터에 발표용 AI 평가 레포트, workflow, 의견/판단 mock 데이터를 결합한다.
 */
import type {
  AiEvaluationReport,
  BusinessOpinionDecision,
  EvaluationEvidenceDetail,
  EvaluationCategory,
  LegalActionResult,
  PatentDetail,
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
  "MAIL_READY",
  "WAITING_BUSINESS_RESPONSE",
  "BUSINESS_RESPONSE_RECEIVED",
];


const demoAiEvaluationReports: Record<string, AiEvaluationReport> = {
  "P202405001-KR0": {
    evaluationId: "EVAL-P202405001-KR0",
    createdAt: "2026-05-08T09:00:00+09:00",
    recommendation: "REVIEW_AGAIN",
    recommendationText:
      '종합적으로 권리·기술·시장성은 대체로 긍정적이나, 포트폴리오 연계·구체적 구현·상용화 성과 등 핵심 정보의 부재로 인해 추가 확인이 필요하므로 "조건부 유지" 권고입니다.',
    totalScore: 289,
    totalScoreText: "289/400점, 평균 72.3점",
    averageScore: 72.3,
    keyEvidence:
      "권리성·기술성은 액터-크리틱 구조와 기간별 리워드 가중결합의 구체적 절차가 기재되어 비교적 명확한 보호 가능성을 보이며, 시장 흐름은 강화학습 기반 자산배분과 로보어드바이저 수요 확대를 뒷받침합니다. 다만 종속항 전문·심사이력·구체적 가중비율 산식·실증 데이터·내부 적용 계획 등 핵심 정보의 부재로 상용화 가능성·사업 적용성 판단에는 추가 확인이 필요합니다.",
    judgementGrounds: [
      "권리·기술 측면에서 발명의 개념과 구성(액터-크리틱 복수 크리틱, 운용기간별 리워드 반영비율 조정)은 명시되어 있어 특허의 보호 대상과 적용 아이디어가 분명합니다. 다만 종속항·심사 보정 내역·가중비율 산식 등 세부 구현 정보 부재로 권리범위 해석과 침해·회피 가능성 평가에는 불확실성이 존재합니다.",
      "기술적으로는 설계 아이디어가 실무 적용 가능성을 제시하나, 학습데이터·하이퍼파라미터·백테스트 같은 실증 근거가 없어 성능 우위·운영비용·리스크(예: 레짐 전환 시 일반화성)를 확정하기 어렵습니다.",
      "시장·사업 관점에서는 로보어드바이저·자산배분 자동화에 대한 수요와 강화학습 관심이 확인되어 상업화 기회가 존재합니다. 다만 외부 근거는 산업 흐름을 보여줄 뿐 본 발명의 특정 가중조정 방식의 채택·성과를 직접 입증하지 못하므로 실제 채택 가능성은 추가 검증이 필요합니다.",
      "사업 적용성 관점에서는 장기간의 보호기간(2044년까지)과 업계 수요 확대가 유지의 실익을 뒷받침합니다. 그러나 내부 적용 계획·수익모델·연차료 등 정량적 사업 적용성 자료 부재로 비용 대비 기대가 불명확합니다.",
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
        "BUSINESS_ALIGNMENT",
        65,
        "점수/등급: 65 / B",
        [
          { text: "로보어드바이저 및 자산배분 자동화 사업과 연결 가능성은 있으나, 현재 제품 로드맵이나 내부 적용 계획의 직접 근거가 부족해 추가 확인이 필요합니다." },
          { text: "강화학습 기반 자산배분 기능이 실제 사업 KPI와 연결되는지, 파일럿 적용 가능성과 우선순위를 사업부에서 확인해야 합니다." },
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
        "BUSINESS_ALIGNMENT",
        84,
        "ChainZ 성능 개선 로드맵과 직접 연결될 수 있어 플랫폼 경쟁력 방어 관점의 사업 연계성이 높습니다.",
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
        "BUSINESS_ALIGNMENT",
        72,
        "CMP Pad 물류 관리 업무와 연결 가능성은 있으나, 현재 제조 현장 시스템 적용 여부와 공동출원 협의 조건 확인이 필요합니다.",
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
    feeDueDate,
    reviewReason,
    currentRecommendation,
    businessOpinionDecision,
    legalActionResult,
    originalPatentUrl,
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
    feeDueDate,
    reviewReason,
    currentRecommendation,
    businessOpinionDecision,
    legalActionResult,
    originalPatentUrl,
  }),
);

function createPatentDetail(row: SkaxPatentRow, index: number): PatentDetail {
  const generatedReport = aiReportsByManagementNumber[row.managementNumber];
  const generatedSummary = patentSummariesByManagementNumber[row.managementNumber];
  const reviewWorkflowStatus = getMockReviewWorkflowStatus(index, Boolean(generatedReport));
  const recommendation = generatedReport?.recommendation ?? getRecommendation(row, reviewWorkflowStatus, index);
  const businessOpinionDecision = getBusinessOpinion(reviewWorkflowStatus, recommendation);
  const legalActionResult = getLegalActionResult();
  const feeDueDate = getMockDeadlineDate(row.applicationDate);
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
    departmentId: "",
    departmentName: "",
    lifecycleStatus: legalActionResult === "ABANDONED" ? "ABANDONED" : "ACTIVE",
    reviewWorkflowStatus,
    feeDueDate,
    reviewReason: getReviewReason(reviewWorkflowStatus, feeDueDate),
    currentRecommendation: recommendation,
    businessOpinionDecision,
    legalActionResult,
    originalPatentUrl: getOriginalPatentUrl(row),
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
    aiEvaluationReport: getAiEvaluationReport(row),
    finalDecisionRecord: {
      decisionId: legalActionResult ? `DEC-${row.managementNumber}` : null,
      reason: legalActionResult ? `${getLegalActionText(legalActionResult)} 결과가 데모 데이터로 입력되었습니다.` : null,
      decidedAt: legalActionResult ? "2026-05-01T11:10:00+09:00" : null,
    },
    businessOpinion: {
      opinion: businessOpinionDecision,
      comment: businessOpinionDecision
        ? `${businessOpinionDecision === "MAINTAIN" ? "유지" : "포기"} 의견이 제출되었습니다.`
        : "의견 대기 중입니다.",
      submittedAt: businessOpinionDecision ? "2026-05-01T14:20:00+09:00" : null,
    },
  };
}

function getOriginalPatentUrl(row: SkaxPatentRow) {
  const number = (row.registrationNumber || row.applicationNumber || "").replace(/[^0-9A-Za-z]/g, "");
  if (!number) {
    return null;
  }
  return `https://patents.google.com/patent/${(row.country || "KR").toUpperCase()}${number}/ko`;
}


function normalizeProductName(productName: string) {
  const normalizedProductName = normalizeDisplayText(productName);

  return normalizedProductName && normalizedProductName !== "해당사항없음" ? normalizedProductName : "";
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-05
 * @relatedUI UI-LEGAL-01, UI-LEGAL-04, UI-BUS-03
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
    return "NOT_IN_REVIEW";
  }

  const reviewTargetIndex = Math.floor(index / 4) - 1;
  return reviewTargetWorkflowCycle[Math.max(0, reviewTargetIndex) % reviewTargetWorkflowCycle.length];
}

/**
 * @relatedFR FR-LEGAL-01, FR-BUS-01
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-BUS-01, UI-BUS-02
 * @description mock 특허의 회신 기준 납부일을 출원일 기준 다음 연차료 납부일로 계산한다.
 */
function getMockDeadlineDate(applicationDate: string) {
  return getNextAnnualFeeDueDate(applicationDate);
}


function getReviewReason(status: ReviewWorkflowStatus, feeDueDate: string) {
  const reasonMap: Record<ReviewWorkflowStatus, string> = {
    NOT_IN_REVIEW: "이번 분기 연차료 납부 대상이 아닙니다.",
    REVIEW_QUARTER_STARTED: `이번 분기 연차료 납부 대상이며 납부 기한은 ${feeDueDate}입니다.`,
    MAIL_READY: "AI 특허 평가 레포트가 생성되었고 관리자 메일 발송 명령이 필요합니다.",
    WAITING_BUSINESS_RESPONSE: "메일과 레포트를 발송했고 사업부서 담당자의 응답을 기다리고 있습니다.",
    BUSINESS_RESPONSE_RECEIVED: "사업부서 담당자의 응답이 제출되어 최종 처리 결과 입력이 필요합니다.",
    LEGAL_ACTION_RECORDED: "법무 처리 결과가 기록되어 이번 분기 검토가 완료되었습니다.",
  };
  return reasonMap[status];
}

function getRecommendation(row: SkaxPatentRow, status: ReviewWorkflowStatus, index: number): Recommendation {
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
  ];

  if (!respondedStatuses.includes(status)) {
    return null;
  }

  return recommendation === "ABANDON" ? "ABANDON" : "MAINTAIN";
}

function getLegalActionResult(): LegalActionResult | null {
  return null;
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

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 발표에서 바로 보여줄 수 있는 대표 특허의 작성 완료 AI 평가 레포트를 반환한다.
 *     레포트가 없는 특허는 null을 반환한다.
 */
function getAiEvaluationReport(row: SkaxPatentRow): AiEvaluationReport | null {
  const generatedReport = aiReportsByManagementNumber[row.managementNumber];

  if (generatedReport) {
    return withDemoRichFields(generatedReport, row);
  }

  const demoReport = demoAiEvaluationReports[row.managementNumber];

  if (demoReport) {
    return withDemoRichFields(demoReport, row);
  }

  return null;
}

// AIREPORT-RICH(목 전용): 목 레포트에 등급·요약 카드·섹션 본문·근거 신뢰도가 없으면 데모용 값을 채운다.
// 실제 BE 응답은 이미 이 필드를 보내므로, 이는 mock 모드에서 리치 UI를 미리보기 위한 보강일 뿐이다.
function demoGradeFromScore(score: number | null): string | undefined {
  if (score == null) return undefined;
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  return "C";
}

function withDemoRichFields(report: AiEvaluationReport, row: SkaxPatentRow): AiEvaluationReport {
  return {
    ...report,
    scores: report.scores.map((score) => ({
      ...score,
      grade: score.grade ?? demoGradeFromScore(score.score),
      riskFactors: score.riskFactors ?? ["심사 이력·보정 내역 미확인", "구현 파라미터(임계값 등) 구체성 부족"],
      missingInformation: score.missingInformation ?? ["청구항 전문·실시예 대응표", "실증/PoC 데이터"],
      confidence: score.confidence ?? 0.72,
    })),
    evidenceConfidence: report.evidenceConfidence ?? "MEDIUM",
    summaryBrief: report.summaryBrief ?? {
      one_line_summary: `${row.title}에 관한 기술로, 핵심 동작을 자동화·구조화하여 효율을 높이는 발명입니다.`,
      problem: "기존 방식의 수작업·정확도 한계와 운영 비용 문제를 해결하고자 합니다.",
      core_idea: "입력 데이터를 단계적으로 분석·정규화해 신뢰도 높은 결과를 산출하는 처리 구조입니다.",
      key_components: ["입력 수집·전처리 모듈", "단계별 분석·판정 엔진", "결과 정규화·출력 인터페이스"],
      operation_steps: ["입력 수신", "전처리·특징 추출", "단계별 분석·판정", "결과 정규화", "표준 출력"],
      expected_effect: "처리 품질과 일관성을 높이고 운영 자동화로 비용·시간을 절감합니다.",
    },
    reportSections: report.reportSections ?? {
      evaluationScope: "본 평가는 대상 특허의 청구항·명세서와 수집된 외부 근거(시장·기술 동향)를 범위로 합니다.",
      judgmentBasis: "권리성·기술성은 청구항 구체성으로 비교적 견고하나, 시장·사업 적용 근거는 추가 확인이 필요합니다.",
      finalOpinion: "기술적 차별성은 확인되나 사업 연계성 근거가 제한적이라, 보완 자료 확보 후 유지 여부를 재검토하는 것이 적절합니다.",
    },
  };
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
  };

  return textMap[result];
}
