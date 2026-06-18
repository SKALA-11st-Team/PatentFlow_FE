/**
 * @author 유건욱
 * @date 2026-05-08
 */
/* eslint-disable react-refresh/only-export-components */
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import type { BusinessReviewMailDraft } from "../../utils/businessReviewMail";

export {
  createBusinessReviewMailDraft,
  createGroupedBusinessReviewMailDrafts,
} from "../../utils/businessReviewMail";
export type { BusinessReviewMailDraft } from "../../utils/businessReviewMail";

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-02, UI-LEGAL-04, UI-LEGAL-05
 * @description 메일 발송 대기 특허의 사업부 검토 요청 메일을 담당자별로 미리보고 수정한다.
 */
export function BusinessReviewMailPreviewModal({
  activeIndex,
  drafts,
  isConfirmOpen,
  isProcessing,
  onClose,
  onConfirmSend,
  onConfirmToggle,
  onDraftChange,
  onIndexChange,
}: {
  activeIndex: number;
  drafts: BusinessReviewMailDraft[];
  isConfirmOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onConfirmSend: () => void;
  onConfirmToggle: (isOpen: boolean) => void;
  onDraftChange: (draft: BusinessReviewMailDraft) => void;
  onIndexChange: (index: number) => void;
}) {
  const activeDraft = drafts[activeIndex];
  const isFirstMail = activeIndex === 0;
  const isLastMail = activeIndex === drafts.length - 1;
  const hasEmptyRecipient = drafts.some((d) => !d.recipientEmail.trim());

  function handleSubjectChange(subject: string) {
    onDraftChange({ ...activeDraft, subject });
  }

  function handleBodyChange(body: string) {
    onDraftChange({ ...activeDraft, body });
  }

  return (
    <>
      <Modal ariaLabel="사업부 검토 요청 메일 미리보기" className="mail-preview-modal" onClose={onClose}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">메일 발송 대기</p>
            <h2>사업부 검토 요청 메일 미리보기</h2>
          </div>
          <button aria-label="메일 미리보기 닫기" className="modal-close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mail-preview-toolbar">
          {drafts.length > 1 ? (
            <button
              aria-label="이전 메일"
              className="mail-preview-arrow"
              disabled={isFirstMail}
              onClick={() => onIndexChange(activeIndex - 1)}
              type="button"
            >
              ‹
            </button>
          ) : <div />}
          <div>
            {drafts.length > 1 ? (
              <strong>
                {activeIndex + 1} / {drafts.length}
              </strong>
            ) : null}
            <span>
              {activeDraft.recipientName}에게 보낼 특허 {activeDraft.patents.length}건 묶음 메일을 확인합니다.
            </span>
          </div>
          {drafts.length > 1 ? (
            <button
              aria-label="다음 메일"
              className="mail-preview-arrow"
              disabled={isLastMail}
              onClick={() => onIndexChange(activeIndex + 1)}
              type="button"
            >
              ›
            </button>
          ) : <div />}
        </div>

        <div className="mail-preview-meta">
          <label>
            <span>받는 사람 (이름)</span>
            <input
              onChange={(event) => onDraftChange({ ...activeDraft, recipientName: event.target.value })}
              placeholder="담당자 이름"
              value={activeDraft.recipientName}
            />
          </label>
          <label>
            <span>받는 사람 (이메일)</span>
            <input
              onChange={(event) => onDraftChange({ ...activeDraft, recipientEmail: event.target.value })}
              placeholder="수신 이메일을 입력하세요"
              style={activeDraft.recipientEmail ? undefined : { borderColor: "var(--color-error, #c0392b)" }}
              type="email"
              value={activeDraft.recipientEmail}
            />
            {!activeDraft.recipientEmail ? (
              <small className="text-error">
                계정 미등록 사업부입니다. 수신 이메일을 직접 입력하세요.
              </small>
            ) : null}
          </label>
          <label>
            <span>참조</span>
            <input
              onChange={(event) => onDraftChange({
                ...activeDraft,
                ccEmails: event.target.value
                  .split(",")
                  .map((email) => email.trim())
                  .filter(Boolean),
              })}
              placeholder="참조 이메일을 쉼표로 구분"
              type="text"
              value={activeDraft.ccEmails.join(", ")}
            />
          </label>
          <label>
            <span>특허 건수</span>
            <input readOnly value={`${activeDraft.patents.length}건`} />
          </label>
          <label>
            <span>제목</span>
            <input onChange={(event) => handleSubjectChange(event.target.value)} value={activeDraft.subject} />
          </label>
        </div>

        <label className="mail-preview-body">
          <span>본문</span>
          <textarea onChange={(event) => handleBodyChange(event.target.value)} value={activeDraft.body} />
        </label>

        <div className="modal-actions">
          <Button disabled={isProcessing} onClick={onClose} type="button" variant="secondary">
            취소
          </Button>
          <Button disabled={isProcessing || hasEmptyRecipient} onClick={() => onConfirmToggle(true)} type="button" title={hasEmptyRecipient ? "수신 이메일이 비어 있는 메일이 있습니다" : undefined}>
            최종 발송 확인
          </Button>
        </div>
      </Modal>

      {isConfirmOpen ? (
        <Modal ariaLabel="메일 최종 발송 확인" className="mail-confirm-modal" onClose={() => onConfirmToggle(false)}>
          <div className="modal-header">
            <div>
              <p className="eyebrow">최종 확인</p>
              <h2>선택한 메일을 보낼까요?</h2>
            </div>
            <button
              aria-label="최종 발송 확인 닫기"
              className="modal-close-button"
              onClick={() => onConfirmToggle(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <p className="mail-confirm-copy">
            {drafts.length}통의 사업부 검토 요청 메일로 총 {getDraftPatentCount(drafts)}건의 특허를 발송 처리합니다.
            Gmail 설정이 완료된 경우 실제 메일이 발송됩니다.
          </p>
          <div className="modal-actions">
            <Button disabled={isProcessing} onClick={() => onConfirmToggle(false)} type="button" variant="secondary">
              다시 확인
            </Button>
            <Button disabled={isProcessing} onClick={onConfirmSend} type="button">
              {isProcessing ? "처리 중" : "보내기"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function getDraftPatentCount(drafts: BusinessReviewMailDraft[]) {
  return drafts.reduce((total, draft) => total + draft.patents.length, 0);
}
