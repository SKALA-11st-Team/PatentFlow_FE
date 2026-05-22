import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/common/Button";
import { PaginationControls } from "../../components/common/PaginationControls";
import { Section } from "../../components/common/Section";
import { WorkflowStatusBadge } from "../../components/patent/WorkflowStatusBadge";
import { getDepartments, type Department } from "../../api/departments";
import { createPatent, lookupPatentBibliographicInfo, suggestPatentContextFields } from "../../api/patents";
import { DepartmentAssigner } from "../../components/admin/DepartmentAssigner";
import { useClientPagination } from "../../hooks/useClientPagination";
import { usePatentList } from "../../hooks/usePatentList";
import { REVIEW_WORKFLOW_FILTER_OPTIONS, reviewWorkflowStatusLabels, type ReviewWorkflowFilter } from "../../constants/status";
import type { PatentListItem, PatentUpsertPayload } from "../../types/patent";

type DashboardScope = "ALL" | "QUARTER" | "NOT_IN_QUARTER";
import { getNextAnnualFeeDueDate } from "../../utils/annualFee";

type PatentFormState = PatentUpsertPayload;

const emptyPatentForm: PatentFormState = {
  managementNumber: "",
  title: "",
  applicationDate: "",
  coApplicants: "",
  country: "",
  registrationDate: "",
  applicationNumber: "",
  registrationNumber: null,
  expectedExpirationDate: "",
  source: "KIPRIS",
  businessArea: "",
  technologyArea: "",
  productName: "",
};

/**
 * @relatedFR FR-001, FR-002, FR-003, FR-004
 * @relatedUI UI-LEGAL-03, UI-LEGAL-04
 * @description 관리자 특허 기본 정보 등록과 수정 대상 특허 테이블 조회 화면
 */
export function AdminPatentListPage() {
  const navigate = useNavigate();
  const { errorMessage, isLoading, patents: patentList, setPatents: setPatentList } = usePatentList();
  const [form, setForm] = useState<PatentFormState>(emptyPatentForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [keyword, setKeyword] = useState("");
  const [reviewScope, setReviewScope] = useState<DashboardScope>("ALL");
  const [workflowFilter, setWorkflowFilter] = useState<ReviewWorkflowFilter>("ALL");
  const [sort, setSort] = useState("feeDueDate,asc");
  const [lookupMessage, setLookupMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSuggestingContext, setIsSuggestingContext] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualMetadataEditEnabled, setIsManualMetadataEditEnabled] = useState(false);

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => {});
  }, []);

  const listedPatents = useMemo(
    () => getEditablePatentRows(patentList, keyword, reviewScope, workflowFilter, sort),
    [keyword, patentList, reviewScope, sort, workflowFilter],
  );
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(listedPatents, [keyword, reviewScope, sort, workflowFilter]);

  function handleAssignSuccess(patentId: string, deptId: string, deptName: string) {
    setPatentList((prev) =>
      prev.map((p) =>
        p.patentId === patentId
          ? { ...p, departmentId: deptId, departmentName: deptName }
          : p,
      ),
    );
  }

  async function handleLookupPatent() {
    if (!form.registrationNumber?.trim()) {
      setLookupMessage("조회용 등록번호를 입력해 주세요.");
      return;
    }

    setIsLookingUp(true);
    setLookupMessage("");
    setSaveMessage("");

    try {
      const result = await lookupPatentBibliographicInfo(form.registrationNumber);

      if (!result) {
        setLookupMessage("조회 결과가 없습니다. 등록번호를 다시 확인해 주세요.");
        return;
      }

      setForm((currentForm) => ({
        ...currentForm,
        ...result,
        managementNumber: currentForm.managementNumber,
        businessArea: currentForm.businessArea,
        technologyArea: currentForm.technologyArea,
        productName: currentForm.productName,
      }));
      setLookupMessage(
        result.source === "KIPRIS"
          ? "KIPRIS 결과를 불러왔습니다."
          : "외부 검색 결과를 불러왔습니다.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSavePatent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    if (!form.managementNumber.trim() || !form.title.trim()) {
      setSaveMessage("관리번호를 직접 입력하고 특허 기본 정보를 확인해 주세요.");
      return;
    }

    if (!form.registrationDate && !form.applicationDate) {
      setSaveMessage("연차료 기한 계산을 위해 출원일 또는 등록일이 필요합니다.");
      return;
    }

    if (!form.businessArea.trim() || !form.technologyArea.trim()) {
      setSaveMessage("관련 사업과 기술 분야를 입력해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createPatent(form);
      const nextPatent = createListItemFromForm(form, result.patentId);

      setPatentList((currentList) => {
        const existingIndex = currentList.findIndex((patent) => patent.patentId === nextPatent.patentId);

        if (existingIndex < 0) {
          return [nextPatent, ...currentList];
        }

        return currentList.map((patent) => (patent.patentId === nextPatent.patentId ? nextPatent : patent));
      });
      setForm(emptyPatentForm);
      setIsManualMetadataEditEnabled(false);
      setSaveMessage("특허가 등록되었습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * @relatedFR FR-003, FR-004
   * @relatedUI UI-LEGAL-04
   * @description 등록 폼의 특허명/제품 정보를 기준으로 관련사업/관련기술 분야 AI 추천값을 적용한다.
   */
  async function handleSuggestContextFields() {
    setLookupMessage("");
    setSaveMessage("");

    if (!form.title.trim() && !form.productName.trim() && !form.technologyArea.trim()) {
      setSaveMessage("특허명이나 제품 정보가 필요합니다.");
      return;
    }

    setIsSuggestingContext(true);

    try {
      const suggestion = await suggestPatentContextFields(form);

      if (!suggestion) {
        setSaveMessage("추천 결과가 없습니다. 직접 입력해 주세요.");
        return;
      }

      setForm((currentForm) => ({
        ...currentForm,
        businessArea: suggestion.businessArea,
        technologyArea: suggestion.technologyArea,
      }));
      setSaveMessage(
        `AI 추천: ${suggestion.businessArea} / ${suggestion.technologyArea} (${suggestion.confidenceText})`,
      );
    } finally {
      setIsSuggestingContext(false);
    }
  }

  function handleFormChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === "registrationNumber" && value.trim() === "" ? null : value,
    }));
  }

  return (
    <AppLayout
      role="ADMIN"
      title="특허관리"
      description="특허 기본 정보와 회사 컨텍스트를 등록하거나 수정합니다."
    >
      <Section
        title="신규 특허 등록"
        description={errorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : "")}
        actions={
          <label className="metadata-switch">
            <span>수동 입력</span>
            <input
              checked={isManualMetadataEditEnabled}
              onChange={(event) => setIsManualMetadataEditEnabled(event.target.checked)}
              type="checkbox"
            />
            <i aria-hidden="true" />
          </label>
        }
      >
        <form className="patent-edit-form" onSubmit={handleSavePatent}>
          <div className="external-lookup-row">
            <label>
              조회용 등록번호
              <input
                name="registrationNumber"
                onChange={handleFormChange}
                placeholder="예: 10-2932891"
                value={form.registrationNumber ?? ""}
              />
            </label>
            <Button disabled={isLookingUp} onClick={handleLookupPatent} type="button">
              {isLookingUp ? "조회 중" : "조회"}
            </Button>
          </div>
          {lookupMessage ? <p className="notice patent-form-notice">{lookupMessage}</p> : null}
          <div className="patent-inline-action-row">
            <div>
              <strong>AI 추천</strong>
              <span>관련 사업과 기술 분류를 추천합니다.</span>
            </div>
            <Button
              className="btn-small btn-sk-orange"
              disabled={isSuggestingContext}
              onClick={handleSuggestContextFields}
              type="button"
            >
              <span aria-hidden="true" className="ai-sparkle-icon" />
              {isSuggestingContext ? "추천 중" : "AI 추천"}
            </Button>
          </div>
          <div className="patent-form-grid">
            <label>
              관리번호
              <input
                name="managementNumber"
                onChange={handleFormChange}
                placeholder="예: P202405001-KR0"
                value={form.managementNumber}
              />
            </label>
            <label>
              특허명
              <input
                name="title"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                value={form.title}
              />
            </label>
            <label>
              출원국
              <input
                name="country"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                value={form.country}
              />
            </label>
            <label>
              출원일
              <input
                name="applicationDate"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                type="date"
                value={form.applicationDate}
              />
            </label>
            <label>
              등록일
              <input
                name="registrationDate"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                type="date"
                value={form.registrationDate}
              />
            </label>
            <label>
              출원번호
              <input
                name="applicationNumber"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                value={form.applicationNumber}
              />
            </label>
            <label>
              저장용 등록번호
              <input
                name="registrationNumber"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                value={form.registrationNumber ?? ""}
              />
            </label>
            <label>
              공동출원인명
              <input
                name="coApplicants"
                onChange={handleFormChange}
                placeholder="없으면 비워둠"
                readOnly={!isManualMetadataEditEnabled}
                value={form.coApplicants}
              />
            </label>
            <label>
              예상 소멸일
              <input
                name="expectedExpirationDate"
                onChange={handleFormChange}
                readOnly={!isManualMetadataEditEnabled}
                type="date"
                value={form.expectedExpirationDate}
              />
            </label>
            <label>
              관련사업 분야
              <input name="businessArea" onChange={handleFormChange} value={form.businessArea} />
            </label>
            <label>
              관련기술 분야
              <input name="technologyArea" onChange={handleFormChange} value={form.technologyArea} />
            </label>
            <label>
              관련제품
              <input name="productName" onChange={handleFormChange} value={form.productName} />
            </label>
          </div>
          <div className="form-actions">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "저장 중" : "특허 등록"}
            </Button>
          </div>
          {saveMessage ? <p className="notice patent-form-notice">{saveMessage}</p> : null}
        </form>
      </Section>

      <Section
        title="특허 수정"
        description={`${listedPatents.length}건의 특허가 조회되었습니다. 행을 클릭하면 상세 수정 페이지로 이동합니다.`}
      >
        <div className="filter-bar patent-management-filter-bar">
          <label>
            <span>조회 범위</span>
            <select
              onChange={(event) => setReviewScope(event.target.value as DashboardScope)}
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
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="특허명, 관리번호, 출원번호"
              value={keyword}
            />
          </label>
          <label>
            <span>검토 단계</span>
            <select
              onChange={(event) => setWorkflowFilter(event.target.value as ReviewWorkflowFilter)}
              value={workflowFilter}
            >
              {REVIEW_WORKFLOW_FILTER_OPTIONS.filter((option) => option !== "NOT_IN_REVIEW_QUARTER").map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "전체" : reviewWorkflowStatusLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select onChange={(event) => setSort(event.target.value)} value={sort}>
              <option value="feeDueDate,asc">마감 기한 빠른순</option>
              <option value="feeDueDate,desc">마감 기한 늦은순</option>
              <option value="title,asc">특허명 가나다순</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>특허명</th>
                <th>관리번호</th>
                <th>출원/등록번호</th>
                <th>관련사업 분야</th>
                <th>관련기술 / 제품</th>
                <th>검토 단계</th>
                <th>담당 사업부</th>
              </tr>
            </thead>
            <tbody>
              {displayedPatents.map((patent) => (
                <tr
                  className="clickable-row"
                  key={patent.patentId}
                  onClick={() => navigate(`/admin/patents/${patent.patentId}/edit`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/admin/patents/${patent.patentId}/edit`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <td>
                    <strong title={patent.title}>{patent.title}</strong>
                    <span className="table-subtext">{patent.applicationDate} 출원</span>
                  </td>
                  <td>{patent.managementNumber}</td>
                  <td>
                    {patent.applicationNumber}
                    <span className="table-subtext">{patent.registrationNumber ?? "등록번호 없음"}</span>
                  </td>
                  <td>{patent.businessArea}</td>
                  <td>
                    {patent.technologyArea}
                    <span className="table-subtext">{patent.productName}</span>
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
                        variant="border"
                      />
                    ) : (
                      <span className="table-subtext">{patent.departmentName || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {listedPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={7}>
                    조건에 해당하는 수정 대상 특허가 없습니다.
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
      </Section>
    </AppLayout>
  );
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-03, UI-LEGAL-04
 * @description 관리자 특허관리 검색, 필터, 정렬 조건에 맞는 수정 대상 특허 행을 반환한다.
 */
function getEditablePatentRows(
  patentList: PatentListItem[],
  keyword: string,
  reviewScope: DashboardScope,
  workflowFilter: ReviewWorkflowFilter,
  sort: string,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return patentList
    .filter((patent) => {
      const matchesScope =
        reviewScope === "ALL" ||
        (reviewScope === "QUARTER" && patent.reviewWorkflowStatus !== "NOT_IN_REVIEW_QUARTER") ||
        (reviewScope === "NOT_IN_QUARTER" && patent.reviewWorkflowStatus === "NOT_IN_REVIEW_QUARTER");

      const matchesWorkflow = workflowFilter === "ALL" || patent.reviewWorkflowStatus === workflowFilter;

      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        patent.title.toLowerCase().includes(normalizedKeyword) ||
        patent.managementNumber.toLowerCase().includes(normalizedKeyword) ||
        patent.applicationNumber.toLowerCase().includes(normalizedKeyword);

      return matchesScope && matchesWorkflow && matchesKeyword;
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sort));
}

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-LEGAL-04
 * @description 등록 폼 데이터를 특허관리 테이블에서 즉시 확인할 수 있는 특허 항목으로 변환한다.
 */
function createListItemFromForm(form: PatentFormState, patentId: string): PatentListItem {
  return {
    patentId,
    managementNumber: form.managementNumber,
    applicationNumber: form.applicationNumber,
    registrationNumber: form.registrationNumber,
    title: form.title,
    draftTitle: form.title,
    businessArea: form.businessArea,
    technologyArea: form.technologyArea,
    productName: form.productName,
    country: form.country || "N/A",
    coApplicants: form.coApplicants,
    applicationDate: form.applicationDate,
    registrationDate: form.registrationDate,
    expectedExpirationDate: form.expectedExpirationDate,
    departmentId: "",
    departmentName: "",
    lifecycleStatus: "ACTIVE",
    reviewWorkflowStatus: "NOT_IN_REVIEW_QUARTER",
    feeDueDate: getNextAnnualFeeDueDate(form.registrationDate || form.applicationDate),
    reviewReason: "관리자가 등록한 특허입니다. 검토 분기 도래 시 AI 평가 대상에 포함됩니다.",
    currentRecommendation: "HOLD",
    businessOpinionDecision: null,
    legalActionResult: null,
  };
}

function comparePatents(firstPatent: PatentListItem, secondPatent: PatentListItem, sort: string) {
  const [field, direction = "asc"] = sort.split(",");
  const multiplier = direction === "desc" ? -1 : 1;
  const firstValue = getSortablePatentValue(firstPatent, field);
  const secondValue = getSortablePatentValue(secondPatent, field);

  return firstValue.localeCompare(secondValue) * multiplier;
}

function getSortablePatentValue(patent: PatentListItem, field: string) {
  if (field === "feeDueDate") {
    return patent.feeDueDate;
  }

  return patent.title;
}
