import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getDepartmentRecipientMappings } from "../../api/mailing";
import { getPatents, sendBusinessReviewMails } from "../../api/patents";
import { Button } from "../../components/common/Button";
import { PaginationControls } from "../../components/common/PaginationControls";
import { AppLayout } from "../../components/layout/AppLayout";
import { BusinessReviewMailPreviewModal } from "../../components/mailing/BusinessReviewMailPreviewModal";
import { DeadlineCell } from "../../components/patent/DeadlineCell";
import { WorkflowStatusBadge } from "../../components/patent/WorkflowStatusBadge";
import { usePatentList } from "../../hooks/usePatentList";
import { useClientPagination } from "../../hooks/useClientPagination";
import {
  createGroupedBusinessReviewMailDrafts,
  getDepartmentRecipient,
  toBusinessReviewMailSendDraft,
  type BusinessReviewMailDraft,
} from "../../utils/businessReviewMail";
import {
  REVIEW_WORKFLOW_FILTER_OPTIONS,
  reviewWorkflowStatusLabels,
  type ReviewWorkflowFilter,
} from "../../constants/status";
import type { PatentListItem, ReviewWorkflowStatus } from "../../types/patent";
import type { DepartmentRecipientMapping } from "../../types/mailing";

type SortKey = "DUE_DATE_ASC" | "DUE_DATE_DESC" | "TITLE_ASC" | "DEPARTMENT_ASC";
type ReviewTargetScope = "ALL" | "QUARTER";
type ContextFilterKey = "businessArea" | "technologyArea" | "productName";

interface ContextFilterConfig {
  key: ContextFilterKey;
  label: string;
  getValue: (patent: PatentListItem) => string;
}

const sortLabels: Record<SortKey, string> = {
  DUE_DATE_ASC: "마감 기한 빠른순",
  DUE_DATE_DESC: "마감 기한 늦은순",
  TITLE_ASC: "특허명 가나다순",
  DEPARTMENT_ASC: "부서명 가나다순",
};

const contextFilterConfigs: ContextFilterConfig[] = [
  {
    getValue: (patent) => patent.businessArea,
    key: "businessArea",
    label: "관련사업 분야",
  },
  {
    getValue: (patent) => patent.technologyArea,
    key: "technologyArea",
    label: "관련기술 분야",
  },
  {
    getValue: (patent) => patent.productName,
    key: "productName",
    label: "관련제품",
  },
];

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
  const initialContextFilter = getInitialContextFilter(searchParams);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<ReviewWorkflowFilter>(initialWorkflow);
  const [contextFilterKey, setContextFilterKey] = useState<ContextFilterKey>(initialContextFilter.key);
  const [contextFilterValue, setContextFilterValue] = useState(initialContextFilter.value);
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const { errorMessage, isLoading, patents: patentList, setPatents: setPatentList } = usePatentList();
  const [selectedPatentIds, setSelectedPatentIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mailDrafts, setMailDrafts] = useState<BusinessReviewMailDraft[]>([]);
  const [recipientMappings, setRecipientMappings] = useState<DepartmentRecipientMapping[]>([]);
  const [activeMailIndex, setActiveMailIndex] = useState(0);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const activeContextConfig = getContextFilterConfig(contextFilterKey);
  const filteredPatents = useMemo(
    () =>
      getFilteredAndSortedReviewTargets(
        patentList,
        searchKeyword,
        workflowFilter,
        contextFilterKey,
        contextFilterValue,
        scope,
        sortKey,
      ),
    [contextFilterKey, contextFilterValue, patentList, scope, searchKeyword, sortKey, workflowFilter],
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredPatents, [contextFilterKey, contextFilterValue, scope, searchKeyword, sortKey, workflowFilter]);
  const contextFilterOptions = useMemo(
    () =>
      Array.from(new Set(patentList.map((patent) => getDisplayValue(activeContextConfig.getValue(patent))))).sort(
        (first, second) => first.localeCompare(second, "ko"),
      ),
    [activeContextConfig, patentList],
  );
  const pageTitle = getReviewTargetPageTitle(scope, initialWorkflow, contextFilterValue);
  const sectionTitle = getReviewTargetSectionTitle(scope, workflowFilter, activeContextConfig.label, contextFilterValue);
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

  useEffect(() => {
    let isMounted = true;

    async function loadRecipientMappings() {
      try {
        const nextMappings = await getDepartmentRecipientMappings();

        if (isMounted) {
          setRecipientMappings(nextMappings);
        }
      } catch {
        if (isMounted) {
          setRecipientMappings([]);
        }
      }
    }

    loadRecipientMappings();

    return () => {
      isMounted = false;
    };
  }, []);

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

  function handleContextFilterKeyChange(nextKey: ContextFilterKey) {
    setContextFilterKey(nextKey);
    setContextFilterValue("ALL");
  }

  function handleOpenMailPreview() {
    const selectedPatents = selectedPatentIds
      .map((patentId) => patentList.find((patent) => patent.patentId === patentId))
      .filter((patent): patent is PatentListItem => Boolean(patent))
      .filter((patent) => patent.reviewWorkflowStatus === "MAIL_READY");
    const selectedDrafts = createGroupedBusinessReviewMailDrafts(selectedPatents, recipientMappings);

    setMailDrafts(selectedDrafts);
    setActiveMailIndex(0);
    setIsSendConfirmOpen(false);
    setActionMessage(selectedDrafts.length === 0 ? "미리보기할 메일 발송 대기 특허가 없습니다." : "");
  }

  function handleCloseMailPreview() {
    if (isProcessing) {
      return;
    }

    setMailDrafts([]);
    setActiveMailIndex(0);
    setIsSendConfirmOpen(false);
  }

  function handleUpdateMailDraft(nextDraft: BusinessReviewMailDraft) {
    setMailDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => (index === activeMailIndex ? nextDraft : draft)),
    );
  }

  async function handleConfirmSendMails() {
    setIsProcessing(true);
    setActionMessage("");

    try {
      const result = await sendBusinessReviewMails(mailDrafts.map(toBusinessReviewMailSendDraft));
      const skippedCount = result.skippedPatentIds?.length ?? 0;

      setPatentList(await getPatents());
      setSelectedPatentIds([]);
      setMailDrafts([]);
      setActiveMailIndex(0);
      setIsSendConfirmOpen(false);
      setActionMessage(
        result.updatedCount > 0
          ? `${result.updatedCount}건의 사업부 검토 요청 메일을 발송했습니다.${skippedCount > 0 ? ` ${skippedCount}건은 현재 단계가 맞지 않아 건너뛰었습니다.` : ""}`
          : "메일 발송 처리할 선택 건이 없습니다.",
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "메일 발송 처리에 실패했습니다.");
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
                  <Button disabled={selectedPatentIds.length === 0 || isProcessing} onClick={handleOpenMailPreview} type="button">
                    메일 발송
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
            <span>분류 기준</span>
            <select onChange={(event) => handleContextFilterKeyChange(event.target.value as ContextFilterKey)} value={contextFilterKey}>
              {contextFilterConfigs.map((config) => (
                <option key={config.key} value={config.key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{activeContextConfig.label}</span>
            <select onChange={(event) => setContextFilterValue(event.target.value)} value={contextFilterValue}>
              <option value="ALL">전체</option>
              {contextFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
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
                const recipient = getDepartmentRecipient(patent, recipientMappings);

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
      {mailDrafts.length > 0 ? (
        <BusinessReviewMailPreviewModal
          activeIndex={activeMailIndex}
          drafts={mailDrafts}
          isConfirmOpen={isSendConfirmOpen}
          isProcessing={isProcessing}
          onClose={handleCloseMailPreview}
          onConfirmSend={handleConfirmSendMails}
          onConfirmToggle={setIsSendConfirmOpen}
          onDraftChange={handleUpdateMailDraft}
          onIndexChange={setActiveMailIndex}
        />
      ) : null}
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
 * @description 대시보드 관련 사업/기술/제품 query parameter를 검토 대상 컨텍스트 필터 초기값으로 변환한다.
 */
function getInitialContextFilter(searchParams: URLSearchParams) {
  const matchedConfig = contextFilterConfigs.find((config) => searchParams.get(config.key));

  return {
    key: matchedConfig?.key ?? "businessArea",
    value: matchedConfig ? getDisplayValue(searchParams.get(matchedConfig.key) ?? "") : "ALL",
  };
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
  contextFilterKey: ContextFilterKey,
  contextFilterValue: string,
  scope: ReviewTargetScope,
  sortKey: SortKey,
) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const contextConfig = getContextFilterConfig(contextFilterKey);

  return patentList
    .filter((patent) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [
          patent.title,
          patent.applicationNumber,
          patent.managementNumber,
          patent.departmentName,
          patent.businessArea,
          patent.technologyArea,
          patent.productName,
        ].some((value) => value.toLowerCase().includes(normalizedKeyword));
      const matchesWorkflow = workflowFilter === "ALL" || patent.reviewWorkflowStatus === workflowFilter;
      const matchesContext =
        contextFilterValue === "ALL" || getDisplayValue(contextConfig.getValue(patent)) === contextFilterValue;
      const matchesScope = scope === "ALL" || patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER";

      return matchesKeyword && matchesWorkflow && matchesContext && matchesScope;
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
function getReviewTargetPageTitle(
  scope: ReviewTargetScope,
  workflowFilter: ReviewWorkflowFilter,
  contextFilterValue: string,
) {
  if (contextFilterValue !== "ALL") {
    return `${contextFilterValue} 특허 현황`;
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
function getReviewTargetSectionTitle(
  scope: ReviewTargetScope,
  workflowFilter: ReviewWorkflowFilter,
  contextFilterLabel: string,
  contextFilterValue: string,
) {
  if (contextFilterValue !== "ALL") {
    return `${contextFilterLabel}: ${contextFilterValue} 특허 리스트`;
  }

  if (workflowFilter !== "ALL") {
    return reviewWorkflowStatusLabels[workflowFilter];
  }

  return scope === "QUARTER" ? "이번 분기 납부 대상" : "전체 검토 단계";
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-02
 * @description 특허 조회 결과의 특허명 표시 길이를 제한한다.
 */
function truncatePatentTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 29)}...` : title;
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-02
 * @description 선택된 컨텍스트 필터 기준의 설정을 반환한다.
 */
function getContextFilterConfig(contextFilterKey: ContextFilterKey) {
  return contextFilterConfigs.find((config) => config.key === contextFilterKey) ?? contextFilterConfigs[0];
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-02
 * @description 특허 컨텍스트 필터값이 비어 있을 때 목록 필터 표시용 문구를 반환한다.
 */
function getDisplayValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue && normalizedValue !== "N/A" ? normalizedValue : "미분류";
}
