import { PatentDetailPage } from "../shared/PatentDetailPage";

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008, FR-011, FR-012, FR-013, FR-017
 * @relatedUI UI-LEGAL-05
 * @description 관리자 특허 상세 라우트에서 공통 특허 상세 화면을 관리자 권한으로 렌더링한다.
 */
export function AdminPatentDetailPage() {
  return <PatentDetailPage role="ADMIN" />;
}
