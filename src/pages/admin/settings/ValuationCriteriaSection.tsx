import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { MarkdownView } from "../../../components/common/MarkdownView";
import {
  DEFAULT_VALUATION_CRITERIA,
  getAiReportRegenSetting,
  getValuationCriteria,
  getValuationCriteriaHistory,
  getValuationPrompts,
  updateAiReportRegenSetting,
  updateValuationCriteria,
  updateValuationPrompt,
  type AiReportRegenSetting,
  type ValuationCriteria,
  type ValuationCriteriaPayload,
  type ValuationCriteriaVersion,
  type ValuationPrompt,
} from "../../../api/settings";
import { Button } from "../../../components/common/Button";
import { useToast } from "../../../components/common/toastContext";

const AXIS_LABELS: Record<string, string> = {
  legal: "권리성",
  technology: "기술성",
  market: "시장성",
  business_fit: "사업 연계성",
};

// 종합 점수 산출에 참여하는 3개 핵심 축(가중치 편집 대상).
const CORE_AXIS_ORDER = ["legal", "technology", "market"];
// 프롬프트 탭은 사업 연계성 포함 4개 축 모두 편집 가능.
const AXIS_ORDER = ["legal", "technology", "market", "business_fit"];

type NumberDraft = Record<string, string>;

const toDraft = (values: Record<string, number>): NumberDraft =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]));

const draftSum = (draft: NumberDraft) =>
  Object.values(draft).reduce((sum, value) => sum + (Number(value) || 0), 0);

const hasInvalidNumber = (draft: NumberDraft, { min = 0, max = 100 } = {}) =>
  Object.values(draft).some((value) => {
    const parsed = Number(value);
    return value.trim() === "" || Number.isNaN(parsed) || parsed < min || parsed > max;
  });

/**
 * @relatedFR FR-006, FR-007, FR-008, FR-LEGAL-21
 * @relatedUI UI-008
 * @description AI 특허 평가 레포트의 축 가중치와 Agent md 기반 세부 평가 기준을 관리한다.
 */
export function ValuationCriteriaSection() {
  const { showToast } = useToast();
  const [criteria, setCriteria] = useState<ValuationCriteria | null>(null);
  const [history, setHistory] = useState<ValuationCriteriaVersion[]>([]);
  const [axisDraft, setAxisDraft] = useState<NumberDraft>({});
  const [cutoffDraft, setCutoffDraft] = useState<NumberDraft>({});
  const [businessFitDraft, setBusinessFitDraft] = useState("60");
  const [prompts, setPrompts] = useState<ValuationPrompt[]>([]);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  const [promptReasons, setPromptReasons] = useState<Record<string, string>>({});
  const [activeAxis, setActiveAxis] = useState("legal");
  const [message, setMessage] = useState("");
  const [promptMessage, setPromptMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingPromptAxis, setSavingPromptAxis] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [regenSetting, setRegenSetting] = useState<AiReportRegenSetting>({ businessAllowed: false });
  const [isSavingRegen, setIsSavingRegen] = useState(false);
  const [regenMessage, setRegenMessage] = useState("");

  const applyCriteria = (next: ValuationCriteria) => {
    setCriteria(next);
    setAxisDraft(toDraft(next.config.axisWeights));
    setCutoffDraft(toDraft(next.config.gradeCutoffs));
    setBusinessFitDraft(String(next.config.businessFitOverrideThreshold ?? 60));
  };

  const applyPrompts = (nextPrompts: ValuationPrompt[]) => {
    setPrompts(nextPrompts);
    setPromptDrafts(Object.fromEntries(nextPrompts.map((item) => [item.axis, item.markdown])));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getValuationCriteria(), getValuationCriteriaHistory(), getValuationPrompts(), getAiReportRegenSetting()])
      .then(([current, versions, nextPrompts, regen]) => {
        if (!isMounted) return;
        applyCriteria(current);
        setHistory(versions);
        applyPrompts(nextPrompts);
        setRegenSetting(regen);
      })
      .catch((error) => {
        if (isMounted) setMessage(getApiErrorMessage(error, "가치평가 기준을 불러오지 못했습니다."));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const axisSum = draftSum(axisDraft);
  const axisInvalid = hasInvalidNumber(axisDraft, { min: 0.1, max: 100 }) || Math.abs(axisSum - 100) > 0.001;
  const cutoffA = Number(cutoffDraft.A);
  const cutoffB = Number(cutoffDraft.B);
  const cutoffInvalid =
    hasInvalidNumber(cutoffDraft) || !(100 >= cutoffA && cutoffA > cutoffB && cutoffB >= 0);
  const businessFit = Number(businessFitDraft);
  const businessFitInvalid =
    businessFitDraft.trim() === "" || Number.isNaN(businessFit) || businessFit < 0 || businessFit > 100;
  // subscoreWeights는 화면에서 편집하지 않으므로(편집 UI 없음) 검증에서 제외한다. 저장 시 마지막으로
  // 로드한 criteria.config.subscoreWeights를 그대로 패스스루해, 사용자가 손댈 수 없는 영역이 저장을 막지 않게 한다.
  const canSave = !axisInvalid && !cutoffInvalid && !businessFitInvalid;
  const activePrompt = prompts.find((item) => item.axis === activeAxis);
  const activePromptDraft = promptDrafts[activeAxis] ?? "";
  const isPromptDirty = Boolean(activePrompt && activePrompt.markdown !== activePromptDraft);

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setMessage("");
    const payload: ValuationCriteriaPayload = {
      axisWeights: Object.fromEntries(Object.entries(axisDraft).map(([key, value]) => [key, Number(value)])),
      gradeCutoffs: Object.fromEntries(Object.entries(cutoffDraft).map(([key, value]) => [key, Number(value)])),
      businessFitOverrideThreshold: businessFit,
      // 편집 UI가 없는 subscoreWeights는 마지막으로 로드한 값을 그대로 전송한다.
      subscoreWeights: criteria?.config.subscoreWeights ?? DEFAULT_VALUATION_CRITERIA.config.subscoreWeights,
    };
    try {
      const updated = await updateValuationCriteria(payload);
      applyCriteria(updated);
      showToast(`가치평가 기준 v${updated.config.version}이 저장되었습니다.`, "success");
      try {
        setHistory(await getValuationCriteriaHistory());
      } catch {
        // 이력 갱신 실패는 다음 진입 시 재조회한다.
      }
    } catch (error) {
      showToast(getApiErrorMessage(error, "가치평가 기준 저장에 실패했습니다."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!activePrompt || !isPromptDirty) return;
    setSavingPromptAxis(activeAxis);
    setPromptMessage("");
    try {
      const updated = await updateValuationPrompt(activeAxis, {
        markdown: activePromptDraft,
        reason: promptReasons[activeAxis],
        expectedChecksum: activePrompt.checksum,
      });
      setPrompts((current) => current.map((item) => (item.axis === activeAxis ? updated : item)));
      setPromptDrafts((drafts) => ({ ...drafts, [activeAxis]: updated.markdown }));
      setPromptReasons((drafts) => ({ ...drafts, [activeAxis]: "" }));
      showToast(`${updated.label} 세부 평가 기준 md가 저장되었습니다.`, "success");
    } catch (error) {
      setPromptMessage(getApiErrorMessage(error, "세부 평가 기준 md 저장에 실패했습니다."));
    } finally {
      setSavingPromptAxis(null);
    }
  };

  const handleRestoreDefaults = () => {
    const defaults = DEFAULT_VALUATION_CRITERIA.config;
    setAxisDraft(toDraft(defaults.axisWeights));
    setCutoffDraft(toDraft(defaults.gradeCutoffs));
    setBusinessFitDraft(String(defaults.businessFitOverrideThreshold ?? 60));
    // subscoreWeights는 편집 UI가 없으므로 저장 소스인 criteria.config에 기본값을 반영해 둔다.
    setCriteria((current) =>
      current
        ? { ...current, config: { ...current.config, subscoreWeights: defaults.subscoreWeights } }
        : current,
    );
    setMessage("기본값을 불러왔습니다. 저장해야 적용됩니다.");
  };

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>AI 가치평가 기준</h2>
          <p>
            권리성·기술성·시장성 3축 가중치와 AI 권고 기준점을 관리해요. 변경은 이후 생성되는 AI 레포트부터 적용돼요.
          </p>
        </div>
        <div className="inline-action-group">
          <Button onClick={handleRestoreDefaults} type="button" variant="secondary">
            기본값 복원
          </Button>
          <Button disabled={!canSave || isSaving} onClick={handleSave} type="button">
            {isSaving ? "저장 중..." : "가중치 저장"}
          </Button>
        </div>
      </div>

      {criteria ? (
        <p className="notice notice-compact">
          현재 적용 중: {criteria.isDefault ? "기본 기준(미설정)" : `v${criteria.config.version}`}
          {criteria.updatedBy ? ` · ${criteria.updatedBy}` : ""}
          {criteria.updatedAt ? ` · ${criteria.updatedAt.slice(0, 10)}` : ""}
        </p>
      ) : null}
      {message ? <p className="notice notice-compact">{message}</p> : null}

      <div className="valuation-criteria-grid">
        <div className="valuation-criteria-card">
          <h3>축 가중치</h3>
          <p className="valuation-criteria-help">
            종합 점수 산출 시 각 평가축의 비중이에요. 사업 연계성은 가중치 합산 대신 AI 권고 오버라이드로만 작용해요. 합계가 100이어야 해요.
          </p>
          {CORE_AXIS_ORDER.map((axis) => (
            <label className="valuation-criteria-field" key={axis}>
              <span>{AXIS_LABELS[axis]}</span>
              <input
                inputMode="decimal"
                max={100}
                min={0}
                onChange={(event) => setAxisDraft((draft) => ({ ...draft, [axis]: event.target.value }))}
                type="number"
                value={axisDraft[axis] ?? ""}
              />
            </label>
          ))}
          <p className={axisInvalid ? "field-error" : "valuation-criteria-sum"}>
            합계 {axisSum}
            {axisInvalid ? " - 합계가 100이어야 저장할 수 있어요." : " / 100"}
          </p>
        </div>

        <div className="valuation-criteria-card">
          <h3>AI 권고 기준</h3>
          <p className="valuation-criteria-help">평균 점수에 따른 AI 권고가 결정되는 기준점이에요.</p>
          <label className="valuation-criteria-field">
            <span>유지 권고 최소 점수</span>
            <input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => setCutoffDraft((draft) => ({ ...draft, A: event.target.value }))}
              type="number"
              value={cutoffDraft.A ?? ""}
            />
          </label>
          <label className="valuation-criteria-field">
            <span>조건부 유지 최소 점수</span>
            <input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => setCutoffDraft((draft) => ({ ...draft, B: event.target.value }))}
              type="number"
              value={cutoffDraft.B ?? ""}
            />
          </label>
          {cutoffInvalid ? <p className="field-error">유지 권고 최소 &gt; 조건부 유지 최소 ≥ 0 순서를 지켜야 해요.</p> : null}
          <label className="valuation-criteria-field" style={{ marginTop: "var(--spacing-sm)" }}>
            <span>사업 연계성 유지 권고 기준점</span>
            <input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => setBusinessFitDraft(event.target.value)}
              type="number"
              value={businessFitDraft}
            />
          </label>
          <p className="valuation-criteria-help" style={{ marginTop: "4px" }}>
            이 점수 이상이면 종합 점수와 관계없이 '유지 권고'로 조정돼요.
          </p>
          {businessFitInvalid ? <p className="field-error">0~100 사이 값이어야 해요.</p> : null}
        </div>
      </div>

      <div className="settings-editor-panel">
        <div className="section-header compact-section-header">
          <div>
            <h3>세부 평가 기준 md</h3>
            <p>점수 후보와 판단 기준은 Agent의 valuation prompt md 파일을 직접 편집합니다.</p>
          </div>
          <Button
            disabled={!isPromptDirty || savingPromptAxis === activeAxis}
            onClick={handleSavePrompt}
            type="button"
            variant="secondary"
          >
            {savingPromptAxis === activeAxis ? "저장 중..." : "md 저장"}
          </Button>
        </div>
        <div aria-label="가치평가 축 선택" className="settings-subnav settings-subnav-compact" role="tablist">
          {AXIS_ORDER.map((axis) => (
            <button
              aria-selected={activeAxis === axis}
              className={activeAxis === axis ? "selected" : ""}
              key={axis}
              onClick={() => { setActiveAxis(axis); setShowPreview(false); }}
              role="tab"
              type="button"
            >
              {AXIS_LABELS[axis]}
            </button>
          ))}
        </div>
        {activePrompt ? (
          <>
            {promptMessage ? <p className="field-error">{promptMessage}</p> : null}
            <label className="form-field" style={{ maxWidth: "480px" }}>
              <span className="form-label-text">변경 사유</span>
              <input
                onChange={(event) => setPromptReasons((drafts) => ({ ...drafts, [activeAxis]: event.target.value }))}
                placeholder="예: 권리보호력 점수 후보 보정"
                value={promptReasons[activeAxis] ?? ""}
              />
            </label>
            <div className="criteria-editor-toolbar">
              <button className={!showPreview ? "selected" : ""} onClick={() => setShowPreview(false)} type="button">편집</button>
              <button className={showPreview ? "selected" : ""} onClick={() => setShowPreview(true)} type="button">미리보기</button>
            </div>
            {showPreview ? (
              <div className="criteria-markdown-preview">
                <MarkdownView content={activePromptDraft} />
              </div>
            ) : (
              <textarea
                className="criteria-markdown-editor"
                onChange={(event) => setPromptDrafts((drafts) => ({ ...drafts, [activeAxis]: event.target.value }))}
                spellCheck={false}
                value={activePromptDraft}
              />
            )}
          </>
        ) : (
          <p className="empty-table-cell">Agent md 기준을 불러오지 못했습니다.</p>
        )}
      </div>

      <div className="settings-row">
        <label className="settings-label">
          <strong>사업부 AI 레포트 재생성 허용</strong>
          <small>활성화 시 사업부 사용자도 특허 상세 화면에서 AI 레포트를 재생성할 수 있습니다.</small>
        </label>
        <div className="settings-control">
          <label className="toggle-label">
            <input
              checked={regenSetting.businessAllowed}
              disabled={isSavingRegen}
              onChange={async (event) => {
                const next = event.target.checked;
                setIsSavingRegen(true);
                setRegenMessage("");
                try {
                  const updated = await updateAiReportRegenSetting(next);
                  setRegenSetting(updated);
                  setRegenMessage(next ? "사업부 재생성 허용으로 변경되었습니다." : "ADMIN/LEGAL 전용으로 변경되었습니다.");
                } catch (error) {
                  setRegenMessage(getApiErrorMessage(error, "설정 저장에 실패했습니다."));
                } finally {
                  setIsSavingRegen(false);
                }
              }}
              type="checkbox"
            />
            {regenSetting.businessAllowed ? "허용" : "비허용 (ADMIN/LEGAL 전용)"}
          </label>
          {regenMessage ? <span className="settings-message">{regenMessage}</span> : null}
        </div>
      </div>

      {history.length ? (
        <details className="valuation-criteria-advanced">
          <summary>변경 이력 ({history.length}건)</summary>
          <div className="history-mini-list">
            {history.map((item) => (
              <div key={item.version}>
                <strong>
                  v{item.version} · {item.createdBy ?? "관리자"} · {item.createdAt.slice(0, 10)}
                </strong>
                <span>
                  가중치 {Object.entries(item.config.axisWeights)
                    .filter(([axis]) => axis !== "business_fit")
                    .map(([axis, weight]) => `${AXIS_LABELS[axis] ?? axis} ${weight}`)
                    .join(", ")} · 유지 권고 기준 {(item.config.gradeCutoffs as Record<string, number>)?.A ?? "-"}점
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
