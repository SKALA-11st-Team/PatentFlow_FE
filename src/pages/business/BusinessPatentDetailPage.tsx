/**
 * @author 유건욱
 * @date 2026-05-06
 */
import { PatentDetailPage } from "../shared/PatentDetailPage";

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-BUS-01, FR-LEGAL-09
 * @relatedUI UI-BUS-02
 * @description 사업부 특허 상세 라우트에서 공통 특허 상세 화면을 사업부 권한으로 렌더링한다.
 */
export function BusinessPatentDetailPage() {
  return <PatentDetailPage role="BUSINESS" />;
}
