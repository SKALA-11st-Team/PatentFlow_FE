import { useState } from "react";
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Section } from "../../../components/common/Section";
import { businessOpinionLabels } from "../../../constants/status";
import { getBusinessChecklistTotal, getChecklistResponse } from "../../../utils/businessChecklist";
import type { BusinessChecklistItem, BusinessChecklistSubmission } from "../../../types/businessChecklist";
import type { UserRole } from "../../../types/patent";
import { hasCompleteBusinessChecklistSubmission } from "./PatentDetailHooks";

interface BusinessOpinionSectionProps {
  isAdmin: boolean;
  role: UserRole;
  hasSubmittedBusinessChecklist: boolean;
  displayedBusinessOpinionLabel: string | null;
  displayedBusinessOpinionComment: string | null;
  checklistTotal: number;
  businessChecklistSubmission: BusinessChecklistSubmission;
  businessChecklistItems: BusinessChecklistItem[];
  onOpenChecklist: () => void;
}

/**
 * @relatedFR FR-BUS-01, FR-BUS-04, FR-BUS-05
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03
 * @description 사업부 의견과 체크리스트 요약을 관리자/사업부 역할에 맞게 표시하는 섹션.
 */
export function BusinessOpinionSection({
  isAdmin,
  role,
  hasSubmittedBusinessChecklist,
  displayedBusinessOpinionLabel,
  displayedBusinessOpinionComment,
  checklistTotal,
  businessChecklistSubmission,
  businessChecklistItems,
  onOpenChecklist,
}: BusinessOpinionSectionProps) {
  return (
    <Section
      title={isAdmin ? "사업부 의견" : "내 사업부 의견"}
      description={isAdmin ? "유지/포기 판단에서 가장 먼저 확인해야 할 사업부 회신입니다." : undefined}
    >
      <div className="decision-box">
        {hasSubmittedBusinessChecklist && displayedBusinessOpinionLabel ? (
          <Badge tone="primary">{displayedBusinessOpinionLabel}</Badge>
        ) : (
          <Badge>의견 대기</Badge>
        )}
        <p>{displayedBusinessOpinionComment}</p>
        {hasSubmittedBusinessChecklist ? (
          <div className="checklist-summary">
            <span>{isAdmin ? "전달된 사업부 체크리스트" : "제출한 체크리스트 총점"}</span>
            <strong>{checklistTotal}점</strong>
            <small>
              정성 평가 {businessChecklistSubmission.qualitativeScore}점 · 사업부 의견{" "}
              {businessOpinionLabels[businessChecklistSubmission.finalOpinion]}
            </small>
          </div>
        ) : (
          <div className="checklist-summary pending">
            <span>{isAdmin ? "사업부 체크리스트 대기" : "체크리스트 작성 전"}</span>
            <strong>{isAdmin ? "대기 중" : "작성 필요"}</strong>
            <small>체크리스트, 정성 평가, 사업부 의견이 모두 전달되면 제출 완료로 처리됩니다.</small>
          </div>
        )}
        {isAdmin && hasSubmittedBusinessChecklist ? (
          <div className="checklist-score-list">
            {businessChecklistItems.map((item) => {
              const response = getChecklistResponse(businessChecklistSubmission, item.id);

              return (
                <span key={item.id}>
                  {item.title} <b>{response.score === null ? "미입력" : `${response.score}점`}</b>
                </span>
              );
            })}
          </div>
        ) : null}
        {role === "BUSINESS" && !hasSubmittedBusinessChecklist ? (
          <Button type="button" onClick={onOpenChecklist}>
            의견 작성
          </Button>
        ) : null}
        {role === "BUSINESS" && hasSubmittedBusinessChecklist ? (
          <p className="notice notice-compact">
            이미 제출한 의견은 변경할 수 없습니다.
          </p>
        ) : null}
      </div>
    </Section>
  );
}

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-LEGAL-04, UI-BUS-03
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

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-LEGAL-04, UI-BUS-03
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

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 사업부 담당자가 AI 제안 점수를 참고해 평가 체크리스트를 작성하고 관리자에게 전달하는 모달
 */
export function BusinessChecklistModal({
  businessChecklistItems,
  initialSubmission,
  onClose,
  onSubmit,
  patentTitle,
}: {
  businessChecklistItems: BusinessChecklistItem[];
  initialSubmission: BusinessChecklistSubmission;
  onClose: () => void;
  onSubmit: (submission: BusinessChecklistSubmission) => void | Promise<void>;
  patentTitle: string;
}) {
  const [draft, setDraft] = useState(initialSubmission);
  const [submitMessage, setSubmitMessage] = useState("");
  const total = getBusinessChecklistTotal(draft);

  return (
    <Modal ariaLabel="사업부 평가 체크리스트" className="business-checklist-modal" onClose={onClose}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">사업부 의견 입력</p>
            <h2>평가 체크리스트</h2>
            <p>{patentTitle}</p>
          </div>
          <button aria-label="체크리스트 닫기" className="modal-close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="checklist-total-row">
          <span>총점</span>
          <strong>{total}점</strong>
          <small>AI 판단 점수는 참고 라인으로만 표시됩니다. 최종 점수는 사업부 담당자가 직접 선택합니다.</small>
        </div>

        <div className="checklist-form">
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
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!hasCompleteBusinessChecklistSubmission(draft)) {
                setSubmitMessage("모든 체크리스트 점수와 사업부 의견을 입력해 주세요.");
                return;
              }

              setSubmitMessage("");
              onSubmit({ ...draft, evaluatedAt: "2026-05-03" });
            }}
          >
            관리자에게 전달
          </Button>
        </div>
      </Modal>
  );
}
