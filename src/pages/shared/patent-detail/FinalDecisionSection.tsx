/**
 * @author 유건욱
 * @date 2026-06-04
 */
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Section } from "../../../components/common/Section";
import {
  coApplicantConsentStatusLabels,
  coApplicantConsentStatusTone,
  legalActionResultLabels,
  type CoApplicantConsentStatus,
} from "../../../constants/status";
import type { CoApplicantConsent, LegalActionResult, PatentDetail, ReviewWorkflowStatus } from "../../../types/patent";

/**
 * @relatedFR FR-LEGAL-10
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 관리자 특허 상세의 현재 workflow 단계에 맞는 액션 제목을 반환한다.
 */
function getAdminActionTitle(workflowStatus: ReviewWorkflowStatus) {
  if (workflowStatus === "REVIEW_QUARTER_STARTED") return "AI 레포트 생성 필요";
  if (workflowStatus === "MAIL_READY") return "사업부 메일 발송 필요";
  if (workflowStatus === "WAITING_BUSINESS_RESPONSE") return "사업부 응답 대기";
  if (workflowStatus === "BUSINESS_RESPONSE_RECEIVED") return "처리 결과 입력 필요";
  return "처리 결과 미입력";
}

/**
 * @relatedFR FR-LEGAL-10
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 관리자 특허 상세의 현재 workflow 단계에 맞는 액션 설명을 반환한다.
 */
function getAdminActionDescription(workflowStatus: ReviewWorkflowStatus) {
  if (workflowStatus === "REVIEW_QUARTER_STARTED") return "FastAPI AI 에이전트를 호출해 특허 평가 레포트를 생성합니다.";
  if (workflowStatus === "MAIL_READY") return "AI 특허 평가 레포트가 생성되었습니다. 사업부서 담당자에게 메일을 발송하세요.";
  if (workflowStatus === "WAITING_BUSINESS_RESPONSE") return "사업부서 담당자의 유지/포기 의견 제출을 기다리는 중입니다.";
  if (workflowStatus === "BUSINESS_RESPONSE_RECEIVED") return "사업부 의견을 확인한 뒤 유지 또는 포기 처리 결과를 입력해야 합니다.";
  return "아직 입력된 최종 처리 결과가 없습니다.";
}

/**
 * @relatedFR FR-LEGAL-10
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 관리자 특허 상세의 현재 workflow 단계에 맞는 버튼 라벨을 반환한다.
 */
function getAdminActionButtonLabel(workflowStatus: ReviewWorkflowStatus) {
  if (workflowStatus === "MAIL_READY") {
    return "사업부 메일 발송";
  }

  if (workflowStatus === "WAITING_BUSINESS_RESPONSE") {
    return "메일 발송 내역 보기";
  }

  if (workflowStatus === "BUSINESS_RESPONSE_RECEIVED") {
    return "처리 결과 입력";
  }

  return "처리 상태 확인";
}

interface FinalDecisionSectionProps {
  patentDetail: PatentDetail;
  decisionMessage: string;
  workflowActionMessage: string;
  canRecordFinalDecision: boolean;
  canSendBusinessReviewMail: boolean;
  isApplyingDecision: boolean;
  isWorkflowActionProcessing: boolean;
  coApplicantConsentMessage: string;
  isApplyingCoApplicantConsent: boolean;
  onRequestAiReport: () => void;
  onOpenMailPreview: () => void;
  onOpenMailHistory: () => void;
  onOpenFinalDecisionModal: (patentDetail: PatentDetail) => void;
  onOpenCoApplicantConsentModal: () => void;
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-19, FR-LEGAL-20
 * @relatedUI UI-LEGAL-04
 * @description AI 권고와 사업부 의견을 검토한 뒤 관리자 결론과 실제 법무 처리 결과를 기록하는 최종 판단 섹션.
 */
export function FinalDecisionSection({
  patentDetail,
  decisionMessage,
  workflowActionMessage,
  canRecordFinalDecision,
  canSendBusinessReviewMail,
  isApplyingDecision,
  isWorkflowActionProcessing,
  coApplicantConsentMessage,
  isApplyingCoApplicantConsent,
  onRequestAiReport,
  onOpenMailPreview,
  onOpenMailHistory,
  onOpenFinalDecisionModal,
  onOpenCoApplicantConsentModal,
}: FinalDecisionSectionProps) {
  const canViewMailHistory = patentDetail.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE";
  // 공동출원 게이트: jointApplication 이면 합의(AGREED) 전까지 유지/포기 처리를 막는다.
  const isJointApplication = patentDetail.jointApplication ?? false;
  const isCoApplicantAgreed = patentDetail.coApplicantConsent?.status === "AGREED";
  const isFinalDecisionBlocked = isApplyingDecision || (isJointApplication && !isCoApplicantAgreed);

  return (
    <Section title="최종 판단" description="AI 권고와 사업부 의견을 검토한 뒤 관리자 결론과 실제 법무 처리 결과를 기록합니다.">
      {patentDetail.finalDecisionRecord.decisionId ? (
        <div className="decision-box">
          <Badge tone="success">{patentDetail.legalActionResult ? legalActionResultLabels[patentDetail.legalActionResult] : "처리 완료"}</Badge>
          <p>{patentDetail.finalDecisionRecord.reason ?? "최종 처리 결과가 반영되었습니다."}</p>
          {patentDetail.legalActionResult ? (
            <div className="decision-result-row">
              <span>법무 처리 결과</span>
              <strong>{legalActionResultLabels[patentDetail.legalActionResult]}</strong>
            </div>
          ) : null}
          <small>{patentDetail.finalDecisionRecord.decidedAt?.slice(0, 10)}</small>
          {decisionMessage ? <p className="notice">{decisionMessage}</p> : null}
          <Button
            disabled={!canRecordFinalDecision}
            onClick={() => onOpenFinalDecisionModal(patentDetail)}
            type="button"
            variant="secondary"
          >
            최종 판단 수정
          </Button>
        </div>
      ) : (
        <div className="decision-box empty">
          <strong>{getAdminActionTitle(patentDetail.reviewWorkflowStatus)}</strong>
          <p>{getAdminActionDescription(patentDetail.reviewWorkflowStatus)}</p>
          {workflowActionMessage ? <p className="notice">{workflowActionMessage}</p> : null}
          {decisionMessage ? <p className="notice">{decisionMessage}</p> : null}
          {patentDetail.reviewWorkflowStatus === "REVIEW_QUARTER_STARTED" ? (
            <Button disabled={isWorkflowActionProcessing} onClick={onRequestAiReport} type="button">
              {isWorkflowActionProcessing ? "AI 레포트 생성 중..." : "AI 레포트 생성"}
            </Button>
          ) : (
            <div className="inline-action-group">
              {patentDetail.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED" ? (
                <>
                  {isJointApplication ? (
                    <CoApplicantConsentPanel
                      coApplicants={patentDetail.coApplicants}
                      consent={patentDetail.coApplicantConsent ?? null}
                      message={coApplicantConsentMessage}
                      isSubmitting={isApplyingCoApplicantConsent}
                      onOpenModal={onOpenCoApplicantConsentModal}
                    />
                  ) : null}
                  <Button
                    disabled={isFinalDecisionBlocked}
                    onClick={() => onOpenFinalDecisionModal(patentDetail)}
                    type="button"
                  >
                    {isApplyingDecision
                      ? "처리 중..."
                      : patentDetail.businessOpinion.opinion === "ABANDON"
                        ? "포기 처리"
                        : "유지 처리"}
                  </Button>
                  {isJointApplication && !isCoApplicantAgreed ? (
                    <p className="notice">공동출원인 합의(합의 완료) 후 유지/포기 처리를 진행할 수 있습니다.</p>
                  ) : null}
                </>
              ) : (
                <Button
                  disabled={!canSendBusinessReviewMail && !canViewMailHistory}
                  onClick={() => {
                    if (patentDetail.reviewWorkflowStatus === "MAIL_READY") {
                      onOpenMailPreview();
                      return;
                    }
                    if (patentDetail.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE") {
                      onOpenMailHistory();
                    }
                  }}
                  type="button"
                >
                  {getAdminActionButtonLabel(patentDetail.reviewWorkflowStatus)}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-20
 * @relatedUI UI-LEGAL-04
 * @description 관리자가 실제 법무 처리 결과(유지/포기 처리)와 사유를 입력하는 모달.
 */
export function FinalDecisionModal({
  legalActionResult,
  reason,
  isSubmitting,
  onReasonChange,
  onClose,
  onSubmit,
  patentTitle,
}: {
  legalActionResult: LegalActionResult;
  reason: string;
  isSubmitting: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  patentTitle: string;
}) {
  return (
    <Modal ariaLabel="최종 처리 결과 입력" className="business-checklist-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">{legalActionResult === "ABANDONED" ? "포기 처리" : "유지 처리"}</p>
          <h2>{legalActionResult === "ABANDONED" ? "포기 처리 확인" : "유지 처리 확인"}</h2>
          <p>{patentTitle}</p>
        </div>
        <button aria-label="최종 처리 결과 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <label className="checklist-memo-label">
        <span>처리 사유</span>
        <textarea
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="AI 권고, 사업부 의견, 법무 검토 근거를 구분해 입력하세요."
          value={reason}
        />
      </label>

      <div className="modal-actions">
        <Button onClick={onClose} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={isSubmitting} onClick={onSubmit} type="button">
          {isSubmitting ? "처리 중..." : legalActionResult === "ABANDONED" ? "포기 처리" : "유지 처리"}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-04
 * @description 공동출원 특허의 합의 상태를 표시하고 합의 기록 모달을 여는 패널. 합의 전까지 최종 판단을 막는다.
 */
function CoApplicantConsentPanel({
  coApplicants,
  consent,
  message,
  isSubmitting,
  onOpenModal,
}: {
  coApplicants: string;
  consent: CoApplicantConsent | null;
  message: string;
  isSubmitting: boolean;
  onOpenModal: () => void;
}) {
  const status = consent?.status ?? "PENDING";
  return (
    <div className="co-applicant-consent-panel">
      <Badge tone={coApplicantConsentStatusTone[status]}>{coApplicantConsentStatusLabels[status]}</Badge>
      <p>공동출원 특허입니다. 연차료 유지/포기 결정 전 공동출원인과 합의가 필요합니다.</p>
      <div className="decision-result-row">
        <span>공동출원인</span>
        <strong>{coApplicants}</strong>
      </div>
      {consent?.reason ? <small>합의 사유: {consent.reason}</small> : null}
      {message ? <p className="notice">{message}</p> : null}
      <Button disabled={isSubmitting} onClick={onOpenModal} type="button" variant="secondary">
        {isSubmitting ? "기록 중..." : "공동출원인 합의 기록"}
      </Button>
    </div>
  );
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-04
 * @description 공동출원인 합의 상태(합의 완료/불성립)와 사유를 입력하는 모달.
 */
export function CoApplicantConsentModal({
  status,
  reason,
  isSubmitting,
  onStatusChange,
  onReasonChange,
  onClose,
  onSubmit,
  patentTitle,
}: {
  status: CoApplicantConsentStatus;
  reason: string;
  isSubmitting: boolean;
  onStatusChange: (status: CoApplicantConsentStatus) => void;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  patentTitle: string;
}) {
  return (
    <Modal ariaLabel="공동출원인 합의 기록" className="business-checklist-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">공동출원인 합의</p>
          <h2>공동출원인 합의 기록</h2>
          <p>{patentTitle}</p>
        </div>
        <button aria-label="공동출원인 합의 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <label className="checklist-memo-label">
        <span>합의 상태</span>
        <select onChange={(event) => onStatusChange(event.target.value as CoApplicantConsentStatus)} value={status}>
          <option value="AGREED">합의 완료</option>
          <option value="DISAGREED">합의 불성립</option>
        </select>
      </label>
      <label className="checklist-memo-label">
        <span>합의 내용/사유</span>
        <textarea
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="공동출원인과의 합의 내용(연차료 분담 등) 또는 불성립 사유를 입력하세요."
          value={reason}
        />
      </label>

      <div className="modal-actions">
        <Button onClick={onClose} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={isSubmitting} onClick={onSubmit} type="button">
          {isSubmitting ? "기록 중..." : "합의 기록"}
        </Button>
      </div>
    </Modal>
  );
}
