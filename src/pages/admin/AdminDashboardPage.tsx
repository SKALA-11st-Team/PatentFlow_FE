import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDepartments, type Department } from "../../api/departments";
import { AppLayout } from "../../components/layout/AppLayout";
import { BusinessAreaReviewCards } from "../../components/admin/BusinessAreaReviewCards";
import { DepartmentAssigner } from "../../components/admin/DepartmentAssigner";
import { KpiCard } from "../../components/common/KpiCard";
import { PaginationControls } from "../../components/common/PaginationControls";
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

type SortKey = "DUE_DATE_ASC" | "DUE_DATE_DESC" | "TITLE_ASC";
type DashboardScope = "ALL" | "QUARTER" | "NOT_IN_QUARTER";

const sortLabels: Record<SortKey, string> = {
  DUE_DATE_ASC: "마감 기한 빠른순",
  DUE_DATE_DESC: "마감 기한 늦은순",
  TITLE_ASC: "특허명 가나다순",
};

/**
 * @relatedFR FR-001, FR-002, FR-011, FR-012, FR-017
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드에서 특허 조회, 검색, 필터링, 정렬을 제공하고 행 클릭으로 특허 상세에 진입한다.
 */
export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [reviewScope, setReviewScope] = useState<DashboardScope>("QUARTER");
  const [workflowFilter, setWorkflowFilter] = useState<ReviewWorkflowFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const { errorMessage, isLoading, patents, setPatents } = usePatentList();
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => {});
  }, []);
  const quarterlyTargets = patents.filter(isQuarterlyReviewTarget);
  const mailReady = patents.filter((patent) => patent.reviewWorkflowStatus === "MAIL_READY");
  const waitingBusiness = patents.filter((patent) => patent.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE");
  const businessResponseReceived = patents.filter((patent) => patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED");
  const sellCandidates = businessResponseReceived.filter((patent) => patent.businessOpinionDecision === "ABANDON");
  const actionRecorded = patents.filter((patent) => patent.reviewWorkflowStatus === "LEGAL_ACTION_RECORDED");
  const quarterlyTargetCount = quarterlyTargets.length;
  const filteredPatents = useMemo(
    () => getFilteredAndSortedPatents(patents, searchKeyword, reviewScope, workflowFilter, sortKey),
    [patents, reviewScope, searchKeyword, sortKey, workflowFilter],
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
      description="이번 분기 연차료 검토 진행 상태와 담당 액션을 한눈에 확인합니다."
    >
      <section className="dashboard-kpi-overview">
        <QuarterCompletionDonut
          completed={actionRecorded.length}
          helper=""
          label="연차료 처리 완료"
          total={quarterlyTargetCount}
        />
        <div className="kpi-grid">
          <KpiCard
            label="전체 특허"
            value={patents.length}
            helper="등록 특허 기준"
            to="/admin/review-targets?scope=all"
          />
          <KpiCard
            label="이번 분기 납부 대상"
            value={quarterlyTargetCount}
            helper="검토 workflow 대상"
            to="/admin/review-targets?scope=quarter"
            tone="warning"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper="관리자 발송 필요"
            label="메일 발송 대기"
            value={mailReady.length}
            to="/admin/review-targets?workflow=MAIL_READY"
            tone="primary"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper="사업부 회신 필요"
            label="사업부 응답 대기"
            value={waitingBusiness.length}
            to="/admin/review-targets?workflow=WAITING_BUSINESS_RESPONSE"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper="사업부 포기 의견 — 매각 대기"
            label="매각 후보"
            value={sellCandidates.length}
            to="/admin/review-targets?workflow=BUSINESS_RESPONSE_RECEIVED"
            tone="warning"
          />
          <KpiCard
            denominator={quarterlyTargetCount}
            helper={`완료율 ${formatPercent(actionRecorded.length, quarterlyTargetCount)}`}
            label="처리 완료"
            value={actionRecorded.length}
            to="/admin/review-targets?workflow=LEGAL_ACTION_RECORDED"
            tone="success"
          />
        </div>
      </section>

      {/*
        이번 분기 병목 현황은 화면 밀도 이슈로 임시 비활성화했습니다.
        다시 사용할 때는 WorkflowBottleneckOverview 컴포넌트를 import한 뒤 아래처럼 렌더링하세요.
        <WorkflowBottleneckOverview quarterlyTargets={quarterlyTargets} />
      */}

      <BusinessAreaReviewCards
        onSelectContext={(context) =>
          navigate(`/admin/review-targets?${context.queryParam}=${encodeURIComponent(context.value)}`)
        }
        patents={patents}
      />

      <section className="section">
        <div className="section-header">
          <div>
            <h2>특허 조회</h2>
            <p>
              {errorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : "특허명, 출원번호, 사업부명과 검토 단계 기준으로 조회하고 마감 기한 순서를 확인합니다.")}
            </p>
          </div>
        </div>
        <div className="filter-bar">
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
                <th>마감 기한</th>
              </tr>
            </thead>
            <tbody>
              {displayedPatents.map((patent) => (
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
                  <td
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <WorkflowStatusBadge status={patent.reviewWorkflowStatus} />
                    {(patent.reviewWorkflowStatus === "REVIEW_QUARTER_STARTED" || patent.reviewWorkflowStatus === "MAIL_READY") ? (
                      <DepartmentAssigner
                        currentDepartmentId={patent.departmentId}
                        currentDepartmentName={patent.departmentName}
                        departments={departments}
                        onAssignSuccess={(deptId, deptName) => handleAssignSuccess(patent.patentId, deptId, deptName)}
                        patentId={patent.patentId}
                      />
                    ) : (
                      isQuarterlyReviewTarget(patent) && patent.departmentName
                        ? <span className="table-subtext">🏢 {patent.departmentName}</span>
                        : null
                    )}
                  </td>
                  <td>
                    <DeadlineCell dueDate={patent.feeDueDate} />
                  </td>
                </tr>
              ))}
              {filteredPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={3}>
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
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드 특허 조회 목록에 검색, 검토 단계 필터, 정렬 기준을 적용한다.
 */
function getFilteredAndSortedPatents(
  patentList: PatentListItem[],
  searchKeyword: string,
  reviewScope: DashboardScope,
  workflowFilter: ReviewWorkflowFilter,
  sortKey: SortKey,
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
        (reviewScope === "QUARTER" && patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER") ||
        (reviewScope === "NOT_IN_QUARTER" && patent.reviewWorkflowStatus === "NOT_IN_REVIEW_QUARTER");

      return matchesKeyword && matchesWorkflow && matchesScope;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sortKey));
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01
 * @description 이번 분기 조회 범위에서는 검토 분기 아님 상태 필터를 숨겨 KPI 대상 기준과 충돌하지 않게 한다.
 */
function getDashboardWorkflowFilterOptions() {
  return REVIEW_WORKFLOW_FILTER_OPTIONS.filter((option) => option !== "NOT_IN_REVIEW_QUARTER");
}

/**
 * @relatedFR FR-002
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
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-01
 * @description 특허명 컬럼의 표시 길이를 최대 30글자로 제한한다.
 */
function truncatePatentTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 29)}…` : title;
}

/**
 * @relatedFR FR-001, FR-012
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드 KPI 완료율을 백분율로 표시한다.
 */
function formatPercent(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}
