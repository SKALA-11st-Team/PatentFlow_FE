/**
 * @author 유건욱
 * @date 2026-05-06
 */
import { PatentDetailPage } from "../shared/PatentDetailPage";

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-11
 * @relatedUI UI-LEGAL-04
 * @description 관리자 특허 상세 라우트에서 공통 특허 상세 화면을 관리자 권한으로 렌더링한다.
 */
export function AdminPatentDetailPage() {
  return <PatentDetailPage role="ADMIN" />;
}
