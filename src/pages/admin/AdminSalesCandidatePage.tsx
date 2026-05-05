import { Link } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { Section } from "../../components/common/Section";
import { patents } from "../../mocks/patents.mock";

/**
 * @relatedFR FR-017
 * @relatedUI UI-009
 * @description 포기 또는 매각 후보로 분류된 특허를 관리자가 조회하는 화면
 */
export function AdminSalesCandidatePage() {
  const salesCandidates = patents.filter(
    (patent) => patent.currentRecommendation === "SALES_CANDIDATE" || patent.legalActionResult === "SOLD",
  );

  return (
    <AppLayout
      role="ADMIN"
      title="매각 후보"
      description="포기 검토 이후 외부 활용 가능성이 있는 특허를 별도로 확인합니다."
    >
      <Section title="매각 후보 특허" description="특허명을 선택하면 상세 화면에서 평가 근거와 최종 판단을 확인합니다.">
        <div className="item-list">
          {salesCandidates.map((patent) => (
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
      </Section>
    </AppLayout>
  );
}
