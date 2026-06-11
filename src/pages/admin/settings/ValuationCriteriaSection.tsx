import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import {
  DEFAULT_VALUATION_CRITERIA,
  getValuationCriteria,
  getValuationCriteriaHistory,
  getValuationPrompts,
  updateValuationCriteria,
  updateValuationPrompt,
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

const AXIS_ORDER = ["legal", "technology", "market", "business_fit"];

type NumberDraft = Record<string, string>;
type GroupDraft = Record<string, NumberDraft>;

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
  const [thresholdDraft, setThresholdDraft] = useState("60");
  const [subscoreDraft, setSubscoreDraft] = useState<GroupDraft>({});
  const [prompts, setPrompts] = useState<ValuationPrompt[]>([]);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  const [promptReasons, setPromptReasons] = useState<Record<string, string>>({});
  const [activeAxis, setActiveAxis] = useState("legal");
  const [message, setMessage] = useState("");
  const [promptMessage, setPromptMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingPromptAxis, setSavingPromptAxis] = useState<string | null>(null);

  const applyCriteria = (next: ValuationCriteria) => {
    setCriteria(next);
    setAxisDraft(toDraft(next.config.axisWeights));
    setCutoffDraft(toDraft(next.config.gradeCutoffs));
    setThresholdDraft(String(next.config.maintainThreshold));
    setSubscoreDraft(
      Object.fromEntries(
        Object.entries(next.config.subscoreWeights).map(([group, values]) => [group, toDraft(values)]),
      ),
    );
  };

  const applyPrompts = (nextPrompts: ValuationPrompt[]) => {
    setPrompts(nextPrompts);
    setPromptDrafts(Object.fromEntries(nextPrompts.map((item) => [item.axis, item.markdown])));
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getValuationCriteria(), getValuationCriteriaHistory(), getValuationPrompts()])
      .then(([current, versions, nextPrompts]) => {
        if (!isMounted) return;
        applyCriteria(current);
        setHistory(versions);
        applyPrompts(nextPrompts);
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
  const cutoffC = Number(cutoffDraft.C);
  const cutoffInvalid =
    hasInvalidNumber(cutoffDraft) || !(100 >= cutoffA && cutoffA > cutoffB && cutoffB > cutoffC && cutoffC >= 0);
  const threshold = Number(thresholdDraft);
  const thresholdInvalid = thresholdDraft.trim() === "" || Number.isNaN(threshold) || threshold < 0 || threshold > 100;
  const invalidSubscoreGroups = useMemo(
    () =>
      Object.entries(subscoreDraft)
        .filter(([, draft]) => hasInvalidNumber(draft) || draftSum(draft) !== 100)
        .map(([group]) => group),
    [subscoreDraft],
  );
  const canSave = !axisInvalid && !cutoffInvalid && !thresholdInvalid && invalidSubscoreGroups.length === 0;
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
      maintainThreshold: threshold,
      subscoreWeights: Object.fromEntries(
        Object.entries(subscoreDraft).map(([group, draft]) => [
          group,
          Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, Number(value)])),
        ]),
      ),
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
    setThresholdDraft(String(defaults.maintainThreshold));
    setSubscoreDraft(
      Object.fromEntries(
        Object.entries(defaults.subscoreWeights).map(([group, values]) => [group, toDraft(values)]),
      ),
    );
    setMessage("기본값을 불러왔습니다. 저장해야 적용됩니다.");
  };

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>AI 가치평가 기준</h2>
          <p>
            4개 평가축의 가중치와 Agent md 파일의 세부 평가 기준을 관리합니다. 변경은 이후 생성되는 AI 레포트부터 적용됩니다.
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
          <p className="valuation-criteria-help">평균 점수 산출 시 각 평가축의 비중입니다. 합계가 100이어야 합니다.</p>
          {Object.keys(AXIS_LABELS).map((axis) => (
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
            {axisInvalid ? " - 합계가 100이어야 저장할 수 있습니다." : " / 100"}
          </p>
        </div>

        <div className="valuation-criteria-card">
          <h3>등급 컷오프 · 유지 임계</h3>
          <p className="valuation-criteria-help">평균 점수 기준 등급 경계와 '유지 권고' 최소 점수입니다.</p>
          {(["A", "B", "C"] as const).map((grade) => (
            <label className="valuation-criteria-field" key={grade}>
              <span>{grade} 등급 최소 점수</span>
              <input
                inputMode="decimal"
                max={100}
                min={0}
                onChange={(event) => setCutoffDraft((draft) => ({ ...draft, [grade]: event.target.value }))}
                type="number"
                value={cutoffDraft[grade] ?? ""}
              />
            </label>
          ))}
          {cutoffInvalid ? <p className="field-error">100 ≥ A &gt; B &gt; C ≥ 0 순서를 지켜야 합니다.</p> : null}
          <label className="valuation-criteria-field">
            <span>유지 권고 임계 점수</span>
            <input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => setThresholdDraft(event.target.value)}
              type="number"
              value={thresholdDraft}
            />
          </label>
          {thresholdInvalid ? <p className="field-error">0~100 사이 값이어야 합니다.</p> : null}
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
              onClick={() => setActiveAxis(axis)}
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
            <textarea
              className="criteria-markdown-editor"
              onChange={(event) => setPromptDrafts((drafts) => ({ ...drafts, [activeAxis]: event.target.value }))}
              spellCheck={false}
              value={activePromptDraft}
            />
          </>
        ) : (
          <p className="empty-table-cell">Agent md 기준을 불러오지 못했습니다.</p>
        )}
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
                    .map(([axis, weight]) => `${AXIS_LABELS[axis] ?? axis} ${weight}`)
                    .join(", ")} · 유지 임계 {item.config.maintainThreshold}점
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
