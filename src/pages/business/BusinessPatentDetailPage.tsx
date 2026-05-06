import { PatentDetailPage } from "../shared/PatentDetailPage";

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008, FR-009, FR-011
 * @relatedUI UI-BUS-03
 * @description 사업부 특허 상세 라우트에서 공통 특허 상세 화면을 사업부 권한으로 렌더링한다.
 */
export function BusinessPatentDetailPage() {
  return <PatentDetailPage role="BUSINESS" />;
}
