import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { KpiCard } from "../../components/common/KpiCard";
import { QuarterCompletionDonut } from "../../components/dashboard/QuarterCompletionDonut";
import { DeadlineCell } from "../../components/patent/DeadlineCell";
import { patents } from "../../mocks/patents.mock";
import type { PatentListItem, Recommendation } from "../../types/patent";
import { businessOpinionLabels, recommendationLabels } from "../../constants/status";

type OpinionFilter = "ALL" | "PENDING" | "SUBMITTED";
type RecommendationFilter = "ALL" | Recommendation;
type SortKey = "DUE_DATE_ASC" | "DUE_DATE_DESC" | "TITLE_ASC";

const recommendationFilterOptions: RecommendationFilter[] = [
  "ALL",
  "MAINTAIN",
  "REVIEW_AGAIN",
  "ABANDON",
  "SALES_CANDIDATE",
  "HOLD",
];

const sortLabels: Record<SortKey, string> = {
  DUE_DATE_ASC: "마감 기한 빠른순",
  DUE_DATE_DESC: "마감 기한 늦은순",
  TITLE_ASC: "특허명 가나다순",
};

/**
 * @relatedFR FR-001, FR-002, FR-009
 * @relatedUI UI-006
 * @description 사업부 대시보드에서 이번 분기 의견 요청 특허를 검색, 필터링, 정렬한다.
 */
export function BusinessDashboardPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [opinionFilter, setOpinionFilter] = useState<OpinionFilter>("ALL");
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const assigned = useMemo(
    () => patents.filter((patent) => patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER").slice(0, 10),
    [],
  );
  const pending = assigned.filter((patent) => !patent.businessOpinionDecision);
  const submitted = assigned.filter((patent) => patent.businessOpinionDecision);
  const filteredPatents = useMemo(
    () => getFilteredAndSortedPatents(assigned, searchKeyword, opinionFilter, recommendationFilter, sortKey),
    [assigned, opinionFilter, recommendationFilter, searchKeyword, sortKey],
  );

  return (
    <AppLayout
      role="BUSINESS"
      title="사업부서 대시보드"
      description="내 부서에 요청된 특허 검토와 의견 제출 상태를 확인합니다."
    >
      <section className="dashboard-kpi-overview">
        <QuarterCompletionDonut
          completed={submitted.length}
          helper="배정 특허 수 대비 사업부 의견 제출 완료"
          label="의견 제출 완료"
          total={assigned.length}
        />
        <div className="kpi-grid business-kpi-grid">
          <KpiCard
            label="이번 분기 제출 대상"
            value={assigned.length}
            helper="연차료 검토 요청"
            tone="primary"
            to="/business/review-requests?opinion=ALL"
          />
          <KpiCard
            label="의견 대기"
            value={pending.length}
            helper="사업부 작성 필요"
            tone="warning"
            to="/business/review-requests?opinion=PENDING"
          />
          <KpiCard
            label="제출 완료"
            value={submitted.length}
            helper="유지/포기 의견 제출"
            tone="success"
            to="/business/review-requests?opinion=SUBMITTED"
          />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>의견 요청 특허</h2>
            <p>사업 적용 여부와 유지 필요성을 확인해야 하는 특허입니다.</p>
          </div>
        </div>
        <div className="filter-bar business-filter-bar">
          <label>
            <span>검색</span>
            <input
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="특허명, 관리번호, 관련제품"
              type="search"
              value={searchKeyword}
            />
          </label>
          <label>
            <span>사업부 의견</span>
            <select onChange={(event) => setOpinionFilter(event.target.value as OpinionFilter)} value={opinionFilter}>
              <option value="ALL">전체</option>
              <option value="PENDING">의견 대기</option>
              <option value="SUBMITTED">제출 완료</option>
            </select>
          </label>
          <label>
            <span>AI 권고</span>
            <select
              onChange={(event) => setRecommendationFilter(event.target.value as RecommendationFilter)}
              value={recommendationFilter}
            >
              {recommendationFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "전체" : recommendationLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select onChange={(event) => setSortKey(event.target.value as SortKey)} value={sortKey}>
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>특허명</th>
                <th>관련제품</th>
                <th>AI 레포트 권고</th>
                <th>사업부 의견</th>
                <th>마감 기한</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatents.map((patent) => (
                <tr key={patent.patentId}>
                  <td>
                    <Link className="text-link table-title-link" to={`/business/patents/${patent.patentId}`}>
                      {patent.title}
                    </Link>
                    <span className="table-subtext">{patent.managementNumber}</span>
                  </td>
                  <td>{formatOptionalTableText(patent.productName)}</td>
                  <td>
                    <Badge tone={patent.currentRecommendation === "MAINTAIN" ? "success" : "warning"}>
                      {recommendationLabels[patent.currentRecommendation]}
                    </Badge>
                  </td>
                  <td>
                    {patent.businessOpinionDecision ? (
                      <Badge tone={patent.businessOpinionDecision === "MAINTAIN" ? "success" : "warning"}>
                        {businessOpinionLabels[patent.businessOpinionDecision]}
                      </Badge>
                    ) : (
                      <Badge tone="warning">의견 대기</Badge>
                    )}
                  </td>
                  <td>
                    <DeadlineCell dueDate={patent.annualFeeDueDate} />
                  </td>
                </tr>
              ))}
              {filteredPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={5}>
                    조회 조건에 맞는 특허가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}

/**
 * @relatedFR FR-001, FR-002, FR-009
 * @relatedUI UI-006
 * @description 사업부 의견 요청 특허 목록에 검색, 의견 상태 필터, AI 권고 필터, 정렬을 적용한다.
 */
function getFilteredAndSortedPatents(
  patentList: PatentListItem[],
  searchKeyword: string,
  opinionFilter: OpinionFilter,
  recommendationFilter: RecommendationFilter,
  sortKey: SortKey,
) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  return patentList
    .filter((patent) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [patent.title, patent.managementNumber, patent.productName].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        );
      const matchesOpinion =
        opinionFilter === "ALL" ||
        (opinionFilter === "PENDING" && !patent.businessOpinionDecision) ||
        (opinionFilter === "SUBMITTED" && Boolean(patent.businessOpinionDecision));
      const matchesRecommendation =
        recommendationFilter === "ALL" || patent.currentRecommendation === recommendationFilter;

      return matchesKeyword && matchesOpinion && matchesRecommendation;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sortKey));
}

/**
 * @relatedFR FR-002, FR-009
 * @relatedUI UI-006
 * @description 사업부 의견 요청 특허 목록의 정렬 순서를 계산한다.
 */
function comparePatents(firstPatent: PatentListItem, secondPatent: PatentListItem, sortKey: SortKey) {
  if (sortKey === "DUE_DATE_DESC") {
    return secondPatent.annualFeeDueDate.localeCompare(firstPatent.annualFeeDueDate);
  }

  if (sortKey === "TITLE_ASC") {
    return firstPatent.title.localeCompare(secondPatent.title, "ko");
  }

  return firstPatent.annualFeeDueDate.localeCompare(secondPatent.annualFeeDueDate);
}

/**
 * @relatedFR FR-001, FR-009
 * @relatedUI UI-006
 * @description 사업부 대시보드 테이블에서 값이 없거나 N/A인 항목은 공란으로 표시한다.
 */
function formatOptionalTableText(value: string) {
  return value === "N/A" ? "" : value;
}
