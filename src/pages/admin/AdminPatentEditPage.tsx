import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPatentDetail, suggestPatentContextFields, updatePatent } from "../../api/patents";
import { getClassifications, type ClassificationGroup } from "../../api/settings";
import { Button } from "../../components/common/Button";
import { Section } from "../../components/common/Section";
import { AppLayout } from "../../components/layout/AppLayout";
import type { PatentListItem, PatentUpsertPayload } from "../../types/patent";

type PatentFormState = PatentUpsertPayload;

/**
 * @relatedFR FR-LEGAL-03, FR-LEGAL-04
 * @relatedUI UI-LEGAL-04
 * @description 특허관리 테이블에서 선택한 특허의 기본 정보와 회사 컨텍스트를 상세 수정한다.
 */
export function AdminPatentEditPage() {
  const { patentId } = useParams();
  const navigate = useNavigate();
  const [patent, setPatent] = useState<PatentListItem | null>(null);
  const [form, setForm] = useState<PatentFormState>(() => createEmptyFormState());
  const [saveMessage, setSaveMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("특허 정보를 불러오는 중입니다.");
  const [isSuggestingContext, setIsSuggestingContext] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [classifications, setClassifications] = useState<ClassificationGroup[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadPatent() {
      if (!patentId) {
        setLoadMessage("수정할 특허 ID가 없습니다.");
        return;
      }

      try {
        const detail = await getPatentDetail(patentId);

        if (!isMounted) {
          return;
        }

        if (!detail) {
          setLoadMessage("수정할 특허를 찾을 수 없습니다.");
          return;
        }

        setPatent(detail);
        setForm(createFormStateFromPatent(detail));
        setLoadMessage("");
      } catch {
        if (isMounted) {
          setLoadMessage("특허 정보를 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
        }
      }
    }

    loadPatent();
    getClassifications().then(setClassifications).catch(() => setClassifications([]));

    return () => {
      isMounted = false;
    };
  }, [patentId]);

  if (!patent || !patentId) {
    return (
      <AppLayout role="ADMIN" title="특허 정보 수정" description="수정할 특허를 확인합니다.">
        <Section title="수정 대상 없음">
          <p className="empty-state">{loadMessage}</p>
          <Link className="back-link" to="/admin/patents">
            특허관리로 돌아가기
          </Link>
        </Section>
      </AppLayout>
    );
  }
  const currentPatentId = patentId;
  const businessClassifications = getClassificationValues(classifications, "BUSINESS");
  const technologyClassifications = getClassificationValues(classifications, "TECHNOLOGY");

  async function handleSavePatent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    if (!form.managementNumber.trim() || !form.title.trim()) {
      setSaveMessage("관리번호와 특허명을 확인해 주세요.");
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
      await updatePatent(currentPatentId, form);
      setSaveMessage("특허 정보가 수정되었습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * @relatedFR FR-LEGAL-03, FR-LEGAL-04
   * @relatedUI UI-LEGAL-04
   * @description 수정 폼의 특허명/제품 정보를 기준으로 관련사업/관련기술 분야 AI 추천값을 적용한다.
   */
  async function handleSuggestContextFields() {
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
      title="특허 정보 수정"
      description="선택한 특허의 기본 정보와 회사 컨텍스트를 상세 수정합니다."
    >
      <Section
        title={patent.title}
        description="테이블 row에서 선택한 특허입니다. 수정 후 저장하면 특허관리 목록에 반영됩니다."
      >
        <form className="patent-edit-form" onSubmit={handleSavePatent}>
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
              관리번호
              <input name="managementNumber" onChange={handleFormChange} value={form.managementNumber} />
            </label>
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
              <input name="expectedExpirationDate" readOnly type="date" value={form.expectedExpirationDate} />
            </label>
            <label>
              관련사업 분야
              <input list="edit-business-area-options" name="businessArea" onChange={handleFormChange} value={form.businessArea} />
            </label>
            <label>
              관련기술 분야
              <input list="edit-technology-area-options" name="technologyArea" onChange={handleFormChange} value={form.technologyArea} />
            </label>
            <label>
              관련제품
              <input name="productName" onChange={handleFormChange} value={form.productName} />
            </label>
          </div>
          <datalist id="edit-business-area-options">
            {businessClassifications.map((value) => <option key={value} value={value} />)}
          </datalist>
          <datalist id="edit-technology-area-options">
            {technologyClassifications.map((value) => <option key={value} value={value} />)}
          </datalist>
          <div className="form-actions">
            <Button onClick={() => navigate("/admin/patents")} type="button" variant="secondary">
              목록으로
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "저장 중" : "수정 저장"}
            </Button>
          </div>
          {saveMessage ? <p className="notice patent-form-notice">{saveMessage}</p> : null}
        </form>
      </Section>
    </AppLayout>
  );
}

function getClassificationValues(classifications: ClassificationGroup[], type: ClassificationGroup["type"]) {
  return classifications.find((group) => group.type === type)?.values ?? [];
}

/**
 * @relatedFR FR-LEGAL-03, FR-LEGAL-04
 * @relatedUI UI-LEGAL-04
 * @description 선택한 특허 행 데이터를 상세 수정 폼 상태로 변환한다.
 */
function createFormStateFromPatent(patent: PatentListItem): PatentFormState {
  return {
    managementNumber: patent.managementNumber,
    title: patent.title,
    applicationDate: patent.applicationDate,
    coApplicants: patent.coApplicants,
    country: patent.country,
    registrationDate: patent.registrationDate,
    applicationNumber: patent.applicationNumber,
    registrationNumber: patent.registrationNumber,
    expectedExpirationDate: patent.expectedExpirationDate,
    source: "KIPRIS",
    businessArea: patent.businessArea === "N/A" ? "" : patent.businessArea,
    technologyArea: patent.technologyArea === "N/A" ? "" : patent.technologyArea,
    productName: patent.productName,
  };
}

function createEmptyFormState(): PatentFormState {
  return {
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
}
