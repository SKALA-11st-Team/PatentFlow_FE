import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPatents, sendBusinessReviewMails } from "../../api/patents";
import { Button } from "../../components/common/Button";
import { PaginationControls } from "../../components/common/PaginationControls";
import { AppLayout } from "../../components/layout/AppLayout";
import { DeadlineCell } from "../../components/patent/DeadlineCell";
import { WorkflowStatusBadge } from "../../components/patent/WorkflowStatusBadge";
import { usePatentList } from "../../hooks/usePatentList";
import { useClientPagination } from "../../hooks/useClientPagination";
import {
  REVIEW_WORKFLOW_FILTER_OPTIONS,
  reviewWorkflowStatusLabels,
  type ReviewWorkflowFilter,
} from "../../constants/status";
import type { PatentListItem, ReviewWorkflowStatus } from "../../types/patent";

type SortKey = "DUE_DATE_ASC" | "DUE_DATE_DESC" | "TITLE_ASC" | "DEPARTMENT_ASC";
type ReviewTargetScope = "ALL" | "QUARTER";

const sortLabels: Record<SortKey, string> = {
  DUE_DATE_ASC: "마감 기한 빠른순",
  DUE_DATE_DESC: "마감 기한 늦은순",
  TITLE_ASC: "특허명 가나다순",
  DEPARTMENT_ASC: "부서명 가나다순",
};

/**
 * @relatedFR FR-001, FR-002, FR-011, FR-012, FR-014, FR-015, FR-016, FR-017
 * @relatedUI UI-LEGAL-02
 * @description 관리자 KPI 카드에서 진입하는 상태별 특허 조회와 메일 일괄 처리 화면
 */
export function AdminReviewTargetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialWorkflow = getInitialWorkflowFilter(searchParams.get("workflow"));
  const scope = getReviewTargetScope(searchParams.get("scope"));
  const initialBusinessArea = searchParams.get("businessArea") ?? "ALL";
  const [searchKeyword, setSearchKeyword] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<ReviewWorkflowFilter>(initialWorkflow);
  const [businessAreaFilter, setBusinessAreaFilter] = useState(initialBusinessArea);
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const { errorMessage, isLoading, patents: patentList, setPatents: setPatentList } = usePatentList();
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const filteredPatents = useMemo(
    () => getFilteredAndSortedReviewTargets(patentList, searchKeyword, workflowFilter, businessAreaFilter, scope, sortKey),
    [businessAreaFilter, patentList, scope, searchKeyword, sortKey, workflowFilter],
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredPatents, [businessAreaFilter, scope, searchKeyword, sortKey, workflowFilter]);
  const businessAreaOptions = useMemo(
    () =>
      Array.from(new Set(patentList.map((patent) => patent.businessArea))).sort((first, second) =>
        first.localeCompare(second, "ko"),
      ),
    [patentList],
  );
  const pageTitle = getReviewTargetPageTitle(scope, initialWorkflow, businessAreaFilter);
  const sectionTitle = getReviewTargetSectionTitle(scope, workflowFilter, businessAreaFilter);
  const isActionableMailList = workflowFilter === "MAIL_READY";
  const canSelectRows = isActionableMailList;
  const shouldShowWorkflowColumn = workflowFilter === "ALL";
  const selectablePatentIds = useMemo(() => displayedPatents.map((patent) => patent.patentId), [displayedPatents]);
  const areAllRowsSelected =
    selectablePatentIds.length > 0 && selectablePatentIds.every((patentId) => selectedPatentIds.includes(patentId));
  const tableColumnCount =
    4 +
    (canSelectRows ? 1 : 0) +
    (shouldShowWorkflowColumn ? 1 : 0) +
    (isActionableMailList ? 2 : 0);

  useEffect(() => {
    setSelectedPatentIds((currentIds) => currentIds.filter((patentId) => selectablePatentIds.includes(patentId)));
  }, [selectablePatentIds]);

  function handleTogglePatentSelection(patentId: string) {
    setSelectedPatentIds((currentIds) =>
      currentIds.includes(patentId)
        ? currentIds.filter((selectedPatentId) => selectedPatentId !== patentId)
        : [...currentIds, patentId],
    );
  }

  function handleToggleAllRows() {
    setSelectedPatentIds(areAllRowsSelected ? [] : selectablePatentIds);
  }

  async function handleSendMails() {
    setIsProcessing(true);
    setActionMessage("");

    try {
      const result = await sendBusinessReviewMails(selectedPatentIds);

      setPatentList(await getPatents({ page: 1, size: 20 }));
      setSelectedPatentIds([]);
      setActionMessage(
        result.updatedCount > 0
          ? `${result.updatedCount}건의 사업부 검토 요청 메일을 발송했습니다. 상태가 사업부 응답 대기로 변경되었습니다.`
          : "메일 발송 처리할 선택 건이 없습니다.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <AppLayout
      role="ADMIN"
      title={pageTitle}
      description="대시보드 KPI에서 선택한 조건의 특허를 별도 조회 화면에서 확인합니다."
    >
      <section className="section">
        <div className="section-header">
          <div>
            <h2>{sectionTitle}</h2>
            <p>{errorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : `${filteredPatents.length}건의 특허가 조회되었습니다.`)}</p>
          </div>
          {canSelectRows ? (
            <div className="section-actions">
              <div className="inline-action-group">
                <span className="selection-count">선택 {selectedPatentIds.length}건</span>
                {isActionableMailList ? (
                  <Button disabled={selectedPatentIds.length === 0 || isProcessing} onClick={handleSendMails} type="button">
                    {isProcessing ? "처리 중" : "메일 발송"}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="filter-bar review-target-filter-bar">
          <label>
            <span>검색</span>
            <input
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="특허명, 출원번호, 관리번호, 부서"
              type="search"
              value={searchKeyword}
            />
          </label>
          <label>
            <span>관련사업 분야</span>
            <select onChange={(event) => setBusinessAreaFilter(event.target.value)} value={businessAreaFilter}>
              <option value="ALL">전체</option>
              {businessAreaOptions.map((businessArea) => (
                <option key={businessArea} value={businessArea}>
                  {businessArea}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>검토 단계</span>
            <select
              onChange={(event) => setWorkflowFilter(event.target.value as ReviewWorkflowFilter)}
              value={workflowFilter}
            >
              {REVIEW_WORKFLOW_FILTER_OPTIONS.map((option) => (
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
        {actionMessage ? <p className="notice bulk-action-notice">{actionMessage}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {canSelectRows ? (
                  <th className="selection-column">
                    <input
                      aria-label="목록 전체 선택"
                      checked={areAllRowsSelected}
                      onChange={handleToggleAllRows}
                      type="checkbox"
                    />
                  </th>
                ) : null}
                <th>특허명</th>
                <th>관리번호</th>
                <th>부서</th>
                {isActionableMailList ? (
                  <>
                    <th>담당자 이름</th>
                    <th>이메일</th>
                  </>
                ) : null}
                {shouldShowWorkflowColumn ? <th>검토 단계</th> : null}
                <th>마감 기한</th>
              </tr>
            </thead>
            <tbody>
              {displayedPatents.map((patent) => {
                const recipient = getDepartmentRecipient(patent);

                return (
                  <tr
                    className={selectedPatentIds.includes(patent.patentId) ? "clickable-row selected-row" : "clickable-row"}
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
                    {canSelectRows ? (
                      <td className="selection-column" onClick={(event) => event.stopPropagation()}>
                        <input
                          aria-label={`${patent.title} 선택`}
                          checked={selectedPatentIds.includes(patent.patentId)}
                          onChange={() => handleTogglePatentSelection(patent.patentId)}
                          type="checkbox"
                        />
                      </td>
                    ) : null}
                    <td>
                      <strong title={patent.title}>{truncatePatentTitle(patent.title)}</strong>
                      <span className="table-subtext">{patent.applicationNumber}</span>
                    </td>
                    <td>{patent.managementNumber}</td>
                    <td>{patent.departmentName}</td>
                    {isActionableMailList ? (
                      <>
                        <td>{recipient.name}</td>
                        <td>{recipient.email}</td>
                      </>
                    ) : null}
                    {shouldShowWorkflowColumn ? (
                      <td>
                        <WorkflowStatusBadge status={patent.reviewWorkflowStatus} />
                      </td>
                    ) : null}
                    <td>
                      <DeadlineCell dueDate={patent.annualFeeDueDate} />
                    </td>
                  </tr>
                );
              })}
              {filteredPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={tableColumnCount}>
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
 * @relatedUI UI-LEGAL-02
 * @description KPI query parameter를 검토 단계 필터 초기값으로 변환한다.
 */
function getInitialWorkflowFilter(workflow: string | null): ReviewWorkflowFilter {
  const workflowValues = REVIEW_WORKFLOW_FILTER_OPTIONS.filter((option) => option !== "ALL");

  return workflowValues.includes(workflow as ReviewWorkflowStatus) ? (workflow as ReviewWorkflowStatus) : "ALL";
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-02
 * @description KPI query parameter를 전체/이번 분기 조회 범위로 변환한다.
 */
function getReviewTargetScope(scope: string | null): ReviewTargetScope {
  return scope === "quarter" ? "QUARTER" : "ALL";
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-02
 * @description KPI 조건과 사용자가 입력한 검색/필터/정렬 조건을 적용한 특허 조회 결과를 반환한다.
 */
function getFilteredAndSortedReviewTargets(
  patentList: PatentListItem[],
  searchKeyword: string,
  workflowFilter: ReviewWorkflowFilter,
  businessAreaFilter: string,
  scope: ReviewTargetScope,
  sortKey: SortKey,
) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  return patentList
    .filter((patent) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [patent.title, patent.applicationNumber, patent.managementNumber, patent.departmentName, patent.businessArea].some(
          (value) => value.toLowerCase().includes(normalizedKeyword),
        );
      const matchesWorkflow = workflowFilter === "ALL" || patent.reviewWorkflowStatus === workflowFilter;
      const matchesBusinessArea = businessAreaFilter === "ALL" || patent.businessArea === businessAreaFilter;
      const matchesScope = scope === "ALL" || patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER";

      return matchesKeyword && matchesWorkflow && matchesBusinessArea && matchesScope;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sortKey));
}

/**
 * @relatedFR FR-002
 * @relatedUI UI-LEGAL-02
 * @description 관리자 특허 조회 결과의 정렬 순서를 계산한다.
 */
function comparePatents(firstPatent: PatentListItem, secondPatent: PatentListItem, sortKey: SortKey) {
  if (sortKey === "DUE_DATE_DESC") {
    return secondPatent.annualFeeDueDate.localeCompare(firstPatent.annualFeeDueDate);
  }

  if (sortKey === "TITLE_ASC") {
    return firstPatent.title.localeCompare(secondPatent.title, "ko");
  }

  if (sortKey === "DEPARTMENT_ASC") {
    return firstPatent.departmentName.localeCompare(secondPatent.departmentName, "ko");
  }

  return firstPatent.annualFeeDueDate.localeCompare(secondPatent.annualFeeDueDate);
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-02
 * @description KPI 조회 결과 화면 제목을 선택 조건에 맞게 표시한다.
 */
function getReviewTargetPageTitle(scope: ReviewTargetScope, workflowFilter: ReviewWorkflowFilter, businessArea: string) {
  if (businessArea !== "ALL") {
    return `${businessArea} 특허 현황`;
  }

  if (workflowFilter !== "ALL") {
    return reviewWorkflowStatusLabels[workflowFilter];
  }

  return scope === "QUARTER" ? "이번 분기 납부 대상" : "전체 특허 조회";
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-02
 * @description 특허 조회 결과 대신 현재 검토 단계 상태를 목록 제목으로 표시한다.
 */
function getReviewTargetSectionTitle(scope: ReviewTargetScope, workflowFilter: ReviewWorkflowFilter, businessArea: string) {
  if (businessArea !== "ALL") {
    return `${businessArea} 특허 리스트`;
  }

  if (workflowFilter !== "ALL") {
    return reviewWorkflowStatusLabels[workflowFilter];
  }

  return scope === "QUARTER" ? "이번 분기 납부 대상" : "전체 검토 단계";
}

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-02, UI-LEGAL-06
 * @description 메일 발송 대기 목록에서 부서별 담당자 이름과 이메일을 표시한다.
 */
function getDepartmentRecipient(patent: PatentListItem) {
  const localPart = patent.departmentId.replace(/^DEPT-/, "").toLowerCase();

  return {
    email: `${localPart}.owner@syuuk.test`,
    name: `${patent.departmentName} 담당자`,
  };
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-02
 * @description 특허 조회 결과의 특허명 표시 길이를 제한한다.
 */
function truncatePatentTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 29)}...` : title;
}
