import { Link } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { PaginationControls } from "../../components/common/PaginationControls";
import { Section } from "../../components/common/Section";
import { useClientPagination } from "../../hooks/useClientPagination";
import { usePatentList } from "../../hooks/usePatentList";

/**
 * @relatedFR FR-017
 * @relatedUI UI-LEGAL-07
 * @description 매각 후보 권고 또는 매각 완료로 분류된 특허를 관리자가 조회하는 화면
 */
export function AdminSalesCandidatePage() {
  const { errorMessage, isLoading, patents } = usePatentList();
  const salesCandidates = patents.filter(
    (patent) => patent.currentRecommendation === "SALES_CANDIDATE" || patent.legalActionResult === "SOLD",
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedCandidates,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(salesCandidates, [salesCandidates.length]);

  return (
    <AppLayout
      role="ADMIN"
      title="매각 후보"
      description="포기 검토 이후 외부 활용 가능성이 있는 특허를 별도로 확인합니다."
    >
      <Section
        title="매각 후보 특허"
        description={errorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : "특허명을 선택하면 상세 화면에서 평가 근거와 최종 판단을 확인합니다.")}
      >
        <div className="item-list">
          {displayedCandidates.map((patent) => (
            <Link className="list-row" key={patent.patentId} to={`/admin/patents/${patent.patentId}`}>
              <span>
                <strong>{patent.title}</strong>
                <small>{patent.departmentName} · {patent.applicationNumber}</small>
              </span>
              <Badge tone="warning">매각 후보</Badge>
            </Link>
          ))}
          {salesCandidates.length === 0 ? <p className="empty-state">매각 후보로 분류된 특허가 없습니다.</p> : null}
        </div>
        <PaginationControls
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </Section>
    </AppLayout>
  );
}
