import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPatentDetail, suggestPatentContextFields, updatePatent } from "../../api/patents";
import { getApiErrorMessage } from "../../api/client";
import { getClassifications, type ClassificationGroup } from "../../api/settings";
import { Button } from "../../components/common/Button";
import { Section } from "../../components/common/Section";
import { AppLayout } from "../../components/layout/AppLayout";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { PatentPdfManager } from "../../components/patent/PatentPdfManager";
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
  // PATENT-06: 외부 서지 정보는 기본 잠금(외부 원문 기준)이나, 잘못된 값 정정을 위해 등록 화면과 동일한 수동 편집 토글을 제공한다.
  const [isManualMetadataEditEnabled, setIsManualMetadataEditEnabled] = useState(false);

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
    } catch (error) {
      setSaveMessage(getApiErrorMessage(error, "AI 분야 추천에 실패했습니다. 잠시 후 다시 시도해 주세요."));
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
      <Breadcrumbs
        items={[
          { label: "특허관리", to: "/admin/patents" },
          { label: patent.title, to: `/admin/patents/${patentId}` },
          { label: "정보 수정" },
        ]}
      />
      <Section
        title={patent.title}
        description="테이블 row에서 선택한 특허입니다. 수정 후 저장하면 특허관리 목록에 반영됩니다."
      >
        <form className="patent-edit-form" onSubmit={handleSavePatent}>
          <div className="readonly-lock-banner" role="note">
            <strong>외부 서지 정보 {isManualMetadataEditEnabled ? "수동 정정 중" : "잠금"}</strong>
            <span>특허명, 출원국, 출원일, 등록일, 번호 정보는 외부 조회 원문 기준으로 고정됩니다. 회사 컨텍스트와 관리번호만 수정할 수 있습니다.</span>
            <Button
              onClick={() => setIsManualMetadataEditEnabled((enabled) => !enabled)}
              type="button"
              variant="secondary"
            >
              {isManualMetadataEditEnabled ? "잠금" : "잘못된 값 수동 정정"}
            </Button>
          </div>
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
          <PatentPdfManager patentId={currentPatentId} />
          <div className="patent-form-grid">
            <label>
              관리번호
              <input name="managementNumber" onChange={handleFormChange} value={form.managementNumber} />
            </label>
            <label>
              특허명
              <input aria-label="특허명, 외부 서지 정보" name="title" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} value={form.title} />
            </label>
            <label>
              출원국
              <input aria-label="출원국, 외부 서지 정보" name="country" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} value={form.country} />
            </label>
            <label>
              출원일
              <input aria-label="출원일, 외부 서지 정보" name="applicationDate" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} type="date" value={form.applicationDate} />
            </label>
            <label>
              등록일
              <input aria-label="등록일, 외부 서지 정보" name="registrationDate" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} type="date" value={form.registrationDate} />
            </label>
            <label>
              출원번호
              <input aria-label="출원번호, 외부 서지 정보" name="applicationNumber" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} value={form.applicationNumber} />
            </label>
            <label>
              등록번호
              <input aria-label="등록번호, 외부 서지 정보" name="registrationNumber" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} value={form.registrationNumber ?? ""} />
            </label>
            <label>
              공동출원인명
              <input aria-label="공동출원인명, 외부 서지 정보" name="coApplicants" onChange={handleFormChange} placeholder="없으면 비워둠" readOnly={!isManualMetadataEditEnabled} value={form.coApplicants} />
            </label>
            <label>
              예상 소멸일
              <input aria-label="예상 소멸일, 외부 서지 정보" name="expectedExpirationDate" onChange={handleFormChange} readOnly={!isManualMetadataEditEnabled} type="date" value={form.expectedExpirationDate} />
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
