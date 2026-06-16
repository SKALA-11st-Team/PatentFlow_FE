import { useEffect, useRef, useState } from "react";
import { getAiReportRegenSetting } from "../../api/settings";
import { Link } from "react-router-dom";
import { downloadPatentPdf, getPatentFamily, getPatentFeeSchedule, getPatentPdfMeta } from "../../api/patents";
import { AppLayout } from "../../components/layout/AppLayout";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Section } from "../../components/common/Section";
import { BusinessSubmissionHistoryDetail } from "../../components/business/BusinessSubmissionHistoryDetail";
import { BusinessReviewMailPreviewModal } from "../../components/mailing/BusinessReviewMailPreviewModal";
import {
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Coins,
  Cpu,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileText,
  Globe,
  Hash,
  type LucideIcon,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import { lifecycleStatusLabels, recommendationLabels, reviewWorkflowStatusLabels } from "../../constants/status";
import { getOriginalPatentUrl } from "../../utils/businessReviewMail";
import { downloadAiReportPdf } from "../../utils/reportPrint";
import { JudgmentSummaryBand, SummaryBriefCards } from "./patent-detail/AiReportRichContent";
import type { MailingDeliveryStatus, MailingHistoryItem } from "../../types/mailing";
import type { PatentFeeSchedule, PatentHistoryItem, PatentLifecycleStatus, PatentListItem, PatentPdfMeta, UserRole } from "../../types/patent";
import { formatDate, usePatentDetail } from "./patent-detail/PatentDetailHooks";
import {
  AiReportSection,
  AiReportStructuredContent,
  RawMarkdownBlock,
} from "./patent-detail/AiReportSection";
import { MarkdownView } from "../../components/common/MarkdownView";
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
    aiReportScrollTrigger,
    regenStartedAt,
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

  const aiReportSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (aiReportScrollTrigger > 0) {
      aiReportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [aiReportScrollTrigger]);

  // 다른 특허 상세로 진입/이동하면 이전 스크롤 위치가 남지 않도록 항상 최상단에서 시작한다.
  // (.main-content는 자체 overflow가 없어 윈도가 스크롤되므로 window를 직접 올린다.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [patentId]);

  const [aiReportRegenBusinessAllowed, setAiReportRegenBusinessAllowed] = useState(false);
  useEffect(() => {
    getAiReportRegenSetting().then((s) => setAiReportRegenBusinessAllowed(s.businessAllowed)).catch(() => {});
  }, []);

  // FEE-06: 연차료 일정은 BE fee-schedule API가 단일 출처 — 국가 규칙·검토 시작일·수신처 포함.
  const [feeSchedule, setFeeSchedule] = useState<PatentFeeSchedule | null>(null);
  // MAIL-13: 법무팀이 업로드한 특허 PDF 첨부 상태 — 있으면 다운로드 버튼 노출(메일 안내의 도착지).
  const [pdfMeta, setPdfMeta] = useState<PatentPdfMeta | null>(null);
  // F6: 특허 패밀리 — 같은 관리번호 계열의 국가별 출원.
  const [familyPatents, setFamilyPatents] = useState<PatentListItem[]>([]);
  useEffect(() => {
    if (!patentId) {
      return;
    }
    getPatentFeeSchedule(patentId, { business: !isAdmin })
      .then((schedule) => setFeeSchedule(schedule ?? null))
      .catch(() => setFeeSchedule(null));
    getPatentPdfMeta(patentId, { business: !isAdmin })
      .then(setPdfMeta)
      .catch(() => setPdfMeta(null));
    getPatentFamily(patentId, { business: !isAdmin })
      .then(setFamilyPatents)
      .catch(() => setFamilyPatents([]));
  }, [patentId, isAdmin]);

  async function handleDownloadPatentPdf() {
    if (!patentId) {
      return;
    }
    try {
      await downloadPatentPdf(patentId, pdfMeta?.docName ?? null, { business: !isAdmin });
    } catch {
      // 다운로드 실패는 치명적이지 않음 — 원문 URL 경로가 별도로 존재한다.
    }
  }

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
        <div className="detail-title-row">
          <div>
            <h2>{patent.title}</h2>
            <p>{patent.reviewReason}</p>
          </div>
          <div className="title-actions">
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
            {getOriginalPatentUrl(patent) !== "원문 URL 미등록" ? (
              <Button onClick={() => window.open(getOriginalPatentUrl(patent), "_blank", "noopener")} type="button">
                특허 원문 보기
              </Button>
            ) : null}
            {patent.aiEvaluationReport ? (
              <Button
                onClick={() => downloadAiReportPdf(patent.title, patent.aiEvaluationReport!)}
                type="button"
                variant="secondary"
              >
                보고서 다운로드
              </Button>
            ) : null}
            {pdfMeta?.exists && pdfMeta.storageType === "UPLOADED" ? (
              <Button onClick={handleDownloadPatentPdf} type="button" variant="secondary">
                특허 PDF 다운로드{pdfMeta.docName ? ` (${pdfMeta.docName})` : ""}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Section title="한눈에 보는 판단 요약" description="AI 평가 결과를 한 화면에 요약합니다.">
        <JudgmentSummaryBand report={patent.aiEvaluationReport} />
      </Section>

      <Section
        title="특허 기본 정보"
        description="출원·등록 서지 정보입니다."
        actions={
          getOriginalPatentUrl(patent) !== "원문 URL 미등록" ? (
            <a className="section-link" href={getOriginalPatentUrl(patent)} rel="noopener noreferrer" target="_blank">
              원문 링크 (KIPRIS / Google Patents)
              <ExternalLink aria-hidden size={14} />
            </a>
          ) : null
        }
      >
        <div className="meta-grid">
          <Meta icon={Hash} label="관리번호" value={patent.managementNumber} />
          <Meta icon={FileText} label="출원번호" value={patent.applicationNumber} />
          <Meta icon={FileCheck2} label="등록번호" value={patent.registrationNumber ?? "N/A"} />
          <Meta icon={ShieldCheck} label="상태" value={lifecycleStatusLabels[patent.lifecycleStatus]} />
          <Meta icon={Briefcase} label="사업 분야" value={patent.businessArea} />
          <Meta icon={Cpu} label="기술 분야" value={patent.technologyArea} />
          <Meta icon={Package} label="관련 제품" value={patent.productName} />
          <Meta icon={Globe} label="국가" value={patent.country} />
          <Meta icon={Users} label="공동출원인" value={patent.coApplicants} />
          <Meta icon={Calendar} label="출원일" value={formatDate(patent.applicationDate)} />
          <Meta icon={CalendarCheck} label="등록일" value={formatDate(patent.registrationDate)} />
          <Meta icon={CalendarClock} label="예상 소멸일" value={formatDate(patent.expectedExpirationDate)} />
          <Meta icon={Coins} label="연차료 납부 예정일" value={formatDate(patent.feeDueDate)} />
          {patent.aiEvaluationReport ? (
            <Meta icon={FileClock} label="보고서 생성일" value={formatDate(patent.aiEvaluationReport.createdAt)} />
          ) : null}
        </div>
      </Section>

      {familyPatents.length > 0 ? <PatentFamilyCard isAdmin={isAdmin} members={familyPatents} /> : null}

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
                {patent.aiEvaluationReport ? (
                  <>
                    <div className="report-callout">
                      <strong>{recommendationLabels[patent.aiEvaluationReport.recommendation]}</strong>
                      <p>{patent.aiEvaluationReport.recommendationText}</p>
                    </div>
                    {patent.aiEvaluationReport.rawMarkdown ? (
                      <RawMarkdownBlock content={patent.aiEvaluationReport.rawMarkdown} title="AI 특허 평가 레포트 전문" />
                    ) : (
                      <AiReportStructuredContent report={patent.aiEvaluationReport} />
                    )}
                  </>
                ) : (
                  <p className="empty-state">AI 레포트가 아직 생성되지 않았습니다.</p>
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
        <Section title="특허 이해 요약" description="비전문가도 검토 전에 빠르게 이해할 수 있는 요약입니다.">
          {patent.aiEvaluationReport?.summaryBrief ? (
            <SummaryBriefCards brief={patent.aiEvaluationReport.summaryBrief} />
          ) : (
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
              {isMeaningfulSummaryText(patent.summary.claimsSummary) && (
                <SummaryBlock title="권리범위 요약" content={patent.summary.claimsSummary} />
              )}
            </div>
          )}
        </Section>

        <div ref={aiReportSectionRef}>
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
          regenerateControls={
            (role !== "BUSINESS" || aiReportRegenBusinessAllowed)
              ? {
                  isRegenerating: isWorkflowActionProcessing,
                  regenerateMessage: workflowActionMessage,
                  regenStartedAt,
                  onRegenerate: handleRequestAiReport,
                }
              : undefined
          }
        />
        </div>

        <BusinessSubmissionHistoryDetail patent={patent} />

        <PatentReviewHistorySection
          historyItems={patentHistoryItems}
          message={patentHistoryMessage}
        />

        {feeSchedule && feeSchedule.items.length > 0 ? <FeeScheduleCard schedule={feeSchedule} /> : null}

        <Link className="back-link detail-back-link" to={role === "ADMIN" ? "/admin/dashboard" : "/business/dashboard"}>
          대시보드로 돌아가기
        </Link>
      </div>

      {isAdmin && aiReportEditing.isEditModalOpen && patent.aiEvaluationReport ? (
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

function Meta({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string }) {
  return (
    <div className="meta-item">
      {Icon ? <Icon aria-hidden className="meta-item-icon" size={18} /> : null}
      <div className="meta-item-body">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/**
 * 권리범위 요약은 AI/agent가 산출하지 않는 필드라, BE가 값이 없으면 빈 문자열로 내려준다.
 * 빈 값이면 블록을 노출하지 않는다.
 */
function isMeaningfulSummaryText(content: string | undefined | null): boolean {
  return Boolean(content?.trim());
}

function SummaryBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3>{title}</h3>
      <MarkdownView content={content} />
    </div>
  );
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-04, UI-BUS-02
 * @description FEE-06: 연차료 납부 일정 카드 — BE fee-schedule API가 계산한 국가 규칙 기반
 * 도래일(KR 일괄 납부·US 유지료 포함), 검토 시작(고지 발송) 예정일, 수신처를 한눈에 보여준다.
 */
function FeeScheduleCard({ schedule }: { schedule: PatentFeeSchedule }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntil = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Math.ceil((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
  };
  const recipientLabel = schedule.recipient
    ? `${schedule.recipient.departmentName} · ${schedule.recipient.managerName}${
        schedule.recipient.managerEmail ? ` (${schedule.recipient.managerEmail})` : ""
      }`
    : "미배정";

  return (
    <div className="fee-schedule-card">
      <div className="fee-schedule-header">
        <h3 className="fee-schedule-title">연차료 납부 일정</h3>
        <span className="fee-schedule-dept">고지 수신처: {recipientLabel}</span>
      </div>
      <p className="table-subtext">{schedule.paymentRuleLabel}</p>
      <div className="table-wrap fee-schedule-table-wrap">
        <table>
          <thead>
            <tr>
              <th>연차</th>
              <th>납부 예정일</th>
              <th>검토 시작 · 고지 발송 ({schedule.mailLeadMonths}개월 전)</th>
              <th>예상 납부액</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {schedule.items.map((item) => (
              <tr
                key={`${item.yearLabel}-${item.dueDate}`}
                className={item.status === "NEXT" ? "fee-row-current" : item.status !== "FUTURE" ? "fee-row-past" : ""}
              >
                <td>
                  <strong>{item.yearLabel}</strong>
                  {item.adjusted ? <span className="table-subtext">조정됨</span> : null}
                </td>
                <td>{item.dueDate}</td>
                <td>
                  {item.reviewStartDate ?? "—"}
                  {item.status === "NEXT" && item.reviewStartDate && daysUntil(item.reviewStartDate) > 0 && (
                    <span className="table-subtext">D-{daysUntil(item.reviewStartDate)}</span>
                  )}
                </td>
                <td>{formatFeeAmount(item.estimatedAmount, item.currency, schedule.country)}</td>
                <td>
                  {item.status === "PAID_LUMP" ? (
                    <span className="badge badge-success">등록 시 일괄 납부</span>
                  ) : item.status === "PAST" ? (
                    <span className="badge badge-neutral">완료</span>
                  ) : item.status === "NEXT" ? (
                    <span className={`badge ${daysUntil(item.dueDate) <= 60 ? "badge-warning" : "badge-primary"}`}>
                      D-{daysUntil(item.dueDate)} 납부예정
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
      {upcomingFeeTotal(schedule) ? (
        <p className="table-subtext">향후 납부 예상 합계: {upcomingFeeTotal(schedule)}</p>
      ) : null}
    </div>
  );
}

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  KR: "KRW", US: "USD", JP: "JPY", CN: "CNY",
  EP: "EUR", DE: "EUR", FR: "EUR", NL: "EUR", GB: "GBP",
};

/** F2: 예상 납부액 표기 — 요금표 없는 국가·일괄 행은 — 로 둔다. currency가 null이면 country 기반 코드로 폴백한다. */
function formatFeeAmount(amount: number | null, currency: string | null, country?: string | null) {
  if (amount == null) {
    return "—";
  }
  const code = currency ?? (country ? (COUNTRY_CURRENCY_MAP[country.toUpperCase()] ?? null) : null);
  return `${new Intl.NumberFormat("ko-KR").format(amount)}${code ? ` ${code}` : ""}`;
}

/** F2: 향후(NEXT·FUTURE) 납부 예상 합계 — 금액 있는 항목이 없으면 null. */
function upcomingFeeTotal(schedule: PatentFeeSchedule): string | null {
  const upcoming = schedule.items.filter(
    (item) => (item.status === "NEXT" || item.status === "FUTURE") && item.estimatedAmount != null,
  );
  if (upcoming.length === 0) {
    return null;
  }
  const total = upcoming.reduce((sum, item) => sum + (item.estimatedAmount ?? 0), 0);
  return formatFeeAmount(total, upcoming[0].currency, schedule.country);
}

/**
 * @relatedFR FR-LEGAL-05
 * @relatedUI UI-LEGAL-04, UI-BUS-02
 * @description F6: 특허 패밀리 카드 — 같은 관리번호 계열의 국가별 출원을 한눈에 보고 상세로 이동한다.
 */
function PatentFamilyCard({ isAdmin, members }: { isAdmin: boolean; members: PatentListItem[] }) {
  return (
    <div className="fee-schedule-card">
      <div className="fee-schedule-header">
        <h3 className="fee-schedule-title">특허 패밀리</h3>
        <span className="fee-schedule-dept">같은 계열 {members.length}건</span>
      </div>
      <div className="table-wrap fee-schedule-table-wrap">
        <table>
          <thead>
            <tr>
              <th>관리번호</th>
              <th>국가</th>
              <th>상태</th>
              <th>납부 예정일</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.patentId}>
                <td>
                  <Link to={`${isAdmin ? "/admin" : "/business"}/patents/${member.patentId}`}>
                    {member.managementNumber}
                  </Link>
                </td>
                <td>{member.country}</td>
                <td>{reviewWorkflowStatusLabels[member.reviewWorkflowStatus]}</td>
                <td>{member.feeDueDate || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
