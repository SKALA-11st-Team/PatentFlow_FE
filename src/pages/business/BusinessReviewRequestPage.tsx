import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { submitBusinessChecklist } from "../../api/businessChecklist";
import { getPatentDetail } from "../../api/patents";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { PaginationControls } from "../../components/common/PaginationControls";
import { AppLayout } from "../../components/layout/AppLayout";
import { DeadlineCell } from "../../components/patent/DeadlineCell";
import {
  createBusinessChecklistDraft,
  getBusinessChecklistTotal,
  getChecklistResponse,
} from "../../mocks/businessChecklist.mock";
import { useBusinessChecklistItems } from "../../hooks/useBusinessChecklistItems";
import { useClientPagination } from "../../hooks/useClientPagination";
import { usePatentList } from "../../hooks/usePatentList";
import { businessOpinionLabels, recommendationLabels } from "../../constants/status";
import type { BusinessChecklistSubmission } from "../../types/businessChecklist";
import type { PatentDetail, PatentListItem, Recommendation } from "../../types/patent";

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
 * @relatedUI UI-BUS-02
 * @description 사업부 KPI 카드에서 진입하는 의견 요청 특허 전용 조회와 의견 등록 모달 화면
 */
export function BusinessReviewRequestPage() {
  const [searchParams] = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [opinionFilter, setOpinionFilter] = useState<OpinionFilter>(getInitialOpinionFilter(searchParams));
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("DUE_DATE_ASC");
  const [selectedPatent, setSelectedPatent] = useState<PatentDetail | null>(null);
  const [detailMessage, setDetailMessage] = useState("");
  const [submittedOpinions, setSubmittedOpinions] = useState<Record<string, BusinessChecklistSubmission>>({});
  const { errorMessage, isLoading, patents } = usePatentList();
  const assigned = useMemo(
    () => patents.filter((patent) => patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER"),
    [patents],
  );
  const filteredPatents = useMemo(
    () =>
      getFilteredAndSortedPatents(
        assigned,
        searchKeyword,
        opinionFilter,
        recommendationFilter,
        sortKey,
        submittedOpinions,
      ),
    [assigned, opinionFilter, recommendationFilter, searchKeyword, sortKey, submittedOpinions],
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredPatents, [opinionFilter, recommendationFilter, searchKeyword, sortKey, submittedOpinions]);

  return (
    <AppLayout
      role="BUSINESS"
      title={getPageTitle(opinionFilter)}
      description="대시보드 KPI에서 선택한 의견 요청 특허를 별도 화면에서 확인하고 의견을 등록합니다."
    >
      <section className="section">
        <div className="section-header">
          <div>
            <h2>의견 요청 특허</h2>
            <p>{detailMessage || errorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : `${filteredPatents.length}건의 특허가 조회되었습니다. 행을 선택하면 의견 등록 모달이 열립니다.`)}</p>
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
              {displayedPatents.map((patent) => {
                const submittedOpinion = submittedOpinions[patent.patentId]?.finalOpinion;
                const displayedOpinion = submittedOpinion ?? patent.businessOpinionDecision;

                return (
                  <tr
                    className="clickable-row"
                    key={patent.patentId}
                    onClick={() => handleSelectPatent(patent.patentId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectPatent(patent.patentId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <strong title={patent.title}>{patent.title}</strong>
                      <span className="table-subtext">{patent.managementNumber}</span>
                    </td>
                    <td>{formatOptionalTableText(patent.productName)}</td>
                    <td>
                      <Badge tone={patent.currentRecommendation === "MAINTAIN" ? "success" : "warning"}>
                        {recommendationLabels[patent.currentRecommendation]}
                      </Badge>
                    </td>
                    <td>
                      {displayedOpinion ? (
                        <Badge tone={displayedOpinion === "MAINTAIN" ? "success" : "warning"}>
                          {businessOpinionLabels[displayedOpinion]}
                        </Badge>
                      ) : (
                        <Badge tone="warning">의견 대기</Badge>
                      )}
                    </td>
                    <td>
                      <DeadlineCell dueDate={patent.annualFeeDueDate} />
                    </td>
                  </tr>
                );
              })}
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
        <PaginationControls
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </section>

      {selectedPatent ? (
        <BusinessOpinionModal
          initialSubmission={submittedOpinions[selectedPatent.patentId] ?? createBusinessChecklistDraft(selectedPatent)}
          onClose={() => setSelectedPatent(null)}
          onSubmit={async (submission) => {
            const savedSubmission = await submitBusinessChecklist(selectedPatent.patentId, submission);
            setSubmittedOpinions((currentSubmissions) => ({
              ...currentSubmissions,
              [selectedPatent.patentId]: savedSubmission,
            }));
            setSelectedPatent(null);
          }}
          patent={selectedPatent}
        />
      ) : null}
    </AppLayout>
  );

  async function handleSelectPatent(selectedPatentId: string) {
    setDetailMessage("");

    try {
      const detail = await getPatentDetail(selectedPatentId);

      if (!detail) {
        setDetailMessage("특허 상세 정보를 불러오지 못했습니다.");
        return;
      }

      setSelectedPatent(detail);
    } catch {
      setDetailMessage("특허 상세 정보를 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
    }
  }
}

/**
 * @relatedFR FR-001, FR-002, FR-009
 * @relatedUI UI-BUS-02
 * @description KPI query parameter를 사업부 의견 상태 필터 초기값으로 변환한다.
 */
function getInitialOpinionFilter(searchParams: URLSearchParams): OpinionFilter {
  const opinion = searchParams.get("opinion");

  return opinion === "PENDING" || opinion === "SUBMITTED" ? opinion : "ALL";
}

/**
 * @relatedFR FR-001, FR-002, FR-009
 * @relatedUI UI-BUS-02
 * @description 사업부 의견 요청 특허 목록에 검색, 의견 상태, AI 권고, 정렬 조건을 적용한다.
 */
function getFilteredAndSortedPatents(
  patentList: PatentListItem[],
  searchKeyword: string,
  opinionFilter: OpinionFilter,
  recommendationFilter: RecommendationFilter,
  sortKey: SortKey,
  submittedOpinions: Record<string, BusinessChecklistSubmission>,
) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  return patentList
    .filter((patent) => {
      const hasSubmittedOpinion = Boolean(submittedOpinions[patent.patentId] ?? patent.businessOpinionDecision);
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [patent.title, patent.managementNumber, patent.productName].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        );
      const matchesOpinion =
        opinionFilter === "ALL" ||
        (opinionFilter === "PENDING" && !hasSubmittedOpinion) ||
        (opinionFilter === "SUBMITTED" && hasSubmittedOpinion);
      const matchesRecommendation =
        recommendationFilter === "ALL" || patent.currentRecommendation === recommendationFilter;

      return matchesKeyword && matchesOpinion && matchesRecommendation;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sortKey));
}

/**
 * @relatedFR FR-002, FR-009
 * @relatedUI UI-BUS-02
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
 * @relatedFR FR-009
 * @relatedUI UI-BUS-02
 * @description 사업부 의견 요청 특허 row 선택 시 체크리스트, 정성 평가, 최종 의견을 입력하는 모달
 */
function BusinessOpinionModal({
  initialSubmission,
  onClose,
  onSubmit,
  patent,
}: {
  initialSubmission: BusinessChecklistSubmission;
  onClose: () => void;
  onSubmit: (submission: BusinessChecklistSubmission) => void | Promise<void>;
  patent: PatentDetail;
}) {
  const [draft, setDraft] = useState(initialSubmission);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const { errorMessage: checklistErrorMessage, items: businessChecklistItems } = useBusinessChecklistItems();
  const total = getBusinessChecklistTotal(draft);

  async function handleSubmit() {
    if (!hasCompleteBusinessChecklistSubmission(draft)) {
      setSubmitMessage("모든 체크리스트 점수와 사업부 의견을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      await onSubmit({ ...draft, evaluatedAt: "2026-05-04" });
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "사업부 의견 제출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal ariaLabel="사업부 의견 등록" className="business-checklist-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">사업부 의견 등록</p>
          <h2>평가 체크리스트</h2>
          <p>{patent.title}</p>
        </div>
        <button aria-label="의견 등록 닫기" className="modal-close-button" onClick={onClose} type="button">
          x
        </button>
      </div>

      <div className="checklist-total-row">
        <span>총점</span>
        <strong>{total}점</strong>
        <small>체크리스트 점수와 정성 평가 점수를 함께 제출합니다.</small>
      </div>

      <div className="checklist-form">
        {checklistErrorMessage ? <p className="notice">{checklistErrorMessage}</p> : null}
        {businessChecklistItems.map((item) => {
          const response = getChecklistResponse(draft, item.id);

          return (
            <fieldset className="checklist-item" key={item.id}>
              <legend>
                <span>{item.category}</span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </legend>
              <div className="score-option-grid">
                {item.options.map((option) => (
                  <label
                    className={getScoreOptionClassName(response.score, response.aiSuggestedScore, option.score)}
                    key={option.score}
                  >
                    <input
                      checked={response.score === option.score}
                      name={item.id}
                      onChange={() => setDraft(updateChecklistScore(draft, item.id, option.score))}
                      type="radio"
                    />
                    <b>{option.score}</b>
                    <span>{option.label}</span>
                    {response.aiSuggestedScore === option.score ? <em>AI 판단 점수</em> : null}
                  </label>
                ))}
              </div>
              <label className="checklist-memo-label">
                <span>평가 입력</span>
                <textarea
                  onChange={(event) => setDraft(updateChecklistMemo(draft, item.id, event.target.value))}
                  placeholder="사업부 관점의 근거를 입력하세요."
                  value={response.memo}
                />
              </label>
            </fieldset>
          );
        })}

        <div className="checklist-final-grid">
          <label>
            <span>정성적 요소 (-5~5)</span>
            <input
              max={5}
              min={-5}
              onChange={(event) => setDraft({ ...draft, qualitativeScore: Number(event.target.value) })}
              type="number"
              value={draft.qualitativeScore}
            />
          </label>
          <label>
            <span>사업부 의견</span>
            <select
              onChange={(event) =>
                setDraft({ ...draft, finalOpinion: event.target.value as BusinessChecklistSubmission["finalOpinion"] })
              }
              value={draft.finalOpinion}
            >
              <option value="MAINTAIN">유지</option>
              <option value="ABANDON">포기</option>
            </select>
          </label>
        </div>

        <label className="checklist-memo-label">
          <span>판단 근거</span>
          <textarea
            onChange={(event) => setDraft({ ...draft, finalReason: event.target.value })}
            value={draft.finalReason}
          />
        </label>
        <label className="checklist-memo-label">
          <span>추가 확인 필요 사항</span>
          <textarea
            onChange={(event) => setDraft({ ...draft, additionalNeeds: event.target.value })}
            value={draft.additionalNeeds}
          />
        </label>
        {submitMessage ? <p className="notice">{submitMessage}</p> : null}
      </div>

      <div className="modal-actions">
        <Button onClick={onClose} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit} type="button">
          {isSubmitting ? "전달 중" : "관리자에게 전달"}
        </Button>
      </div>
    </Modal>
  );
}

function hasCompleteBusinessChecklistSubmission(submission: BusinessChecklistSubmission) {
  return Boolean(
    submission.responses.length > 0 &&
      submission.responses.every((response) => response.score !== null && response.score > 0) &&
      Number.isFinite(submission.qualitativeScore) &&
      submission.finalOpinion,
  );
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-BUS-02
 * @description 사업부 체크리스트 항목 점수를 갱신한다.
 */
function updateChecklistScore(submission: BusinessChecklistSubmission, itemId: string, score: number) {
  return {
    ...submission,
    responses: submission.responses.map((response) =>
      response.itemId === itemId ? { ...response, score } : response,
    ),
  };
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-BUS-02
 * @description 사업부 체크리스트 항목별 평가 입력 메모를 갱신한다.
 */
function updateChecklistMemo(submission: BusinessChecklistSubmission, itemId: string, memo: string) {
  return {
    ...submission,
    responses: submission.responses.map((response) =>
      response.itemId === itemId ? { ...response, memo } : response,
    ),
  };
}

function getScoreOptionClassName(selectedScore: number | null, aiSuggestedScore: number, optionScore: number) {
  const classNames = ["score-option"];

  if (selectedScore === optionScore) {
    classNames.push("selected");
  }

  if (aiSuggestedScore === optionScore) {
    classNames.push("ai-suggested");
  }

  return classNames.join(" ");
}

function getPageTitle(opinionFilter: OpinionFilter) {
  if (opinionFilter === "PENDING") {
    return "의견 대기 특허";
  }

  if (opinionFilter === "SUBMITTED") {
    return "제출 완료 특허";
  }

  return "이번 분기 제출 대상";
}

/**
 * @relatedFR FR-001, FR-009
 * @relatedUI UI-BUS-02
 * @description 사업부 테이블에서 값이 없거나 N/A인 항목은 공란으로 표시한다.
 */
function formatOptionalTableText(value: string) {
  return value === "N/A" ? "" : value;
}
