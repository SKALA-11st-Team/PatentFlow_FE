import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMailLeadMonths } from "../../api/settings";
import { AppLayout } from "../../components/layout/AppLayout";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Section } from "../../components/common/Section";
import { BusinessSubmissionHistoryDetail } from "../../components/business/BusinessSubmissionHistoryDetail";
import { BusinessReviewMailPreviewModal } from "../../components/mailing/BusinessReviewMailPreviewModal";
import { recommendationLabels, reviewWorkflowStatusLabels } from "../../constants/status";
import type { MailingDeliveryStatus, MailingHistoryItem } from "../../types/mailing";
import type { PatentHistoryItem, PatentLifecycleStatus, UserRole } from "../../types/patent";
import { formatDate, usePatentDetail } from "./patent-detail/PatentDetailHooks";
import {
  AiReportSection,
  AiReportStructuredContent,
  RawMarkdownBlock,
} from "./patent-detail/AiReportSection";
import { AiReportEditModal } from "./patent-detail/AiReportEditModal";
import { useAiReportEditing } from "./patent-detail/useAiReportEditing";
import {
  CoApplicantConsentModal,
  FinalDecisionModal,
  FinalDecisionSection,
} from "./patent-detail/FinalDecisionSection";
import { BusinessChecklistModal, BusinessOpinionSection } from "./patent-detail/BusinessChecklistSection";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-11, FR-LEGAL-15
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 관리자와 사업부 사용자가 각 역할에 맞게 특허 상세, AI 특허 평가 레포트, 의견/판단 정보를 확인하는 화면
 */
export function PatentDetailPage({ role }: { role: UserRole }) {
  const {
    isAdmin,
    patentId,
    patent,
    setPatent,
    loadMessage,
    businessChecklistItems,
    businessChecklistSubmission,
    hasSubmittedBusinessChecklist,
    checklistTotal,
    displayedBusinessOpinionLabel,
    displayedBusinessOpinionComment,
    canRecordFinalDecision,
    canSendBusinessReviewMail,
    isApplyingDecision,
    isWorkflowActionProcessing,
    decisionMessage,
    workflowActionMessage,
    legalActionDraft,
    decisionReasonDraft,
    setDecisionReasonDraft,
    isChecklistOpen,
    setIsChecklistOpen,
    isDecisionModalOpen,
    setIsDecisionModalOpen,
    mailDrafts,
    activeMailIndex,
    setActiveMailIndex,
    isSendConfirmOpen,
    setIsSendConfirmOpen,
    isSendingMail,
    mailingHistoryItems,
    isMailHistoryOpen,
    setIsMailHistoryOpen,
    mailHistoryMessage,
    patentHistoryItems,
    patentHistoryMessage,
    handleSubmitChecklist,
    handleOpenMailHistory,
    handleOpenMailPreview,
    handleCloseMailPreview,
    handleUpdateMailDraft,
    handleConfirmSendMails,
    handleRecordFinalDecision,
    handleRequestAiReport,
    openFinalDecisionModal,
    coApplicantConsentMessage,
    isApplyingCoApplicantConsent,
    isConsentModalOpen,
    consentStatusDraft,
    setConsentStatusDraft,
    consentReasonDraft,
    setConsentReasonDraft,
    handleRecordCoApplicantConsent,
    openCoApplicantConsentModal,
    setIsConsentModalOpen,
  } = usePatentDetail(role);

  const [mailLeadMonths, setMailLeadMonths] = useState(2);
  useEffect(() => {
    getMailLeadMonths().then(setMailLeadMonths).catch(() => {});
  }, []);

  // FR-LEGAL-09: 레포트 편집은 별도 훅으로 관리한다(usePatentDetail 비대화 방지).
  const aiReportEditing = useAiReportEditing(patentId, patent?.aiEvaluationReport ?? null, (updatedReport) => {
    setPatent((current) =>
      current
        ? { ...current, aiEvaluationReport: updatedReport, currentRecommendation: updatedReport.recommendation }
        : current,
    );
  });

  if (!patent) {
    return (
      <AppLayout role={role} title="특허 상세" description="특허 상세 정보를 준비하고 있습니다.">
        <section className="section">
          <p className="empty-state">{loadMessage}</p>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role={role}
      title="특허 상세"
      description={
        isAdmin
          ? "특허 내용, 검토 진행 상태, 사업부 의견, 법적 액션 결과를 확인합니다."
          : "특허 내용과 AI 특허 평가 레포트를 확인하고 사업부 의견을 검토합니다."
      }
    >
      <Breadcrumbs
        items={
          isAdmin
            ? [{ label: "특허관리", to: "/admin/patents" }, { label: patent.title }]
            : [{ label: "대시보드", to: "/business/dashboard" }, { label: patent.title }]
        }
      />
      <section className={`detail-hero section ${getLifecycleHeroClassName(patent.lifecycleStatus)}`}>
        <div>
          <div className="detail-title-row">
            <h2>{patent.title}</h2>
            {isAdmin ? (
              <Badge tone={patent.reviewWorkflowStatus === "MAIL_READY" ? "primary" : "neutral"}>
                {reviewWorkflowStatusLabels[patent.reviewWorkflowStatus]}
              </Badge>
            ) : (
              <Badge tone={hasSubmittedBusinessChecklist ? "success" : "warning"}>
                {hasSubmittedBusinessChecklist && displayedBusinessOpinionLabel
                  ? `${displayedBusinessOpinionLabel} 의견 제출`
                  : "의견 대기"}
              </Badge>
            )}
          </div>
          <p>{patent.reviewReason}</p>
        </div>
        <div className="meta-grid">
          <Meta label="관리번호" value={patent.managementNumber} />
          <Meta label="출원번호" value={patent.applicationNumber} />
          <Meta label="등록번호" value={patent.registrationNumber ?? "N/A"} />
          <Meta label="공동출원인" value={patent.coApplicants} />
          <Meta label="연차료 납부 예정일" value={formatDate(patent.feeDueDate)} />
          <Meta label="관련사업 분야" value={patent.businessArea} />
          <Meta label="관련기술 분야" value={patent.technologyArea} />
          <Meta label="관련제품" value={patent.productName} />
          <Meta label="예상 소멸일" value={patent.expectedExpirationDate} />
        </div>
        {patent.feeDueDate ? (
          <FeeScheduleCard feeDueDate={patent.feeDueDate} mailLeadMonths={mailLeadMonths} departmentName={patent.departmentName} />
        ) : null}
      </section>

      <div className="detail-followup-grid">
        {isAdmin ? (
          <>
            <BusinessOpinionSection
              isAdmin={isAdmin}
              role={role}
              hasSubmittedBusinessChecklist={hasSubmittedBusinessChecklist}
              displayedBusinessOpinionLabel={displayedBusinessOpinionLabel}
              displayedBusinessOpinionComment={displayedBusinessOpinionComment}
              checklistTotal={checklistTotal}
              businessChecklistSubmission={businessChecklistSubmission}
              businessChecklistItems={businessChecklistItems}
              onOpenChecklist={() => setIsChecklistOpen(true)}
            />
            <FinalDecisionSection
              patentDetail={patent}
              decisionMessage={decisionMessage}
              workflowActionMessage={workflowActionMessage}
              canRecordFinalDecision={canRecordFinalDecision}
              canSendBusinessReviewMail={canSendBusinessReviewMail}
              isApplyingDecision={isApplyingDecision}
              isWorkflowActionProcessing={isWorkflowActionProcessing}
              coApplicantConsentMessage={coApplicantConsentMessage}
              isApplyingCoApplicantConsent={isApplyingCoApplicantConsent}
              onRequestAiReport={handleRequestAiReport}
              onOpenMailPreview={handleOpenMailPreview}
              onOpenMailHistory={handleOpenMailHistory}
              onOpenFinalDecisionModal={openFinalDecisionModal}
              onOpenCoApplicantConsentModal={openCoApplicantConsentModal}
            />
          </>
        ) : (
          <div className="business-review-workbench">
            <Section title="검토 참고 자료" description="기존 의사결정 기록과 AI 레포트 요약을 함께 확인합니다.">
              <div className="business-reference-stack">
                <div className="report-callout">
                  <strong>{recommendationLabels[patent.aiEvaluationReport.recommendation]}</strong>
                  <p>{patent.aiEvaluationReport.recommendationText}</p>
                </div>
                {patent.aiEvaluationReport.rawMarkdown ? (
                  <RawMarkdownBlock content={patent.aiEvaluationReport.rawMarkdown} title="AI 특허 평가 레포트 전문" />
                ) : (
                  <AiReportStructuredContent report={patent.aiEvaluationReport} />
                )}
                <div className="history-mini-list">
                  {patentHistoryItems.slice(0, 4).map((item) => (
                    <div key={item.historyId}>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                  ))}
                  {patentHistoryItems.length === 0 ? <p className="empty-state">{patentHistoryMessage || "기존 의사결정 기록이 없습니다."}</p> : null}
                </div>
              </div>
            </Section>
            <BusinessOpinionSection
              isAdmin={isAdmin}
              role={role}
              hasSubmittedBusinessChecklist={hasSubmittedBusinessChecklist}
              displayedBusinessOpinionLabel={displayedBusinessOpinionLabel}
              displayedBusinessOpinionComment={displayedBusinessOpinionComment}
              checklistTotal={checklistTotal}
              businessChecklistSubmission={businessChecklistSubmission}
              businessChecklistItems={businessChecklistItems}
              onOpenChecklist={() => setIsChecklistOpen(true)}
            />
          </div>
        )}
      </div>

      <div className="detail-main">
        <AiReportSection
          report={
            aiReportEditing.isShowingOriginal && aiReportEditing.originalReport
              ? aiReportEditing.originalReport
              : patent.aiEvaluationReport
          }
          editControls={
            isAdmin
              ? {
                  canEdit: !patent.finalDecisionRecord.decisionId,
                  isShowingOriginal: aiReportEditing.isShowingOriginal,
                  isSavingEdit: aiReportEditing.isSavingEdit,
                  editMessage: aiReportEditing.isEditModalOpen ? "" : aiReportEditing.editMessage,
                  onOpenEditModal: () => aiReportEditing.setIsEditModalOpen(true),
                  onToggleOriginal: aiReportEditing.handleToggleOriginal,
                  onRevertEdit: aiReportEditing.handleRevertEdit,
                }
              : undefined
          }
        />

        <Section title="특허 이해 요약" description="비전문가도 검토 전에 빠르게 이해할 수 있는 요약입니다.">
            <div className="summary-stack">
              <SummaryBlock title="요약" content={patent.summary.summaryText} />
              <SummaryBlock title="해결 과제" content={patent.summary.problemSolved} />
              <div>
                <h3>핵심 기술 포인트</h3>
                <ul className="clean-list">
                  {patent.summary.coreTechnicalPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <SummaryBlock title="권리범위 요약" content={patent.summary.claimsSummary} />
            </div>
        </Section>

        <BusinessSubmissionHistoryDetail patent={patent} />

        <PatentReviewHistorySection
          historyItems={patentHistoryItems}
          message={patentHistoryMessage}
        />

        <Link className="back-link detail-back-link" to={role === "ADMIN" ? "/admin/dashboard" : "/business/dashboard"}>
          대시보드로 돌아가기
        </Link>
      </div>

      {isAdmin && aiReportEditing.isEditModalOpen ? (
        <AiReportEditModal
          report={patent.aiEvaluationReport}
          hasBusinessResponse={Boolean(patent.businessOpinion.submittedAt)}
          isSaving={aiReportEditing.isSavingEdit}
          errorMessage={aiReportEditing.editMessage}
          onSave={aiReportEditing.handleSaveEdit}
          onClose={() => aiReportEditing.setIsEditModalOpen(false)}
        />
      ) : null}

      {isChecklistOpen ? (
        <BusinessChecklistModal
          initialSubmission={businessChecklistSubmission}
          onClose={() => setIsChecklistOpen(false)}
          onSubmit={handleSubmitChecklist}
          businessChecklistItems={businessChecklistItems}
          patentTitle={patent.title}
        />
      ) : null}

      {isDecisionModalOpen ? (
        <FinalDecisionModal
          legalActionResult={legalActionDraft}
          reason={decisionReasonDraft}
          isSubmitting={isApplyingDecision}
          onReasonChange={setDecisionReasonDraft}
          onClose={() => setIsDecisionModalOpen(false)}
          onSubmit={handleRecordFinalDecision}
          patentTitle={patent.title}
        />
      ) : null}

      {isConsentModalOpen ? (
        <CoApplicantConsentModal
          status={consentStatusDraft}
          reason={consentReasonDraft}
          isSubmitting={isApplyingCoApplicantConsent}
          onStatusChange={setConsentStatusDraft}
          onReasonChange={setConsentReasonDraft}
          onClose={() => setIsConsentModalOpen(false)}
          onSubmit={handleRecordCoApplicantConsent}
          patentTitle={patent.title}
        />
      ) : null}

      {mailDrafts.length > 0 ? (
        <BusinessReviewMailPreviewModal
          activeIndex={activeMailIndex}
          drafts={mailDrafts}
          isConfirmOpen={isSendConfirmOpen}
          isProcessing={isSendingMail}
          onClose={handleCloseMailPreview}
          onConfirmSend={handleConfirmSendMails}
          onConfirmToggle={setIsSendConfirmOpen}
          onDraftChange={handleUpdateMailDraft}
          onIndexChange={setActiveMailIndex}
        />
      ) : null}

      {isMailHistoryOpen ? (
        <MailingHistoryModal
          historyItems={mailingHistoryItems}
          message={mailHistoryMessage}
          onClose={() => setIsMailHistoryOpen(false)}
          patentTitle={patent.title}
        />
      ) : null}

    </AppLayout>
  );
}

/**
 * @relatedFR FR-LEGAL-11
 * @relatedUI UI-LEGAL-04, UI-BUS-05
 * @description 특허별 평가, 사업부 의견, 최종 판단 이력을 시간순 목록으로 보여준다.
 */
function PatentReviewHistorySection({
  historyItems,
  message,
}: {
  historyItems: PatentHistoryItem[];
  message: string;
}) {
  return (
    <Section title="평가 및 판단 이력" description="분기별 평가, 사업부 의견, 최종 판단 기록을 확인합니다.">
      {message ? <p className="notice">{message}</p> : null}
      {historyItems.length > 0 ? (
        <div className="evaluation-history-list">
          {historyItems.map((history) => (
            <article className="evaluation-history-item" key={history.historyId}>
              <span>{formatDateTime(history.createdAt)}</span>
              <strong>{history.title}</strong>
              <p>{history.description}</p>
              <b>{history.actorName}</b>
            </article>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-14
 * @relatedUI UI-LEGAL-04
 * @description 특허 상세에서 해당 특허의 사업부 검토 요청 메일 발송 이력을 모달로 조회한다.
 */
function MailingHistoryModal({
  historyItems,
  message,
  onClose,
  patentTitle,
}: {
  historyItems: MailingHistoryItem[];
  message: string;
  onClose: () => void;
  patentTitle: string;
}) {
  return (
    <Modal ariaLabel="메일 발송 내역 조회" className="mail-history-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">메일 발송 내역</p>
          <h2>사업부 검토 요청 이력</h2>
          <p>{patentTitle}</p>
        </div>
        <button aria-label="메일 발송 내역 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>

      {message ? <p className="notice">{message}</p> : null}

      {historyItems.length > 0 ? (
        <div className="table-wrap">
          <table className="compact-table mailing-history-table">
            <thead>
              <tr>
                <th>발송일</th>
                <th>수신자</th>
                <th>제목</th>
                <th>포함 특허</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {historyItems.map((history) => (
                <tr key={history.mailingId}>
                  <td>
                    <strong>{formatDateTime(history.sentAt)}</strong>
                    <span className="table-subtext">{history.sentBy}</span>
                  </td>
                  <td>
                    {history.recipientName}
                    <span className="table-subtext">{history.recipientEmail}</span>
                  </td>
                  <td>
                    <strong title={history.subject}>{history.subject}</strong>
                    <span className="table-subtext">참조 {history.ccEmails.length}명</span>
                  </td>
                  <td>
                    {history.patentCount}건
                    <span className="table-subtext">
                      {history.patents.map((patent) => patent.managementNumber).join(", ")}
                    </span>
                  </td>
                  <td>
                    <Badge tone={getMailingHistoryStatusTone(history.status)}>
                      {mailingHistoryStatusLabels[history.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="modal-actions">
        <Button onClick={onClose} type="button" variant="secondary">
          닫기
        </Button>
      </div>
    </Modal>
  );
}

const mailingHistoryStatusLabels: Record<MailingDeliveryStatus, string> = {
  FAILED: "실패",
  PENDING: "대기",
  RECORDED: "발송 기록",
  SENT: "발송 완료",
};

/**
 * @relatedFR FR-LEGAL-14
 * @relatedUI UI-LEGAL-04
 * @description 메일 발송 처리 상태에 맞는 공통 Badge 톤을 반환한다.
 */
function getMailingHistoryStatusTone(status: MailingDeliveryStatus): BadgeTone {
  if (status === "SENT") {
    return "success";
  }

  if (status === "FAILED") {
    return "danger";
  }

  if (status === "RECORDED") {
    return "neutral";
  }

  return "warning";
}

/**
 * @relatedFR FR-LEGAL-14
 * @relatedUI UI-LEGAL-04
 * @description 메일 발송 시각을 목록 표시용 yyyy-mm-dd hh:mm 형식으로 줄인다.
 */
function formatDateTime(dateText: string) {
  return dateText.replace("T", " ").slice(0, 16);
}

/**
 * @relatedFR FR-LEGAL-05
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 특허 상세 상단 영역에 PatentLifecycleStatus 기준 상태 색상을 적용한다.
 */
function getLifecycleHeroClassName(lifecycleStatus: PatentLifecycleStatus) {
  return lifecycleStatus === "ACTIVE" ? "lifecycle-active" : "lifecycle-inactive";
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
}

function feeShortDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function FeeScheduleCard({
  feeDueDate,
  mailLeadMonths,
  departmentName,
}: {
  feeDueDate: string;
  mailLeadMonths: number;
  departmentName: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // feeDueDate는 BE가 계산한 다음 납부일 — month/day를 기준으로 ±3년 생성
  const [baseYear, baseMonth, baseDay] = feeDueDate.split("-").map(Number);

  const rows = Array.from({ length: 7 }, (_, i) => {
    const offset = i - 3; // -3 to +3
    const year = baseYear + offset;

    const dueDate = new Date(year, baseMonth - 1, baseDay);
    const notifDate = new Date(year, baseMonth - 1 - mailLeadMonths, baseDay);

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
    const daysUntilNotif = Math.ceil((notifDate.getTime() - today.getTime()) / 86_400_000);
    const isCurrent = offset === 0; // feeDueDate 연도 = 다음 납부 연도
    const isPast = daysUntilDue < 0;

    return { year, dueDate, notifDate, daysUntilDue, daysUntilNotif, isCurrent, isPast };
  });

  return (
    <div className="fee-schedule-card">
      <div className="fee-schedule-header">
        <h3 className="fee-schedule-title">연차료 납부 일정</h3>
        <span className="fee-schedule-dept">담당: {departmentName || "미배정"}</span>
      </div>
      <div className="table-wrap fee-schedule-table-wrap">
        <table>
          <thead>
            <tr>
              <th>연도</th>
              <th>납부 예정일</th>
              <th>검토 시작 ({mailLeadMonths}개월 전)</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ year, dueDate, notifDate, daysUntilDue, daysUntilNotif, isCurrent, isPast }) => (
              <tr key={year} className={isCurrent ? "fee-row-current" : isPast ? "fee-row-past" : ""}>
                <td><strong>{year}</strong></td>
                <td>{feeShortDate(dueDate)}</td>
                <td>
                  {feeShortDate(notifDate)}
                  {!isPast && daysUntilNotif > 0 && (
                    <span className="table-subtext">D-{daysUntilNotif}</span>
                  )}
                </td>
                <td>
                  {isPast ? (
                    <span className="badge badge-neutral">완료</span>
                  ) : isCurrent ? (
                    <span className={`badge ${daysUntilDue <= 60 ? "badge-warning" : "badge-primary"}`}>
                      D-{daysUntilDue} 납부예정
                    </span>
                  ) : (
                    <span className="badge badge-neutral">예정</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
