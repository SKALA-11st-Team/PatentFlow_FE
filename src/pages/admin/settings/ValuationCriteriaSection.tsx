import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import {
  DEFAULT_VALUATION_CRITERIA,
  getValuationCriteria,
  getValuationCriteriaHistory,
  updateValuationCriteria,
  type ValuationCriteria,
  type ValuationCriteriaPayload,
  type ValuationCriteriaVersion,
} from "../../../api/settings";
import { Button } from "../../../components/common/Button";
import { useToast } from "../../../components/common/toastContext";

const AXIS_LABELS: Record<string, string> = {
  legal: "권리성",
  technology: "기술성",
  market: "시장성",
  business_fit: "사업 연계성",
};

const SUBSCORE_GROUP_LABELS: Record<string, string> = {
  legal: "권리성 세부 배점",
  business_fit: "사업 연계성 세부 배점",
};

const SUBSCORE_LABELS: Record<string, string> = {
  right_stability: "권리안정성",
  claim_protection: "권리보호력",
  portfolio_defensive_value: "포트폴리오·해외 권리",
  official_business_evidence: "공식 사업 근거",
  product_function_direct_match: "제품·기능 직접 일치",
  business_context_fit: "사업 맥락 적합성",
};

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
 * @relatedFR FR-LEGAL-09
 * @relatedUI UI-LEGAL-07 (UI-008 평가 기준 구성)
 * @description 리걸팀이 AI 가치평가 에이전트의 평가 세부사항(축 가중치/등급 컷오프/유지 임계/
 *     subscore 배점)을 조정하는 관리자 설정 섹션. 변경은 이후 생성되는 레포트부터 적용된다.
 */
export function ValuationCriteriaSection() {
  const { showToast } = useToast();
  const [criteria, setCriteria] = useState<ValuationCriteria | null>(null);
  const [history, setHistory] = useState<ValuationCriteriaVersion[]>([]);
  const [axisDraft, setAxisDraft] = useState<NumberDraft>({});
  const [cutoffDraft, setCutoffDraft] = useState<NumberDraft>({});
  const [thresholdDraft, setThresholdDraft] = useState("60");
  const [subscoreDraft, setSubscoreDraft] = useState<GroupDraft>({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    Promise.all([getValuationCriteria(), getValuationCriteriaHistory()])
      .then(([current, versions]) => {
        if (!isMounted) return;
        applyCriteria(current);
        setHistory(versions);
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
      setHistory(await getValuationCriteriaHistory());
      setMessage("");
      showToast(
        `가치평가 기준 v${updated.config.version}이 저장되었습니다. 이후 생성되는 AI 레포트부터 적용됩니다.`,
        "success",
      );
    } catch (error) {
      showToast(getApiErrorMessage(error, "가치평가 기준 저장에 실패했습니다."), "error");
    } finally {
      setIsSaving(false);
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
            축 가중치·등급 컷오프·유지 권고 임계값·세부 배점을 조정합니다. 저장 후 새로 생성되는 AI
            레포트부터 적용되며, 기존 레포트는 다시 채점되지 않습니다.
          </p>
        </div>
        <div className="inline-action-group">
          <Button onClick={handleRestoreDefaults} type="button" variant="secondary">
            기본값 복원
          </Button>
          <Button disabled={!canSave || isSaving} onClick={handleSave} type="button">
            {isSaving ? "저장 중..." : "기준 저장"}
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
            평균 점수 산출 시 각 평가축의 비중입니다. 합계가 100이어야 합니다.
          </p>
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
            {axisInvalid ? " — 합계가 100이어야 저장할 수 있습니다." : " / 100"}
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

      <details className="valuation-criteria-advanced">
        <summary>세부 배점 (고급)</summary>
        <div className="valuation-criteria-grid">
          {Object.entries(subscoreDraft).map(([group, draft]) => (
            <div className="valuation-criteria-card" key={group}>
              <h3>{SUBSCORE_GROUP_LABELS[group] ?? group}</h3>
              {Object.keys(draft).map((key) => (
                <label className="valuation-criteria-field" key={key}>
                  <span>{SUBSCORE_LABELS[key] ?? key}</span>
                  <input
                    inputMode="numeric"
                    max={100}
                    min={0}
                    onChange={(event) =>
                      setSubscoreDraft((current) => ({
                        ...current,
                        [group]: { ...current[group], [key]: event.target.value },
                      }))
                    }
                    type="number"
                    value={draft[key] ?? ""}
                  />
                </label>
              ))}
              <p className={invalidSubscoreGroups.includes(group) ? "field-error" : "valuation-criteria-sum"}>
                합계 {draftSum(draft)}
                {invalidSubscoreGroups.includes(group) ? " — 합계가 100이어야 합니다." : " / 100"}
              </p>
            </div>
          ))}
        </div>
      </details>

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
                    .join(", ")}{" "}
                  · 유지 임계 {item.config.maintainThreshold}점
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
