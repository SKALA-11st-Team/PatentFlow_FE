import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { submitBusinessChecklist } from "../../api/businessChecklist";
import { getLatestBusinessSubmission } from "../../api/businessSubmissions";
import { getDepartmentRecipientMappings, getMailingHistory } from "../../api/mailing";
import {
  getPatentDetail,
  getPatents,

  recordPatentFinalDecision,
  requestPatentAiReport,
  sendBusinessReviewMails,
} from "../../api/patents";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Section } from "../../components/common/Section";
import { BusinessSubmissionHistoryDetail } from "../../components/business/BusinessSubmissionHistoryDetail";
import { BusinessReviewMailPreviewModal } from "../../components/mailing/BusinessReviewMailPreviewModal";
import {
  createBusinessChecklistDraft,
  getBusinessChecklistTotal,
  getChecklistResponse,
} from "../../mocks/businessChecklist.mock";
import { useBusinessChecklistItems } from "../../hooks/useBusinessChecklistItems";
import type { BusinessChecklistItem, BusinessChecklistSubmission } from "../../types/businessChecklist";
import type { DepartmentRecipientMapping, MailingDeliveryStatus, MailingHistoryItem } from "../../types/mailing";
import type {
  LegalActionResult,
  PatentDetail,
  PatentLifecycleStatus,
  ReviewWorkflowStatus,
  UserRole,
} from "../../types/patent";
import {
  businessOpinionLabels,
  evaluationCategoryLabels,
  getRecommendationTone,
  legalActionResultLabels,
  recommendationLabels,
  reviewWorkflowStatusLabels,
} from "../../constants/status";
import {
  createGroupedBusinessReviewMailDrafts,
  toBusinessReviewMailSendDraft,
  type BusinessReviewMailDraft,
} from "../../utils/businessReviewMail";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008, FR-011, FR-012, FR-013, FR-017
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 관리자와 사업부 사용자가 각 역할에 맞게 특허 상세, AI 특허 평가 레포트, 의견/판단 정보를 확인하는 화면
 */
export function PatentDetailPage({ role }: { role: UserRole }) {
  const { patentId } = useParams();
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [patent, setPatent] = useState<PatentDetail | null>(null);
  const [loadMessage, setLoadMessage] = useState("특허 상세 정보를 불러오는 중입니다.");
  const [businessChecklistSubmission, setBusinessChecklistSubmission] = useState<BusinessChecklistSubmission>(() =>
    createEmptyBusinessChecklistDraft(patentId ?? ""),
  );
  const { items: businessChecklistItems } = useBusinessChecklistItems();
  const isAdmin = role === "ADMIN";
  const [hasSubmittedBusinessChecklist, setHasSubmittedBusinessChecklist] = useState(() => false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [legalActionDraft, setLegalActionDraft] = useState<LegalActionResult>("MAINTAINED");
  const [decisionReasonDraft, setDecisionReasonDraft] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [isApplyingDecision, setIsApplyingDecision] = useState(false);
  const [mailDrafts, setMailDrafts] = useState<BusinessReviewMailDraft[]>([]);
  const [recipientMappings, setRecipientMappings] = useState<DepartmentRecipientMapping[]>([]);
  const [activeMailIndex, setActiveMailIndex] = useState(0);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailingHistoryItems, setMailingHistoryItems] = useState<MailingHistoryItem[]>([]);
  const [isMailHistoryOpen, setIsMailHistoryOpen] = useState(false);
  const [mailHistoryMessage, setMailHistoryMessage] = useState("");
  const [isWorkflowActionProcessing, setIsWorkflowActionProcessing] = useState(false);
  const [workflowActionMessage, setWorkflowActionMessage] = useState("");
  const checklistTotal = getBusinessChecklistTotal(businessChecklistSubmission);
  const canRecordFinalDecision = patent ? isFinalDecisionRecordable(patent) : false;
  const canSendBusinessReviewMail = patent?.reviewWorkflowStatus === "MAIL_READY";
  const displayedBusinessOpinionLabel = patent
    ? hasSubmittedBusinessChecklist
      ? businessOpinionLabels[businessChecklistSubmission.finalOpinion]
      : patent.businessOpinion.opinion
        ? businessOpinionLabels[patent.businessOpinion.opinion]
        : null
    : null;
  const displayedBusinessOpinionComment = patent
    ? hasSubmittedBusinessChecklist
      ? businessChecklistSubmission.finalReason || patent.businessOpinion.comment
      : patent.businessOpinion.comment
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadPatentDetail() {
      if (!patentId) {
        setLoadMessage("특허 ID가 없습니다.");
        return;
      }

      setLoadMessage("특허 상세 정보를 불러오는 중입니다.");

      try {
        const nextPatent = await getPatentDetail(patentId);

        if (!isMounted) {
          return;
        }

        if (!nextPatent) {
          setLoadMessage("특허 상세 정보를 찾지 못했습니다.");
          return;
        }

        setPatent(nextPatent);

        if (hasPersistedBusinessOpinion(nextPatent)) {
          setHasSubmittedBusinessChecklist(true);
          try {
            const latestSubmission = await getLatestBusinessSubmission(nextPatent);
            const scores = latestSubmission?.checklistScores ?? [];
            if (latestSubmission && scores.length > 0) {
              setBusinessChecklistSubmission({
                patentId: nextPatent.patentId,
                evaluatorName: latestSubmission.submittedBy,
                evaluatedAt: latestSubmission.submittedAt.slice(0, 10),
                responses: scores.map((score) => ({
                  itemId: score.itemId,
                  score: score.score,
                  aiSuggestedScore: 0,
                  memo: score.memo,
                })),
                qualitativeScore: latestSubmission.qualitativeScore,
                qualitativeMemo: "",
                finalOpinion: latestSubmission.opinion,
                finalReason: latestSubmission.reason,
                additionalNeeds: "",
              });
            } else {
              setBusinessChecklistSubmission(createBusinessChecklistDraft(nextPatent));
            }
          } catch {
            setBusinessChecklistSubmission(createBusinessChecklistDraft(nextPatent));
          }
        } else {
          setBusinessChecklistSubmission(createBusinessChecklistDraft(nextPatent));
          setHasSubmittedBusinessChecklist(false);
        }

        setLoadMessage("");
      } catch {
        if (isMounted) {
          setLoadMessage("특허 상세 정보를 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
        }
      }
    }

    loadPatentDetail();

    return () => {
      isMounted = false;
    };
  }, [patentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipientMappings() {
      try {
        const nextMappings = await getDepartmentRecipientMappings();

        if (isMounted) {
          setRecipientMappings(nextMappings);
        }
      } catch {
        if (isMounted) {
          setRecipientMappings([]);
        }
      }
    }

    loadRecipientMappings();

    return () => {
      isMounted = false;
    };
  }, []);

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
          <Meta label="마감 기한" value={formatShortDate(patent.feeDueDate)} />
          <Meta label="관련사업 분야" value={patent.businessArea} />
          <Meta label="관련기술 분야" value={patent.technologyArea} />
          <Meta label="관련제품" value={patent.productName} />
          <Meta label="예상 소멸일" value={patent.expectedExpirationDate} />
        </div>
      </section>

      <div className="detail-followup-grid">
        {isAdmin ? (
          <>
            <BusinessOpinionSection isAdmin={isAdmin} />
            <AdminDecisionSection patentDetail={patent} />
          </>
        ) : (
          <BusinessOpinionSection isAdmin={isAdmin} />
        )}
      </div>

      <div className="detail-main">
        <Section
          title="AI 특허 평가 레포트"
          description="특허 유지 검토에 참고할 수 있는 AI 생성 평가 레포트입니다."
        >
            <div className="evaluation-header">
              <div>
                <span>종합 점수</span>
                <strong>{formatReportDisplayScore(patent.aiEvaluationReport)}</strong>
                {patent.aiEvaluationReport.totalScoreText ? (
                  <small>원문 점수 {patent.aiEvaluationReport.totalScoreText}</small>
                ) : null}
                <small>작성일 {formatDate(patent.aiEvaluationReport.createdAt)}</small>
              </div>
              <Badge tone={getRecommendationTone(patent.aiEvaluationReport.recommendation)}>
                {recommendationLabels[patent.aiEvaluationReport.recommendation]}
              </Badge>
            </div>
            <p className="notice">{patent.aiEvaluationReport.recommendationText}</p>
            {patent.aiEvaluationReport.keyEvidence ? (
              <div className="report-callout">
                <strong>핵심 근거</strong>
                <p>{patent.aiEvaluationReport.keyEvidence}</p>
              </div>
            ) : null}
            {patent.aiEvaluationReport.judgementGrounds?.length ? (
              <div className="report-block">
                <h3>판단 근거</h3>
                <ul className="clean-list">
                  {patent.aiEvaluationReport.judgementGrounds.map((ground) => (
                    <li key={ground}>{ground}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="score-list">
              {patent.aiEvaluationReport.scores.map((score) => (
                <div className="score-row" key={score.category}>
                  <div>
                    <strong>{evaluationCategoryLabels[score.category]}</strong>
                    <span>{score.evidenceSummary}</span>
                    {score.evidenceDetails?.length ? (
                      <ul className="score-detail-list">
                        {score.evidenceDetails.map((detail) => (
                          <li key={detail.text}>
                            {detail.text}
                            {detail.source ? (
                              <>
                                {" "}
                                <a className="inline-source-link" href={detail.source.url} rel="noreferrer" target="_blank">
                                  🔗 {detail.source.title}
                                </a>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <b>{score.score ?? "N/A"}</b>
                </div>
              ))}
            </div>
            {patent.aiEvaluationReport.businessCheckRequests?.length ? (
              <div className="report-block">
                <h3>사업부 확인 요청 사항</h3>
                <ul className="clean-list">
                  {patent.aiEvaluationReport.businessCheckRequests.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
        </Section>

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

        <Link className="back-link detail-back-link" to={role === "ADMIN" ? "/admin/dashboard" : "/business/dashboard"}>
          대시보드로 돌아가기
        </Link>
      </div>

      {isChecklistOpen ? (
        <BusinessChecklistModal
          initialSubmission={businessChecklistSubmission}
          onClose={() => setIsChecklistOpen(false)}
          onSubmit={async (submission) => {
            const savedSubmission = await submitBusinessChecklist(patent.patentId, submission);

            setBusinessChecklistSubmission(savedSubmission);
            setHasSubmittedBusinessChecklist(hasCompleteBusinessChecklistSubmission(savedSubmission));
            setPatent((await getPatentDetail(patent.patentId)) ?? patent);
            setIsChecklistOpen(false);
          }}
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

  async function handleOpenMailHistory() {
    if (!patent) {
      return;
    }

    setIsMailHistoryOpen(true);
    setMailHistoryMessage("메일 발송 내역을 불러오는 중입니다.");

    try {
      const nextHistoryItems = await getMailingHistory({ patentId: patent.patentId });

      setMailingHistoryItems(nextHistoryItems);
      setMailHistoryMessage(nextHistoryItems.length === 0 ? "이 특허의 메일 발송 내역이 없습니다." : "");
    } catch {
      setMailingHistoryItems([]);
      setMailHistoryMessage("메일 발송 내역을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
    }
  }

  async function handleOpenMailPreview() {
    if (!patent || patent.reviewWorkflowStatus !== "MAIL_READY") {
      setDecisionMessage("메일 발송 대기 상태의 특허만 발송할 수 있습니다.");
      return;
    }

    try {
      const allMailReady = await getPatents({ reviewWorkflowStatus: "MAIL_READY" });
      const sameDeptPatents = allMailReady.filter((p) => p.departmentId === patent.departmentId);
      const grouped = createGroupedBusinessReviewMailDrafts(
        sameDeptPatents.length > 0 ? sameDeptPatents : [patent],
        recipientMappings,
      );
      setMailDrafts(grouped);
    } catch {
      setMailDrafts(createGroupedBusinessReviewMailDrafts([patent], recipientMappings));
    }

    setActiveMailIndex(0);
    setIsSendConfirmOpen(false);
    setDecisionMessage("");
  }

  function handleCloseMailPreview() {
    if (isSendingMail) {
      return;
    }

    setMailDrafts([]);
    setActiveMailIndex(0);
    setIsSendConfirmOpen(false);
  }

  function handleUpdateMailDraft(nextDraft: BusinessReviewMailDraft) {
    setMailDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => (index === activeMailIndex ? nextDraft : draft)),
    );
  }

  async function handleConfirmSendMails() {
    if (!patent) {
      return;
    }

    setIsSendingMail(true);
    setDecisionMessage("");

    try {
      const result = await sendBusinessReviewMails(mailDrafts.map(toBusinessReviewMailSendDraft));
      const nextPatent = await getPatentDetail(patent.patentId);

      if (nextPatent) {
        setPatent(nextPatent);
      }

      setMailDrafts([]);
      setActiveMailIndex(0);
      setIsSendConfirmOpen(false);
      setDecisionMessage(
        result.updatedCount > 0 ? "사업부 검토 요청 메일을 발송했습니다." : "메일 발송 처리할 선택 건이 없습니다.",
      );
    } catch (error) {
      setDecisionMessage(error instanceof Error ? error.message : "메일 발송 처리에 실패했습니다.");
    } finally {
      setIsSendingMail(false);
    }
  }

  async function handleRecordFinalDecision() {
    if (!patent) {
      return;
    }

    const currentPatent = patent;
    setIsApplyingDecision(true);
    setDecisionMessage("");

    try {
      const trimmedReason = decisionReasonDraft.trim();

      if (!trimmedReason) {
        setDecisionMessage("최종 판단 사유를 입력해 주세요.");
        setIsApplyingDecision(false);
        return;
      }

      const result = await recordPatentFinalDecision(currentPatent.patentId, {
        legalActionResult: legalActionDraft,
        reason: trimmedReason,
      });
      const nextPatent = await getPatentDetail(currentPatent.patentId);

      if (nextPatent) {
        setPatent(nextPatent);
      }

      setDecisionMessage(`${legalActionResultLabels[result.legalActionResult]} 결과를 저장했습니다.`);
      setIsDecisionModalOpen(false);
    } catch (error) {
      setDecisionMessage(error instanceof Error ? error.message : "최종 처리 결과를 저장하지 못했습니다.");
    } finally {
      setIsApplyingDecision(false);
    }
  }

  async function handleRequestAiReport() {
    if (!patent) return;
    setIsWorkflowActionProcessing(true);
    setWorkflowActionMessage("");
    try {
      const updated = await requestPatentAiReport(patent.patentId);
      if (updated) setPatent(updated);
      setWorkflowActionMessage("AI 레포트 생성이 완료되었습니다.");
    } catch (error) {
      setWorkflowActionMessage(error instanceof Error ? error.message : "AI 레포트 생성에 실패했습니다.");
    } finally {
      setIsWorkflowActionProcessing(false);
    }
  }



  function BusinessOpinionSection({ isAdmin }: { isAdmin: boolean }) {
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
            <Button type="button" onClick={() => setIsChecklistOpen(true)}>
              의견 작성
            </Button>
          ) : null}
          {role === "BUSINESS" && hasSubmittedBusinessChecklist ? (
            <p className="notice" style={{ margin: 0, fontSize: "0.85em" }}>
              이미 제출한 의견은 변경할 수 없습니다.
            </p>
          ) : null}
        </div>
      </Section>
    );
  }

  function AdminDecisionSection({ patentDetail }: { patentDetail: PatentDetail }) {
    const canViewMailHistory = patentDetail.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE";

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
              onClick={() => openFinalDecisionModal(patentDetail)}
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
              <Button disabled={isWorkflowActionProcessing} onClick={handleRequestAiReport} type="button">
                {isWorkflowActionProcessing ? "AI 레포트 생성 중..." : "AI 레포트 생성"}
              </Button>
            ) : (
              <div className="inline-action-group">
                {patentDetail.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED" ? (
                  patentDetail.businessOpinion.opinion === "ABANDON" ? (
                    <Button
                      disabled={isApplyingDecision}
                      onClick={() => openFinalDecisionModal(patentDetail)}
                      type="button"
                    >
                      {isApplyingDecision ? "처리 중..." : "매각 완료"}
                    </Button>
                  ) : (
                    <Button
                      disabled={isApplyingDecision}
                      onClick={() => openFinalDecisionModal(patentDetail)}
                      type="button"
                    >
                      {isApplyingDecision ? "처리 중..." : "납부 완료"}
                    </Button>
                  )
                ) : (
                  <Button
                    disabled={!canSendBusinessReviewMail && !canViewMailHistory}
                    onClick={() => {
                      if (patentDetail.reviewWorkflowStatus === "MAIL_READY") {
                        handleOpenMailPreview();
                        return;
                      }
                      if (patentDetail.reviewWorkflowStatus === "WAITING_BUSINESS_RESPONSE") {
                        handleOpenMailHistory();
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

  function openFinalDecisionModal(patentDetail: PatentDetail) {
    const derived = patentDetail.businessOpinion.opinion === "ABANDON" ? "SOLD" : "MAINTAINED";
    setLegalActionDraft(patentDetail.legalActionResult ?? derived);
    setDecisionReasonDraft(patentDetail.finalDecisionRecord.reason ?? "");
    setDecisionMessage("");
    setIsDecisionModalOpen(true);
  }
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 사업부 의견 제출 완료 여부를 체크리스트, 정성 평가, 사업부 의견 수신 상태 기준으로 판정한다.
 */
function hasPersistedBusinessOpinion(patent: { businessOpinion: { opinion: unknown; submittedAt: string | null } }) {
  return Boolean(patent.businessOpinion.opinion && patent.businessOpinion.submittedAt);
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-BUS-03
 * @description 특허 상세 API 응답 전 체크리스트 상태 초기화를 위한 빈 제출 초안을 만든다.
 */
function createEmptyBusinessChecklistDraft(patentId: string): BusinessChecklistSubmission {
  return {
    patentId,
    evaluatorName: "",
    evaluatedAt: "",
    responses: [],
    qualitativeScore: 0,
    qualitativeMemo: "",
    finalOpinion: "MAINTAIN",
    finalReason: "",
    additionalNeeds: "",
  };
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 체크리스트, 정성 평가, 사업부 의견이 모두 있는지 확인해 사업부 의견 전달 완료 여부를 판정한다.
 */
function hasCompleteBusinessChecklistSubmission(submission: BusinessChecklistSubmission) {
  return Boolean(
    submission.responses.length > 0 &&
      submission.responses.every((response) => response.score !== null && response.score > 0) &&
      Number.isFinite(submission.qualitativeScore) &&
      submission.finalOpinion,
  );
}

function FinalDecisionModal({
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
          <p className="eyebrow">{legalActionResult === "SOLD" ? "매각 처리" : "납부 완료"}</p>
          <h2>{legalActionResult === "SOLD" ? "매각 완료 확인" : "납부 완료 확인"}</h2>
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
          {isSubmitting ? "처리 중..." : legalActionResult === "SOLD" ? "매각 완료" : "납부 완료"}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * @relatedFR FR-014, FR-016
 * @relatedUI UI-LEGAL-05
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
  SENT: "발송 완료",
};

/**
 * @relatedFR FR-016
 * @relatedUI UI-LEGAL-05
 * @description 메일 발송 처리 상태에 맞는 공통 Badge 톤을 반환한다.
 */
function getMailingHistoryStatusTone(status: MailingDeliveryStatus): BadgeTone {
  if (status === "SENT") {
    return "success";
  }

  if (status === "FAILED") {
    return "danger";
  }

  return "warning";
}

/**
 * @relatedFR FR-016
 * @relatedUI UI-LEGAL-05
 * @description 메일 발송 시각을 목록 표시용 yyyy-mm-dd hh:mm 형식으로 줄인다.
 */
function formatDateTime(dateText: string) {
  return dateText.replace("T", " ").slice(0, 16);
}

/**
 * @relatedFR FR-011, FR-012
 * @relatedUI UI-LEGAL-05
 * @description 관리자 최종 판단 입력 가능 workflow 상태를 판정한다.
 */
function isFinalDecisionRecordable(patent: PatentDetail) {
  return (
    Boolean(patent.finalDecisionRecord.decisionId) ||
    patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED" ||
    patent.reviewWorkflowStatus === "LEGAL_ACTION_RECORDED"
  );
}

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 사업부 담당자가 AI 제안 점수를 참고해 평가 체크리스트를 작성하고 관리자에게 전달하는 모달
 */
function BusinessChecklistModal({
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

/**
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-03
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
 * @relatedFR FR-009
 * @relatedUI UI-LEGAL-05, UI-BUS-03
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
 * @relatedFR FR-005
 * @relatedUI UI-LEGAL-05, UI-BUS-03
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

/**
 * @relatedFR FR-012
 * @relatedUI UI-LEGAL-05, UI-BUS-03
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
 * @relatedFR FR-012
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 관리자 특허 상세의 현재 workflow 단계에 맞는 액션 설명을 반환한다.
 */
function getAdminActionDescription(workflowStatus: ReviewWorkflowStatus) {
  if (workflowStatus === "REVIEW_QUARTER_STARTED") return "FastAPI AI 에이전트를 호출해 특허 평가 레포트를 생성합니다.";
  if (workflowStatus === "MAIL_READY") return "AI 특허 평가 레포트가 생성되었습니다. 사업부서 담당자에게 메일을 발송하세요.";
  if (workflowStatus === "WAITING_BUSINESS_RESPONSE") return "사업부서 담당자의 유지/포기 의견 제출을 기다리는 중입니다.";
  if (workflowStatus === "BUSINESS_RESPONSE_RECEIVED") return "사업부 의견을 확인한 뒤 유지, 포기, 매각 중 실제 처리 결과를 입력해야 합니다.";
  return "아직 입력된 최종 처리 결과가 없습니다.";
}

/**
 * @relatedFR FR-012
 * @relatedUI UI-LEGAL-05, UI-BUS-03
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

/**
 * @relatedFR FR-001, FR-005
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description 특허 상세 마감 기한을 yy-mm-dd 형식으로 표시한다.
 */
function formatShortDate(dateText: string) {
  return dateText.slice(2);
}

/**
 * @relatedFR FR-006, FR-011
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description AI 특허 평가 레포트 작성일을 yyyy-mm-dd 형식으로 표시한다.
 */
function formatDate(dateText: string) {
  return dateText.slice(0, 10);
}

/**
 * @relatedFR FR-006, FR-008
 * @relatedUI UI-LEGAL-05, UI-BUS-03
 * @description AI 레포트 종합 점수는 원문 합산 점수가 아니라 평균 점수를 대표값으로 표시한다.
 */
function formatReportDisplayScore(report: PatentDetail["aiEvaluationReport"]) {
  return report.averageScore ?? report.totalScore;
}
