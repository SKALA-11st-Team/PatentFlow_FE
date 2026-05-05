import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/common/Button";
import { Section } from "../../components/common/Section";
import { WorkflowStatusBadge } from "../../components/patent/WorkflowStatusBadge";
import { createPatent, lookupPatentBibliographicInfo, suggestPatentContextFields } from "../../api/patents";
import { patents } from "../../mocks/patents.mock";
import { reviewWorkflowStatusLabels, REVIEW_WORKFLOW_STATUSES } from "../../constants/status";
import type { PatentListItem, PatentUpsertPayload, ReviewWorkflowStatus } from "../../types/patent";
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
 * @relatedUI UI-003, UI-004
 * @description 관리자 특허 기본 정보 등록과 수정 대상 특허 테이블 조회 화면
 */
export function AdminPatentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patentList, setPatentList] = useState<PatentListItem[]>(() => [...patents]);
  const [form, setForm] = useState<PatentFormState>(emptyPatentForm);
  const [keyword, setKeyword] = useState("");
  const [businessAreaFilter, setBusinessAreaFilter] = useState(() => searchParams.get("businessArea") ?? "ALL");
  const [workflowFilter, setWorkflowFilter] = useState<ReviewWorkflowStatus | "ALL">("ALL");
  const [sort, setSort] = useState("annualFeeDueDate,asc");
  const [lookupMessage, setLookupMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSuggestingContext, setIsSuggestingContext] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const listedPatents = useMemo(
    () => getEditablePatentRows(patentList, keyword, businessAreaFilter, workflowFilter, sort),
    [businessAreaFilter, keyword, patentList, sort, workflowFilter],
  );
  const businessAreaOptions = useMemo(
    () => Array.from(new Set(patentList.map((patent) => patent.businessArea))).sort((first, second) => first.localeCompare(second, "ko")),
    [patentList],
  );

  async function handleLookupPatent() {
    if (!form.managementNumber.trim()) {
      setLookupMessage("관리번호를 입력한 뒤 검색해 주세요.");
      return;
    }

    setIsLookingUp(true);
    setLookupMessage("");
    setSaveMessage("");

    try {
      const result = await lookupPatentBibliographicInfo(form.managementNumber);

      if (!result) {
        setLookupMessage("KIPRIS와 Google Patents 검색 결과가 없습니다. 확인되는 값만 직접 입력해 주세요.");
        return;
      }

      setForm((currentForm) => ({
        ...currentForm,
        ...result,
        businessArea: currentForm.businessArea,
        technologyArea: currentForm.technologyArea,
        productName: currentForm.productName,
      }));
      setLookupMessage(
        result.source === "KIPRIS"
          ? "KIPRIS 검색 결과를 불러왔습니다."
          : "KIPRIS 결과가 없어 Google Patents 검색 결과를 불러왔습니다.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSavePatent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    if (!form.managementNumber.trim() || !form.title.trim()) {
      setSaveMessage("관리번호 검색 후 특허 기본 정보를 확인해 주세요.");
      return;
    }

    if (!form.registrationDate && !form.applicationDate) {
      setSaveMessage("연차료 기한 계산을 위해 출원일 또는 등록일이 필요합니다.");
      return;
    }

    if (!form.businessArea.trim() || !form.technologyArea.trim()) {
      setSaveMessage("관련사업 분야와 관련기술 분야는 사용자가 직접 입력해야 합니다.");
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
      setSaveMessage("특허가 등록되었습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * @relatedFR FR-003, FR-004
   * @relatedUI UI-004
   * @description 등록 폼의 특허명/제품 정보를 기준으로 관련사업/관련기술 분야 AI 추천값을 적용한다.
   */
  async function handleSuggestContextFields() {
    setLookupMessage("");
    setSaveMessage("");

    if (!form.title.trim() && !form.productName.trim() && !form.technologyArea.trim()) {
      setSaveMessage("특허명 또는 관련제품 정보가 있어야 AI 추천을 사용할 수 있습니다.");
      return;
    }

    setIsSuggestingContext(true);

    try {
      const suggestion = await suggestPatentContextFields(form);

      if (!suggestion) {
        setSaveMessage("가까운 기존 관련사업/관련기술 분야를 찾지 못했습니다. 직접 입력해 주세요.");
        return;
      }

      setForm((currentForm) => ({
        ...currentForm,
        businessArea: suggestion.businessArea,
        technologyArea: suggestion.technologyArea,
      }));
      setSaveMessage(
        `AI 추천: ${suggestion.businessArea} / ${suggestion.technologyArea} (신뢰도 ${suggestion.confidenceText})`,
      );
    } finally {
      setIsSuggestingContext(false);
    }
  }

  function handleFormChange(event: ChangeEvent<HTMLInputElement>) {
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
        description="관리번호로 KIPRIS를 먼저 조회하고, 결과가 없으면 Google Patents 검색을 백엔드에 요청하는 흐름입니다."
      >
        <form className="patent-edit-form" onSubmit={handleSavePatent}>
          <div className="external-lookup-row">
            <label>
              관리번호
              <input
                name="managementNumber"
                onChange={handleFormChange}
                placeholder="예: P202405001-KR0"
                value={form.managementNumber}
              />
            </label>
            <Button disabled={isLookingUp} onClick={handleLookupPatent} type="button" variant="secondary">
              {isLookingUp ? "검색 중" : "KIPRIS 검색"}
            </Button>
          </div>
          {lookupMessage ? <p className="notice patent-form-notice">{lookupMessage}</p> : null}
          <div className="context-suggestion-row">
            <div>
              <strong>관련 분야 AI 추천</strong>
              <span>기존 특허의 관련사업/관련기술 분야 중 가장 가까운 값을 추천합니다.</span>
            </div>
            <Button disabled={isSuggestingContext} onClick={handleSuggestContextFields} type="button" variant="secondary">
              <span aria-hidden="true" className="ai-sparkle-icon" />
              {isSuggestingContext ? "추천 중" : "AI 추천"}
            </Button>
          </div>
          <div className="patent-form-grid">
            <label>
              특허명
              <input name="title" readOnly value={form.title} />
            </label>
            <label>
              출원국
              <input name="country" readOnly value={form.country} />
            </label>
            <label>
              출원일
              <input name="applicationDate" readOnly type="date" value={form.applicationDate} />
            </label>
            <label>
              등록일
              <input name="registrationDate" readOnly type="date" value={form.registrationDate} />
            </label>
            <label>
              출원번호
              <input name="applicationNumber" readOnly value={form.applicationNumber} />
            </label>
            <label>
              등록번호
              <input name="registrationNumber" readOnly value={form.registrationNumber ?? ""} />
            </label>
            <label>
              공동출원인명
              <input name="coApplicants" placeholder="없으면 비워둠" readOnly value={form.coApplicants} />
            </label>
            <label>
              예상 소멸일
              <input
                name="expectedExpirationDate"
                readOnly
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
        title={businessAreaFilter === "ALL" ? "특허 수정" : `${businessAreaFilter} 특허 리스트`}
        description={`${listedPatents.length}건의 특허가 조회되었습니다. 행을 클릭하면 상세 수정 페이지로 이동합니다.`}
      >
        <div className="filter-bar patent-management-filter-bar">
          <label>
            검색
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="특허명, 관리번호, 출원번호"
              value={keyword}
            />
          </label>
          <label>
            관련사업 분야
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
            검토 단계
            <select
              onChange={(event) => setWorkflowFilter(event.target.value as ReviewWorkflowStatus | "ALL")}
              value={workflowFilter}
            >
              <option value="ALL">전체</option>
              {REVIEW_WORKFLOW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {reviewWorkflowStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            정렬
            <select onChange={(event) => setSort(event.target.value)} value={sort}>
              <option value="annualFeeDueDate,asc">마감 기한 빠른순</option>
              <option value="annualFeeDueDate,desc">마감 기한 늦은순</option>
              <option value="title,asc">특허명 가나다순</option>
              <option value="departmentName,asc">부서 가나다순</option>
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
              </tr>
            </thead>
            <tbody>
              {listedPatents.map((patent) => (
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
                </tr>
              ))}
              {listedPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={6}>
                    조건에 해당하는 수정 대상 특허가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-003, UI-004
 * @description 관리자 특허관리 검색, 필터, 정렬 조건에 맞는 수정 대상 특허 행을 반환한다.
 */
function getEditablePatentRows(
  patentList: PatentListItem[],
  keyword: string,
  businessAreaFilter: string,
  workflowFilter: ReviewWorkflowStatus | "ALL",
  sort: string,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return patentList
    .filter((patent) => {
      if (workflowFilter !== "ALL" && patent.reviewWorkflowStatus !== workflowFilter) {
        return false;
      }

      if (businessAreaFilter !== "ALL" && patent.businessArea !== businessAreaFilter) {
        return false;
      }

      return (
        normalizedKeyword.length === 0 ||
        patent.title.toLowerCase().includes(normalizedKeyword) ||
        patent.managementNumber.toLowerCase().includes(normalizedKeyword) ||
        patent.applicationNumber.toLowerCase().includes(normalizedKeyword)
      );
    })
    .sort((firstPatent, secondPatent) => comparePatents(firstPatent, secondPatent, sort));
}

/**
 * @relatedFR FR-003, FR-004
 * @relatedUI UI-004
 * @description 등록 폼 데이터를 특허관리 테이블에서 즉시 확인할 수 있는 특허 항목으로 변환한다.
 */
function createListItemFromForm(form: PatentFormState, patentId: string): PatentListItem {
  const department = getDepartmentFromBusinessArea(form.businessArea);

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
    departmentId: department.id,
    departmentName: department.name,
    lifecycleStatus: "ACTIVE",
    reviewWorkflowStatus: "NOT_IN_REVIEW_QUARTER",
    annualFeeDueDate: getNextAnnualFeeDueDate(form.registrationDate || form.applicationDate),
    reviewReason: "관리자가 등록한 특허입니다. 검토 분기 도래 시 AI 평가 대상에 포함됩니다.",
    currentRecommendation: "HOLD",
    businessOpinionDecision: null,
    executiveApprovalDecision: null,
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
  if (field === "annualFeeDueDate") {
    return patent.annualFeeDueDate;
  }

  if (field === "departmentName") {
    return patent.departmentName;
  }

  return patent.title;
}

function getDepartmentFromBusinessArea(businessArea: string) {
  const normalizedBusinessArea = businessArea.trim() || "미분류";

  return {
    id: `DEPT-${normalizedBusinessArea.toUpperCase()}`,
    name: `${normalizedBusinessArea} 담당`,
  };
}
