import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredAuthUser } from "../../api/authStorage";
import { getApiErrorMessage } from "../../api/client";
import { getBusinessDashboardSummary, type BusinessDashboardSummary } from "../../api/dashboard";
import { getActiveQuarter, type QuarterSetting } from "../../api/settings";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { ErrorNotice } from "../../components/common/ErrorNotice";
import { KpiCard } from "../../components/common/KpiCard";
import { PaginationControls } from "../../components/common/PaginationControls";
import { TableLoadingRows } from "../../components/common/TableLoadingRows";
import { QuarterCompletionDonut } from "../../components/dashboard/QuarterCompletionDonut";
import { DeadlineCell } from "../../components/patent/DeadlineCell";
import { useClientPagination } from "../../hooks/useClientPagination";
import { usePatentList } from "../../hooks/usePatentList";
import type { PatentListItem } from "../../types/patent";
import {
  RECOMMENDATION_FILTER_OPTIONS,
  businessOpinionLabels,
  getBusinessOpinionTone,
  getRecommendationsByFilter,
  getRecommendationTone,
  recommendationLabels,
  type RecommendationFilter,
} from "../../constants/status";

type OpinionFilter = "ALL" | "PENDING" | "SUBMITTED";
type DashboardListMode = "REVIEW_REQUESTS" | "ASSIGNED_PATENTS";
type SortKey = "DUE_DATE_ASC" | "DUE_DATE_DESC" | "TITLE_ASC";

const sortLabels: Record<SortKey, string> = {
  DUE_DATE_ASC: "납부 예정일 빠른순",
  DUE_DATE_DESC: "납부 예정일 늦은순",
  TITLE_ASC: "특허명 가나다순",
};

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-BUS-01
 * @relatedUI UI-BUS-01
 * @description 사업부 대시보드에서 이번 분기 의견 요청 특허를 검색, 필터링, 정렬한다.
 */
export function BusinessDashboardPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [opinionFilter, setOpinionFilter] = useState<OpinionFilter>("ALL");
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("ALL");
  const [listMode, setListMode] = useState<DashboardListMode>("REVIEW_REQUESTS");
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const [submissionDeadline, setSubmissionDeadline] = useState<string | null>(null);
  const [activeQuarter, setActiveQuarter] = useState<QuarterSetting | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<BusinessDashboardSummary | null>(null);
  const [dashboardErrorMessage, setDashboardErrorMessage] = useState("");
  const [deadlineErrorMessage, setDeadlineErrorMessage] = useState("");
  const user = getStoredAuthUser();

  useEffect(() => {
    getActiveQuarter()
      .then((q) => {
        setActiveQuarter(q);
        setSubmissionDeadline(q?.submissionDeadline ?? null);
        setDeadlineErrorMessage("");
      })
      .catch((error) => {
        setActiveQuarter(null);
        setDeadlineErrorMessage(getApiErrorMessage(error, "활성 분기 정보를 불러오지 못했습니다."));
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    getBusinessDashboardSummary()
      .then((summary) => {
        if (isMounted) {
          setDashboardSummary(summary);
          setDashboardErrorMessage("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setDashboardSummary(null);
          setDashboardErrorMessage(getApiErrorMessage(error, "대시보드 요약을 불러오지 못했습니다."));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const { errorMessage, isLoading, patents } = usePatentList({ departmentId: user?.departmentId ?? undefined });
  const assigned = useMemo(
    () => patents.filter((patent) => patent.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE"),
    [patents],
  );
  const pending = assigned.filter((patent) => !patent.businessOpinionDecision);
  const submitted = patents.filter((patent) =>
    patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED" ||
    patent.legalActionResult !== null ||
    Boolean(patent.businessOpinionDecision),
  );
  const departmentPatentCount = dashboardSummary?.totalAssigned ?? patents.length;
  const pendingCount = dashboardSummary?.pendingReview ?? pending.length;
  const submittedCount = dashboardSummary?.reviewed ?? submitted.length;
  const reviewRequestCount = pendingCount + submittedCount;
  const tablePatentSource = listMode === "ASSIGNED_PATENTS" ? patents : assigned;
  const filteredPatents = useMemo(
    () => getFilteredAndSortedPatents(tablePatentSource, searchKeyword, opinionFilter, recommendationFilter, sortKey),
    [tablePatentSource, opinionFilter, recommendationFilter, searchKeyword, sortKey],
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredPatents, [listMode, opinionFilter, recommendationFilter, searchKeyword, sortKey]);

  const showAssignedPatents = () => {
    setListMode("ASSIGNED_PATENTS");
    setOpinionFilter("ALL");
  };

  const tableTitle = listMode === "ASSIGNED_PATENTS" ? "담당 특허" : "의견 요청 특허";
  const tableDescription =
    listMode === "ASSIGNED_PATENTS"
      ? "사업부에 배정된 특허 전체입니다."
      : "사업 적용 여부와 유지 필요성을 확인해야 하는 특허입니다.";

  return (
    <AppLayout
      role="BUSINESS"
      title="대시보드"
      description="내 사업부에 요청된 특허 검토와 의견 제출 상태를 확인합니다."
    >
      <section className="dashboard-kpi-overview">
        <QuarterCompletionDonut
          completed={submittedCount}
          helper="요청 대비 제출 완료"
          isLoading={isLoading && !dashboardSummary}
          label="의견 제출률"
          quarterLabel={activeQuarter?.quarterLabel}
          total={reviewRequestCount}
        />
        <div className="kpi-grid business-kpi-grid">
          <KpiCard
            isLoading={isLoading && !dashboardSummary}
            isSelected={listMode === "ASSIGNED_PATENTS"}
            label="담당 특허"
            value={departmentPatentCount}
            helper="사업부 배정 기준"
            onClick={showAssignedPatents}
            tone="primary"
          />
          <KpiCard
            isLoading={isLoading && !dashboardSummary}
            isSelected={listMode === "REVIEW_REQUESTS" && opinionFilter === "PENDING"}
            label="의견 대기"
            value={pendingCount}
            helper="검토 요청 특허"
            tone="warning"
            to="/business/review-requests?opinion=PENDING"
          />
          <KpiCard
            isLoading={isLoading && !dashboardSummary}
            label="제출 완료"
            value={submittedCount}
            helper="유지/포기 의견 제출"
            tone="success"
            to="/business/submissions"
          />
        </div>
      </section>
      <div className="dashboard-error-stack">
        <ErrorNotice message={dashboardErrorMessage} />
        <ErrorNotice message={deadlineErrorMessage} />
      </div>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>{tableTitle}</h2>
            <p>{errorMessage || dashboardErrorMessage || deadlineErrorMessage || tableDescription}</p>
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
              {RECOMMENDATION_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
                <th>{listMode === "ASSIGNED_PATENTS" ? "납부 예정일" : "회신 기한"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={5} />
              ) : displayedPatents.map((patent) => (
                <tr key={patent.patentId}>
                  <td>
                    <Link className="text-link table-title-link" to={`/business/patents/${patent.patentId}`}>
                      {patent.title}
                    </Link>
                    <span className="table-subtext">{patent.managementNumber}</span>
                  </td>
                  <td>{formatOptionalTableText(patent.productName)}</td>
                  <td>
                    <Badge tone={getRecommendationTone(patent.currentRecommendation)}>
                      {recommendationLabels[patent.currentRecommendation]}
                    </Badge>
                  </td>
                  <td>
                    {patent.businessOpinionDecision ? (
                      <Badge tone={getBusinessOpinionTone(patent.businessOpinionDecision)}>
                        {businessOpinionLabels[patent.businessOpinionDecision]}
                      </Badge>
                    ) : (
                      <Badge tone="warning">의견 대기</Badge>
                    )}
                  </td>
                  <td>
                    <DeadlineCell dueDate={listMode === "ASSIGNED_PATENTS" ? patent.feeDueDate : submissionDeadline} />
                  </td>
                </tr>
              ))}
              {!isLoading && filteredPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={5}>
                    조회 조건에 맞는 특허가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </section>
    </AppLayout>
  );
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-BUS-01
 * @relatedUI UI-BUS-01
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
      const matchesRecommendation = getRecommendationsByFilter(recommendationFilter).includes(
        patent.currentRecommendation,
      );

      return matchesKeyword && matchesOpinion && matchesRecommendation;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sortKey));
}

/**
 * @relatedFR FR-LEGAL-02, FR-BUS-01
 * @relatedUI UI-BUS-01
 * @description 사업부 의견 요청 특허 목록의 정렬 순서를 계산한다.
 */
function comparePatents(firstPatent: PatentListItem, secondPatent: PatentListItem, sortKey: SortKey) {
  if (sortKey === "DUE_DATE_DESC") {
    return secondPatent.feeDueDate.localeCompare(firstPatent.feeDueDate);
  }

  if (sortKey === "TITLE_ASC") {
    return firstPatent.title.localeCompare(secondPatent.title, "ko");
  }

  return firstPatent.feeDueDate.localeCompare(secondPatent.feeDueDate);
}

/**
 * @relatedFR FR-LEGAL-01, FR-BUS-01
 * @relatedUI UI-BUS-01
 * @description 사업부 대시보드 테이블에서 값이 없거나 N/A인 항목은 공란으로 표시한다.
 */
function formatOptionalTableText(value: string) {
  return value === "N/A" ? "" : value;
}
