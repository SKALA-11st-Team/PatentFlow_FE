import type { BusinessChecklistItem } from "../types/businessChecklist";

/**
 * @relatedFR FR-BUS-04
 * @relatedUI UI-LEGAL-05, UI-BUS-02, UI-BUS-03
 * @description docs/business_evaluavte_checklist.md 기반 사업부 평가 체크리스트 정의
 */
export const businessChecklistItems: BusinessChecklistItem[] = [
  {
    id: "TECH_COMPLETENESS",
    category: "기술적 가치",
    title: "기술 완성도",
    description: "회사가 특허 관련 기술을 얼마나 구현해 놓은 상태인지 평가",
    options: [
      { score: 4, label: "판매 가능한 수준으로 개발 완료" },
      { score: 3, label: "테스트용 제품 개발 완료" },
      { score: 2, label: "테스트용 제품 개발 진행 중" },
      { score: 1, label: "아이디어 상태" },
    ],
  },
  {
    id: "TECH_ORIGINALITY",
    category: "기술적 가치",
    title: "기술 독창성",
    description: "기존 기술 대비 얼마나 뛰어난 기술인지 평가",
    options: [
      { score: 4, label: "타사 대비 독창적이고 최고 수준" },
      { score: 3, label: "타사와 유사하거나 약간 개량" },
      { score: 2, label: "동일 기능이나 기술 수준은 낮음" },
      { score: 1, label: "종래기술의 단순 조합 수준" },
    ],
  },
  {
    id: "MARKETABILITY",
    category: "경제적 가치",
    title: "시장성",
    description: "국내 및 해외 경쟁사가 유사 분야의 사업을 진행할 가능성 평가",
    options: [
      { score: 4, label: "국내외 경쟁사 사업 진행 가능성 높음" },
      { score: 3, label: "국내 경쟁사 사업 진행 가능성 높음" },
      { score: 2, label: "당사만 관련 사업 진행" },
      { score: 1, label: "관련 사업 진행 회사 없음" },
    ],
  },
  {
    id: "EXPECTED_EFFECT",
    category: "경제적 가치",
    title: "기대효과",
    description: "기술보호, 수익창출, 비용절감에 기여하는 정도 평가",
    options: [
      { score: 4, label: "기술보호, 수익창출, 비용절감 모두 기여" },
      { score: 3, label: "세 가지 중 두 가지에 기여" },
      { score: 2, label: "세 가지 중 한 가지에 기여" },
      { score: 1, label: "특허 기여도 없음" },
    ],
  },
];
