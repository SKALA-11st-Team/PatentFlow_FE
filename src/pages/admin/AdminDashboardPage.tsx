import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAreaDistribution,
  getLegalDashboardSummary,
  type AreaDistribution,
  type LegalDashboardSummary,
} from "../../api/dashboard";
import { getDepartments, type Department } from "../../api/departments";
import { getApiErrorMessage } from "../../api/client";
import { getActiveQuarter, type QuarterSetting } from "../../api/settings";
import { AppLayout } from "../../components/layout/AppLayout";
import { BusinessAreaReviewCards } from "../../components/admin/BusinessAreaReviewCards";
import { DepartmentAssigner } from "../../components/admin/DepartmentAssigner";
import { ErrorNotice } from "../../components/common/ErrorNotice";
import { KpiCard } from "../../components/common/KpiCard";
import { PaginationControls } from "../../components/common/PaginationControls";
import { TableLoadingRows } from "../../components/common/TableLoadingRows";
import { QuarterCompletionDonut } from "../../components/dashboard/QuarterCompletionDonut";
import { DeadlineCell } from "../../components/patent/DeadlineCell";
import { WorkflowStatusBadge } from "../../components/patent/WorkflowStatusBadge";
import { usePatentList } from "../../hooks/usePatentList";
import { useClientPagination } from "../../hooks/useClientPagination";
import {
  REVIEW_WORKFLOW_FILTER_OPTIONS,
  type ReviewWorkflowFilter,
  reviewWorkflowStatusLabels,
} from "../../constants/status";
import type { PatentListItem } from "../../types/patent";
import { isQuarterlyReviewTarget } from "../../utils/reviewWorkflow";
import { estimateAnnualFeeKrw } from "../../utils/annualFee";

type SortKey = "DUE_DATE_ASC" | "DUE_DATE_DESC" | "TITLE_ASC";
type DashboardScope = "ALL" | "QUARTER" | "NOT_IN_QUARTER";
type QuarterFilter = "ALL" | "Q1" | "Q2" | "Q3" | "Q4";

const sortLabels: Record<SortKey, string> = {
  DUE_DATE_ASC: "납부 예정일 빠른순",
  DUE_DATE_DESC: "납부 예정일 늦은순",
  TITLE_ASC: "특허명 가나다순",
};

const emptyAreaDistribution: AreaDistribution = {
  totalCount: 0,
  businessArea: [],
  technologyArea: [],
  product: [],
  country: [],
};

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-15
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드에서 특허 조회, 검색, 필터링, 정렬을 제공하고 행 클릭으로 특허 상세에 진입한다.
 */
export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [reviewScope, setReviewScope] = useState<DashboardScope>("QUARTER");
  const [workflowFilter, setWorkflowFilter] = useState<ReviewWorkflowFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const { errorMessage, isLoading, patents, setPatents } = usePatentList();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<LegalDashboardSummary | null>(null);
  const [areaDistribution, setAreaDistribution] = useState<AreaDistribution>(emptyAreaDistribution);
  const [areaDistributionLoading, setAreaDistributionLoading] = useState(true);
  const [activeQuarter, setActiveQuarter] = useState<QuarterSetting | null>(null);
  const [dashboardErrorMessage, setDashboardErrorMessage] = useState("");
  const [departmentErrorMessage, setDepartmentErrorMessage] = useState("");

  useEffect(() => {
    getDepartments()
      .then((nextDepartments) => {
        setDepartments(nextDepartments);
        setDepartmentErrorMessage("");
      })
      .catch((error) => {
        setDepartmentErrorMessage(getApiErrorMessage(error, "사업부 목록을 불러오지 못했습니다."));
      });
  }, []);

  useEffect(() => {
    let isMounted = true;

    getActiveQuarter()
      .then((quarter) => {
        if (isMounted) {
          setActiveQuarter(quarter);
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveQuarter(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getLegalDashboardSummary()
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

  // DASH-F3: 영역별 분포 카드는 전체 특허 배열을 클라이언트 집계하지 않고 서버 집계 결과를 사용한다.
  useEffect(() => {
    let isMounted = true;
    setAreaDistributionLoading(true);

    getAreaDistribution()
      .then((distribution) => {
        if (isMounted) {
          setAreaDistribution(distribution);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAreaDistribution(emptyAreaDistribution);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAreaDistributionLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const quarterlyTargets = patents.filter(isQuarterlyReviewTarget);
  const mailReady = patents.filter((patent) => patent.reviewWorkflowStatus === "MAIL_READY");
  const waitingBusiness = patents.filter((patent) => patent.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE");
  const businessResponseReceived = patents.filter((patent) => patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED");
  const actionRecorded = patents.filter((patent) => patent.legalActionResult !== null);
  // DASH-01: 모든 KPI를 BE 요약 단일 출처로 통일(클라이언트 재집계는 fallback) — 동일 화면 합 불일치 방지.
  const quarterlyTargetCount = dashboardSummary?.quarterlyTargetCount ?? quarterlyTargets.length;
  const totalPatentCount = dashboardSummary?.totalPatents ?? patents.length;
  const mailReadyCount = dashboardSummary?.pendingReview ?? mailReady.length;
  const waitingBusinessCount = dashboardSummary?.waitingBusinessResponse ?? waitingBusiness.length;
  const businessResponseReceivedCount = dashboardSummary?.businessResponseReceived ?? businessResponseReceived.length;
  const actionRecordedCount = dashboardSummary?.legalActionCompleted ?? actionRecorded.length;
  const filteredPatents = useMemo(
    () => getFilteredAndSortedPatents(
      patents,
      searchKeyword,
      reviewScope,
      workflowFilter,
      sortKey,
      quarterFilter,
      countryFilter,
      dateRange.from,
      dateRange.to,
    ),
    [countryFilter, dateRange.from, dateRange.to, patents, quarterFilter, reviewScope, searchKeyword, sortKey, workflowFilter],
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredPatents, [reviewScope, searchKeyword, workflowFilter, sortKey]);
  const workflowFilterOptions = getDashboardWorkflowFilterOptions();
  const countryOptions = useMemo(() => getCountryOptions(patents), [patents]);

  function handleAssignSuccess(patentId: string, deptId: string, deptName: string) {
    setPatents((prev) =>
      prev.map((p) =>
        p.patentId === patentId
          ? { ...p, departmentId: deptId, departmentName: deptName }
          : p,
      ),
    );
  }

  function handleReviewScopeChange(nextScope: DashboardScope) {
    setReviewScope(nextScope);
    setWorkflowFilter("ALL");
  }


  return (
    <AppLayout
      role="ADMIN"
      title="Legal팀 대시보드"
      description="이번 분기 검토 상태를 빠르게 확인합니다."
    >
      <section className="dashboard-kpi-overview">
        <QuarterCompletionDonut
          completed={actionRecordedCount}
          helper="현재 분기 납부 대상 대비 완료"
          isLoading={isLoading}
          label="연차료 처리 완료"
          quarterLabel={activeQuarter?.quarterLabel}
          total={quarterlyTargetCount}
        />
        <div className="kpi-grid">
          <KpiCard
            isLoading={isLoading && !dashboardSummary}
            label="전체 특허"
            value={totalPatentCount}
            helper="등록 특허 기준"
            to="/admin/review-targets?scope=all"
          />
          <KpiCard
            isLoading={isLoading}
            label="이번 분기 납부 대상"
            value={quarterlyTargetCount}
            helper="검토 workflow 대상"
            to="/admin/review-targets?scope=quarter"
            tone="warning"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper="관리자 발송 필요"
            isLoading={isLoading && !dashboardSummary}
            label="메일 발송 대기"
            value={mailReadyCount}
            to="/admin/review-targets?workflow=MAIL_READY"
            tone="primary"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper="사업부 회신 필요"
            isLoading={isLoading && !dashboardSummary}
            label="사업부 응답 대기"
            value={waitingBusinessCount}
            to="/admin/review-targets?workflow=WAITING_BUSINESS_RESPONSE"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper="사업부 의견 확인 필요"
            isLoading={isLoading && !dashboardSummary}
            label="처리 결과 입력"
            value={businessResponseReceivedCount}
            to="/admin/review-targets?workflow=BUSINESS_RESPONSE_RECEIVED"
            tone="warning"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper={`완료율 ${formatPercent(actionRecordedCount, quarterlyTargetCount)}`}
            isLoading={isLoading && !dashboardSummary}
            label="처리 완료"
            value={actionRecordedCount}
            to="/admin/review-targets?scope=all"
            tone="success"
          />
        </div>
      </section>
      <div className="dashboard-error-stack">
        <ErrorNotice message={dashboardErrorMessage} />
        <ErrorNotice message={departmentErrorMessage} />
      </div>

      {/* D1: 검토 퍼널·연차료 도래 타임라인 — 이미 로드된 목록/요약 데이터만으로 그린다(추가 API 없음). */}
      <section className="section dashboard-visual-row">
        <ReviewFunnelCard
          stages={[
            { label: "검토 대상", count: quarterlyTargets.length },
            { label: "메일 발송 대기", count: mailReady.length },
            { label: "회신 대기", count: waitingBusiness.length },
            { label: "회신 수신", count: businessResponseReceived.length },
            { label: "처리 완료", count: actionRecorded.length },
          ]}
        />
        <FeeTimelineCard patents={patents} />
      </section>

      {/* D1-EXT: 분기별 예상 연차료 — 추가 API 없이 로드된 patents 기반으로 집계한다 */}
      <section className="section">
        <QuarterlyFeeChartCard patents={patents} />
      </section>

      <BusinessAreaReviewCards
        distribution={areaDistribution}
        isLoading={areaDistributionLoading}
        onSelectContext={(context) =>
          navigate(`/admin/review-targets?${context.queryParam}=${encodeURIComponent(context.value)}`)
        }
      />

      <section className="section">
        <div className="section-header">
          <div>
            <h2>특허 조회</h2>
            <p>
                {errorMessage || dashboardErrorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : "조건별로 특허를 조회하고 연차료 납부 예정일을 확인합니다.")}
            </p>
          </div>
        </div>
        <div className="filter-bar dashboard-filter-bar">
          <label>
            <span>조회 범위</span>
            <select
              onChange={(event) => handleReviewScopeChange(event.target.value as DashboardScope)}
              value={reviewScope}
            >
              <option value="ALL">전체 특허</option>
              <option value="QUARTER">이번 분기 납부 대상</option>
              <option value="NOT_IN_QUARTER">검토 분기 아님</option>
            </select>
          </label>
          <label>
            <span>검색</span>
            <input
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="특허명, 출원번호, 사업부명"
              type="search"
              value={searchKeyword}
            />
          </label>
          <label>
            <span>검토 단계</span>
            <select
              onChange={(event) => setWorkflowFilter(event.target.value as ReviewWorkflowFilter)}
              value={workflowFilter}
            >
              {workflowFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "전체" : reviewWorkflowStatusLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>분기</span>
            <select onChange={(event) => setQuarterFilter(event.target.value as QuarterFilter)} value={quarterFilter}>
              <option value="ALL">전체</option>
              <option value="Q1">1분기</option>
              <option value="Q2">2분기</option>
              <option value="Q3">3분기</option>
              <option value="Q4">4분기</option>
            </select>
          </label>
          <label>
            <span>국가</span>
            <select onChange={(event) => setCountryFilter(event.target.value)} value={countryFilter}>
              <option value="ALL">전체</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>
          <label>
            <span>조회 시작일</span>
            <input onChange={(event) => setDateRange((range) => ({ ...range, from: event.target.value }))} type="date" value={dateRange.from} />
          </label>
          <label>
            <span>조회 종료일</span>
            <input onChange={(event) => setDateRange((range) => ({ ...range, to: event.target.value }))} type="date" value={dateRange.to} />
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
                <th>검토 단계</th>
                <th>담당 사업부</th>
                <th>납부 예정일</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={4} />
              ) : displayedPatents.map((patent) => (
                <tr
                  className="clickable-row"
                  key={patent.patentId}
                  onClick={() => navigate(`/admin/patents/${patent.patentId}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/admin/patents/${patent.patentId}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <td>
                    <strong title={patent.title}>{truncatePatentTitle(patent.title)}</strong>
                    <span className="table-subtext">{patent.applicationNumber}</span>
                  </td>
                  <td>
                    <WorkflowStatusBadge status={patent.reviewWorkflowStatus} />
                  </td>
                  <td
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {(patent.reviewWorkflowStatus === "REVIEW_QUARTER_STARTED" || patent.reviewWorkflowStatus === "MAIL_READY") ? (
                      <DepartmentAssigner
                        currentDepartmentId={patent.departmentId}
                        currentDepartmentName={patent.departmentName}
                        departments={departments}
                        onAssignSuccess={(deptId, deptName) => handleAssignSuccess(patent.patentId, deptId, deptName)}
                        patentId={patent.patentId}
                      />
                    ) : (
                      <span className="table-subtext">{patent.departmentName || "—"}</span>
                    )}
                  </td>
                  <td>
                    <DeadlineCell dueDate={patent.feeDueDate} />
                  </td>
                </tr>
              ))}
              {!isLoading && filteredPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={4}>
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
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드 특허 조회 목록에 검색, 검토 단계 필터, 정렬 기준을 적용한다.
 */
function getFilteredAndSortedPatents(
  patentList: PatentListItem[],
  searchKeyword: string,
  reviewScope: DashboardScope,
  workflowFilter: ReviewWorkflowFilter,
  sortKey: SortKey,
  quarterFilter: QuarterFilter,
  countryFilter: string,
  dateFrom: string,
  dateTo: string,
) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  return patentList
    .filter((patent) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [patent.title, patent.applicationNumber, patent.departmentName, patent.managementNumber].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        );
      const matchesWorkflow = workflowFilter === "ALL" || patent.reviewWorkflowStatus === workflowFilter;
      const matchesScope =
        reviewScope === "ALL" ||
        (reviewScope === "QUARTER" && patent.reviewWorkflowStatus !== "NOT_IN_REVIEW") ||
        (reviewScope === "NOT_IN_QUARTER" && patent.reviewWorkflowStatus === "NOT_IN_REVIEW");
      const matchesQuarter = quarterFilter === "ALL" || getQuarterFromDate(patent.feeDueDate) === quarterFilter;
      const matchesCountry = countryFilter === "ALL" || patent.country === countryFilter;
      const matchesDateFrom = !dateFrom || patent.feeDueDate >= dateFrom;
      const matchesDateTo = !dateTo || patent.feeDueDate <= dateTo;

      return matchesKeyword && matchesWorkflow && matchesScope && matchesQuarter && matchesCountry && matchesDateFrom && matchesDateTo;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sortKey));
}

function getQuarterFromDate(dateValue: string): QuarterFilter | null {
  const month = Number(dateValue.split("-")[1]);
  if (!month) return null;
  return `Q${Math.ceil(month / 3)}` as QuarterFilter;
}

function getCountryOptions(patents: PatentListItem[]) {
  return Array.from(new Set(patents.map((patent) => patent.country).filter(Boolean))).sort();
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01
 * @description 이번 분기 조회 범위에서는 검토 분기 아님 상태 필터를 숨겨 KPI 대상 기준과 충돌하지 않게 한다.
 */
function getDashboardWorkflowFilterOptions() {
  return REVIEW_WORKFLOW_FILTER_OPTIONS.filter((option) => option !== "NOT_IN_REVIEW");
}

/**
 * @relatedFR FR-LEGAL-02
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드 특허 조회 목록의 정렬 순서를 계산한다.
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
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01
 * @description 특허명 컬럼의 표시 길이를 최대 30글자로 제한한다.
 */
function truncatePatentTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 29)}…` : title;
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-10
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드 KPI 완료율을 백분율로 표시한다.
 */
function formatPercent(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

/**
 * @relatedFR LEGAL-01
 * @relatedUI UI-LEGAL-01
 * @description D1: 분기 검토 퍼널 — 워크플로 단계별 건수를 가로 막대로 시각화한다(차트 라이브러리 없음).
 */
function ReviewFunnelCard({ stages }: { stages: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <div className="dashboard-visual-card">
      <h3>검토 진행 퍼널</h3>
      <div className="funnel-rows">
        {stages.map((stage) => (
          <div className="funnel-row" key={stage.label}>
            <span className="funnel-label">{stage.label}</span>
            <span className="funnel-bar-track">
              <span className="funnel-bar" style={{ width: `${Math.max(4, (stage.count / max) * 100)}%` }} />
            </span>
            <span className="funnel-count">{stage.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description D1-EXT: 다음 4분기 연차료 예상 총액 — 기존 patents 배열 기반 KRW 추정치 바 차트.
 */
function QuarterlyFeeChartCard({ patents }: { patents: PatentListItem[] }) {
  const now = new Date();
  const quarterStart = Math.floor(now.getMonth() / 3) * 3;
  const buckets = Array.from({ length: 4 }, (_, offset) => {
    const start = new Date(now.getFullYear(), quarterStart + offset * 3, 1);
    const q = Math.floor(start.getMonth() / 3) + 1;
    const yy = String(start.getFullYear()).slice(2);
    const monthKeys = Array.from({ length: 3 }, (_, mo) => {
      const m = new Date(start.getFullYear(), start.getMonth() + mo, 1);
      return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    });
    const totalKrw = patents
      .filter((p) => monthKeys.some((k) => p.feeDueDate?.startsWith(k)))
      .reduce((sum, p) => sum + estimateAnnualFeeKrw(p.country, p.registrationDate, p.applicationDate), 0);
    return { key: `${start.getFullYear()}-Q${q}`, label: `${yy}년 ${q}분기`, totalKrw };
  });
  const max = Math.max(1, ...buckets.map((b) => b.totalKrw));
  return (
    <div className="dashboard-visual-card">
      <div className="dashboard-visual-card-head">
        <h3>분기별 예상 연차료</h3>
        <span className="table-subtext">추정치 (참고용)</span>
      </div>
      <div className="timeline-bars fee-chart-bars">
        {buckets.map((bucket) => (
          <div className="timeline-col" key={bucket.key} title={`${bucket.label} · 약 ${formatKrwShort(bucket.totalKrw)}원`}>
            <span className="timeline-count fee-chart-amount">
              {bucket.totalKrw > 0 ? formatKrwShort(bucket.totalKrw) : ""}
            </span>
            <span
              className="timeline-bar"
              style={{
                background: "rgba(var(--color-primary-rgb), 0.55)",
                borderRadius: "4px 4px 0 0",
                height: `${Math.max(4, (bucket.totalKrw / max) * 100)}%`,
              }}
            />
            <span className="timeline-label">{bucket.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatKrwShort(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}만`;
  return `${amount}`;
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description D1: 향후 12개월 연차료 도래 타임라인 — 월별 납부 예정 건수를 미니 막대로 보여준다.
 */
function FeeTimelineCard({ patents }: { patents: PatentListItem[] }) {
  // 항목1: 실제 연차료 납부는 분기 단위로 검토되므로 월/분기 두 단위로 볼 수 있어야 한다.
  const [unit, setUnit] = useState<"MONTH" | "QUARTER">("MONTH");
  const now = new Date();
  const monthlyBuckets = Array.from({ length: 12 }, (_, offset) => {
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const count = patents.filter((patent) => patent.feeDueDate?.startsWith(key)).length;
    return { key, label: `${month.getMonth() + 1}월`, count };
  });
  const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterlyBuckets = Array.from({ length: 4 }, (_, offset) => {
    const start = new Date(now.getFullYear(), currentQuarterStartMonth + offset * 3, 1);
    const quarter = Math.floor(start.getMonth() / 3) + 1;
    const monthKeys = Array.from({ length: 3 }, (_, monthOffset) => {
      const month = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1);
      return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    });
    const count = patents.filter((patent) =>
      monthKeys.some((key) => patent.feeDueDate?.startsWith(key)),
    ).length;
    return { key: `${start.getFullYear()}-Q${quarter}`, label: `${quarter}분기`, count };
  });
  const buckets = unit === "MONTH" ? monthlyBuckets : quarterlyBuckets;
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <div className="dashboard-visual-card">
      <div className="dashboard-visual-card-head">
        <h3>연차료 도래 타임라인 ({unit === "MONTH" ? "12개월" : "4분기"})</h3>
        <div aria-label="타임라인 단위" className="timeline-unit-toggle" role="tablist">
          <button
            aria-selected={unit === "MONTH"}
            className={unit === "MONTH" ? "selected" : ""}
            onClick={() => setUnit("MONTH")}
            role="tab"
            type="button"
          >
            월
          </button>
          <button
            aria-selected={unit === "QUARTER"}
            className={unit === "QUARTER" ? "selected" : ""}
            onClick={() => setUnit("QUARTER")}
            role="tab"
            type="button"
          >
            분기
          </button>
        </div>
      </div>
      <div className="timeline-bars">
        {buckets.map((bucket) => (
          <div className="timeline-col" key={bucket.key} title={`${bucket.key} · ${bucket.count}건`}>
            <span className="timeline-count">{bucket.count > 0 ? bucket.count : ""}</span>
            <span className="timeline-bar" style={{ height: `${Math.max(4, (bucket.count / max) * 100)}%` }} />
            <span className="timeline-label">{bucket.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
