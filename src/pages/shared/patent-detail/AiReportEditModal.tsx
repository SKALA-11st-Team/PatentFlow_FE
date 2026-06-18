/**
 * @author 유건욱
 * @date 2026-06-11
 */
import { useMemo, useState } from "react";
import { Button } from "../../../components/common/Button";
import { MarkdownView } from "../../../components/common/MarkdownView";
import { Modal } from "../../../components/common/Modal";
import {
  RECOMMENDATIONS,
  evaluationCategoryLabels,
  getGradeTone,
  recommendationLabels,
} from "../../../constants/status";
import { Badge } from "../../../components/common/Badge";
import type {
  AiEvaluationReport,
  AiReportOverridesPayload,
  AiReportScoreOverridePayload,
  Recommendation,
} from "../../../types/patent";

interface AiReportEditModalProps {
  report: AiEvaluationReport;
  // 사업부가 이미 회신한 경우 저장 전 확인 경고를 띄운다.
  hasBusinessResponse: boolean;
  isSaving: boolean;
  errorMessage: string;
  onSave: (overrides: AiReportOverridesPayload) => Promise<boolean>;
  onClose: () => void;
}

interface ScoreDraft {
  score: string;
  evidenceSummary: string;
}

// 점수(0~100)로 축별 등급(A/B/C/D)을 미리보기 산출한다. 컷오프 80/60/40은 Agent의
// 축 등급 산정(grade_for_score)과 동일하며, 전송 시 BE는 이 grade 값을 그대로 저장한다.
function previewGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

const linesToList = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * @relatedFR FR-LEGAL-09
 * @relatedUI UI-LEGAL-04
 * @description 법무팀이 AI 평가 레포트(권고/사유/축별 점수·근거/판단근거/사업부 확인 요청/전문)를
 *     편집하는 모달. 수정한 필드만 오버라이드로 전송하고 AI 원본은 BE에 불변 보존된다.
 */
export function AiReportEditModal({
  report,
  hasBusinessResponse,
  isSaving,
  errorMessage,
  onSave,
  onClose,
}: AiReportEditModalProps) {
  const [recommendation, setRecommendation] = useState<Recommendation>(report.recommendation);
  const [recommendationText, setRecommendationText] = useState(report.recommendationText);
  const [keyEvidence, setKeyEvidence] = useState(report.keyEvidence ?? "");
  const [judgementGroundsText, setJudgementGroundsText] = useState((report.judgementGrounds ?? []).join("\n"));
  const [businessCheckRequestsText, setBusinessCheckRequestsText] = useState(
    (report.businessCheckRequests ?? []).join("\n"),
  );
  const [rawMarkdown, setRawMarkdown] = useState(report.rawMarkdown ?? "");
  // markdown 편집 모드: 편집 전용 / 편집+미리보기 분할 / 미리보기 전용.
  const [markdownMode, setMarkdownMode] = useState<"edit" | "split" | "preview">("edit");
  const [isConfirmingBusinessOverwrite, setIsConfirmingBusinessOverwrite] = useState(false);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, ScoreDraft>>(() =>
    Object.fromEntries(
      report.scores.map((score) => [
        score.category,
        { score: score.score === null ? "" : String(score.score), evidenceSummary: score.evidenceSummary },
      ]),
    ),
  );

  const updateScoreDraft = (category: string, patch: Partial<ScoreDraft>) => {
    setScoreDrafts((current) => ({ ...current, [category]: { ...current[category], ...patch } }));
  };

  // 수정된 필드만 모아 오버라이드를 구성한다 — 미수정 필드는 보내지 않아 AI 원본 값이 유지된다.
  const overrides = useMemo<AiReportOverridesPayload>(() => {
    const result: AiReportOverridesPayload = {};
    if (recommendation !== report.recommendation) result.recommendation = recommendation;
    if (recommendationText.trim() !== report.recommendationText) result.recommendationText = recommendationText.trim();
    if (keyEvidence.trim() !== (report.keyEvidence ?? "")) result.keyEvidence = keyEvidence.trim();
    if (judgementGroundsText !== (report.judgementGrounds ?? []).join("\n")) {
      result.judgementGrounds = linesToList(judgementGroundsText);
    }
    if (businessCheckRequestsText !== (report.businessCheckRequests ?? []).join("\n")) {
      result.businessCheckRequests = linesToList(businessCheckRequestsText);
    }
    if (rawMarkdown !== (report.rawMarkdown ?? "")) result.rawMarkdown = rawMarkdown;

    const scoreOverrides: AiReportScoreOverridePayload[] = [];
    for (const original of report.scores) {
      const draft = scoreDrafts[original.category];
      if (!draft) continue;
      const draftScore = draft.score.trim() === "" ? null : Number(draft.score);
      const scoreChanged = draftScore !== original.score && !(draftScore === null && original.score === null);
      const summaryChanged = draft.evidenceSummary.trim() !== original.evidenceSummary;
      if (!scoreChanged && !summaryChanged) continue;
      scoreOverrides.push({
        category: original.category,
        ...(scoreChanged && draftScore !== null
          ? { score: draftScore, grade: previewGrade(draftScore) }
          : {}),
        ...(summaryChanged ? { evidenceSummary: draft.evidenceSummary.trim() } : {}),
      });
    }
    if (scoreOverrides.length) result.scores = scoreOverrides;
    return result;
  }, [
    report,
    recommendation,
    recommendationText,
    keyEvidence,
    judgementGroundsText,
    businessCheckRequestsText,
    rawMarkdown,
    scoreDrafts,
  ]);

  const hasChanges = Object.keys(overrides).length > 0;
  const hasInvalidScore = report.scores.some((score) => {
    const draft = scoreDrafts[score.category];
    if (!draft) return false;
    if (draft.score.trim() === "") {
      // 원래 점수가 있던 축을 비우는 것은 '점수 삭제'가 아니라 미입력 — 조용히 무시되지 않도록 차단한다.
      return score.score !== null;
    }
    const value = Number(draft.score);
    return Number.isNaN(value) || value < 0 || value > 100;
  });

  const handleSubmit = async () => {
    if (!hasChanges || hasInvalidScore) return;
    if (hasBusinessResponse && !isConfirmingBusinessOverwrite) {
      setIsConfirmingBusinessOverwrite(true);
      return;
    }
    await onSave(overrides);
  };

  // 저장하지 않은 변경이 있으면 닫기 전에 확인한다(ESC/바깥 클릭 포함).
  const handleClose = () => {
    if (hasChanges && !window.confirm("저장하지 않은 수정 내용이 있습니다. 닫으시겠습니까?")) {
      return;
    }
    onClose();
  };

  return (
    <Modal ariaLabel="AI 레포트 수정" className="business-checklist-modal ai-report-edit-modal" onClose={handleClose}>
      <div className="modal-header">
        <h2>AI 레포트 수정</h2>
        <p>수정한 항목만 저장되며, AI 원본 레포트는 그대로 보존됩니다.</p>
      </div>

      <div className="ai-report-edit-form">
        <label className="field-label">
          AI 권고
          <select
            onChange={(event) => setRecommendation(event.target.value as Recommendation)}
            value={recommendation}
          >
            {RECOMMENDATIONS.map((value) => (
              <option key={value} value={value}>
                {recommendationLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          권고 사유
          <textarea
            onChange={(event) => setRecommendationText(event.target.value)}
            rows={3}
            value={recommendationText}
          />
        </label>

        <div className="ai-report-edit-scores">
          <h3>축별 평가</h3>
          {report.scores.map((score) => {
            const draft = scoreDrafts[score.category];
            const draftScore = draft?.score.trim() === "" ? null : Number(draft?.score);
            const isInvalid =
              draftScore === null
                ? score.score !== null
                : Number.isNaN(draftScore) || draftScore < 0 || draftScore > 100;
            return (
              <div className="ai-report-edit-score-row" key={score.category}>
                <div className="ai-report-edit-score-head">
                  <strong>{evaluationCategoryLabels[score.category]}</strong>
                  <div className="ai-report-edit-score-input">
                    <input
                      aria-label={`${evaluationCategoryLabels[score.category]} 점수`}
                      inputMode="numeric"
                      max={100}
                      min={0}
                      onChange={(event) => updateScoreDraft(score.category, { score: event.target.value })}
                      type="number"
                      value={draft?.score ?? ""}
                    />
                    <span>/ 100</span>
                    {draftScore !== null && !isInvalid ? (
                      <Badge tone={getGradeTone(previewGrade(draftScore))}>{previewGrade(draftScore)}</Badge>
                    ) : null}
                  </div>
                </div>
                {isInvalid ? (
                  <p className="field-error">
                    {draftScore === null ? "점수를 입력해 주세요(비울 수 없습니다)." : "점수는 0~100 사이여야 합니다."}
                  </p>
                ) : null}
                <textarea
                  aria-label={`${evaluationCategoryLabels[score.category]} 근거`}
                  onChange={(event) => updateScoreDraft(score.category, { evidenceSummary: event.target.value })}
                  rows={2}
                  value={draft?.evidenceSummary ?? ""}
                />
              </div>
            );
          })}
        </div>

        <label className="field-label">
          핵심 근거
          <textarea onChange={(event) => setKeyEvidence(event.target.value)} rows={2} value={keyEvidence} />
        </label>

        <label className="field-label">
          판단 근거 (한 줄에 한 항목)
          <textarea
            onChange={(event) => setJudgementGroundsText(event.target.value)}
            rows={4}
            value={judgementGroundsText}
          />
        </label>

        <label className="field-label">
          사업부 확인 요청 사항 (한 줄에 한 항목)
          <textarea
            onChange={(event) => setBusinessCheckRequestsText(event.target.value)}
            rows={3}
            value={businessCheckRequestsText}
          />
        </label>

        <div className="ai-report-edit-markdown">
          <div className="ai-report-edit-markdown-head">
            <h3>레포트 전문 (markdown)</h3>
            <div className="ai-report-edit-markdown-tools">
              <span className="ai-report-edit-charcount">{rawMarkdown.length.toLocaleString()}자</span>
              <div className="segmented-control" role="tablist">
                {([
                  ["edit", "편집"],
                  ["split", "분할"],
                  ["preview", "미리보기"],
                ] as const).map(([mode, label]) => (
                  <button
                    aria-selected={markdownMode === mode}
                    className={markdownMode === mode ? "active" : ""}
                    key={mode}
                    onClick={() => setMarkdownMode(mode)}
                    role="tab"
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={`ai-report-edit-markdown-body ${markdownMode === "split" ? "is-split" : ""}`}>
            {markdownMode !== "preview" ? (
              <textarea
                aria-label="레포트 전문 markdown"
                onChange={(event) => setRawMarkdown(event.target.value)}
                rows={14}
                spellCheck={false}
                value={rawMarkdown}
              />
            ) : null}
            {markdownMode !== "edit" ? (
              <div className="ai-report-edit-markdown-preview">
                <MarkdownView content={rawMarkdown || "(내용 없음)"} />
              </div>
            ) : null}
          </div>
        </div>

        {isConfirmingBusinessOverwrite ? (
          <p className="notice notice-warning">
            사업부가 이미 이 레포트를 보고 의견을 제출했습니다. 수정해도 사업부 제출 시점 레포트는 따로
            보존되지만, 이후 화면에는 수정본이 표시됩니다. 계속하시겠습니까?
          </p>
        ) : null}
        {errorMessage ? <p className="notice notice-warning">{errorMessage}</p> : null}
      </div>

      <div className="modal-actions">
        <Button onClick={handleClose} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={!hasChanges || hasInvalidScore || isSaving} onClick={handleSubmit} type="button">
          {isSaving ? "저장 중..." : isConfirmingBusinessOverwrite ? "확인하고 저장" : "수정 저장"}
        </Button>
      </div>
    </Modal>
  );
}
