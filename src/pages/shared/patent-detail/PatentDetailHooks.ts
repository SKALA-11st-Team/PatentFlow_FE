import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { submitBusinessChecklist } from "../../../api/businessChecklist";
import { getLatestBusinessSubmission } from "../../../api/businessSubmissions";
import { getDepartmentRecipientMappings, getMailingHistory } from "../../../api/mailing";
import {
  getPatentDetail,
  getBusinessPatentDetail,
  getPatentAiReportStatus,
  getPatentHistory,
  getPatents,
  recordPatentFinalDecision,
  requestPatentAiReport,
  sendBusinessReviewMails,
  updatePatentFinalDecision,
} from "../../../api/patents";
import {
  createBusinessChecklistDraft,
  getBusinessChecklistTotal,
} from "../../../utils/businessChecklist";
import { useBusinessChecklistItems } from "../../../hooks/useBusinessChecklistItems";
import { businessOpinionLabels, legalActionResultLabels } from "../../../constants/status";
import type { BusinessChecklistSubmission } from "../../../types/businessChecklist";
import type { DepartmentRecipientMapping, MailingHistoryItem } from "../../../types/mailing";
import type { AiReportJob, LegalActionResult, PatentDetail, PatentHistoryItem, UserRole } from "../../../types/patent";
import {
  createGroupedBusinessReviewMailDrafts,
  toBusinessReviewMailSendDraft,
  type BusinessReviewMailDraft,
} from "../../../utils/businessReviewMail";

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-05
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 특허 상세 날짜를 yyyy-mm-dd 형식으로 표시한다.
 */
export function formatDate(dateText: string) {
  return dateText.slice(0, 10);
}

/**
 * @relatedFR FR-LEGAL-06, FR-LEGAL-08
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description AI 레포트 종합 점수는 원문 합산 점수가 아니라 평균 점수를 대표값으로 표시한다.
 */
export function formatReportDisplayScore(report: PatentDetail["aiEvaluationReport"]) {
  return report.averageScore ?? report.totalScore;
}

const AI_REPORT_POLL_INTERVAL_MS = 3000;
const AI_REPORT_POLL_TIMEOUT_MS = 20 * 60 * 1000;

async function waitForAiReportJob(patentId: string, initialJob?: AiReportJob): Promise<AiReportJob | undefined> {
  if (initialJob && isAiReportTerminalStatus(initialJob.status)) {
    return initialJob;
  }

  const startedAt = Date.now();
  let latestJob = initialJob;

  while (Date.now() - startedAt < AI_REPORT_POLL_TIMEOUT_MS) {
    await sleep(AI_REPORT_POLL_INTERVAL_MS);
    latestJob = await getPatentAiReportStatus(patentId);
    if (latestJob && isAiReportTerminalStatus(latestJob.status)) {
      return latestJob;
    }
  }

  throw new Error("AI 레포트 생성 상태 확인 시간이 초과되었습니다.");
}

function isAiReportTerminalStatus(status: AiReportJob["status"] | null | undefined) {
  return status === "SUCCEEDED" || status === "FAILED" || status === "DEGRADED";
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 사업부 의견 제출 완료 여부를 체크리스트, 정성 평가, 사업부 의견 수신 상태 기준으로 판정한다.
 */
export function hasPersistedBusinessOpinion(patent: { businessOpinion: { opinion: unknown; submittedAt: string | null } }) {
  return Boolean(patent.businessOpinion.opinion && patent.businessOpinion.submittedAt);
}

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-BUS-03
 * @description 특허 상세 API 응답 전 체크리스트 상태 초기화를 위한 빈 제출 초안을 만든다.
 */
export function createEmptyBusinessChecklistDraft(patentId: string): BusinessChecklistSubmission {
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
 * @relatedFR FR-BUS-01
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 체크리스트, 정성 평가, 사업부 의견이 모두 있는지 확인해 사업부 의견 전달 완료 여부를 판정한다.
 */
export function hasCompleteBusinessChecklistSubmission(submission: BusinessChecklistSubmission) {
  return Boolean(
    submission.responses.length > 0 &&
      submission.responses.every((response) => response.score !== null && response.score > 0) &&
      Number.isFinite(submission.qualitativeScore) &&
      submission.finalOpinion,
  );
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-04
 * @description 관리자 최종 판단 입력 가능 workflow 상태를 판정한다.
 */
export function isFinalDecisionRecordable(patent: PatentDetail) {
  return (
    Boolean(patent.finalDecisionRecord.decisionId) ||
    patent.legalActionResult !== null ||
    patent.reviewWorkflowStatus === "BUSINESS_RESPONSE_RECEIVED"
  );
}

/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-11, FR-LEGAL-15
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 특허 상세 화면의 데이터 적재, 사업부 의견/체크리스트, 최종 판단, 메일 발송 상태 로직을 한 곳에서 관리한다.
 */
export function usePatentDetail(role: UserRole) {
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
  const [patentHistoryItems, setPatentHistoryItems] = useState<PatentHistoryItem[]>([]);
  const [patentHistoryMessage, setPatentHistoryMessage] = useState("");
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
        const nextPatent = isAdmin ? await getPatentDetail(patentId) : await getBusinessPatentDetail(patentId);

        if (!isMounted) {
          return;
        }

        if (!nextPatent) {
          setLoadMessage("특허 상세 정보를 찾지 못했습니다.");
          return;
        }

        setPatent(nextPatent);
        setPatentHistoryMessage("평가 및 판단 이력을 불러오는 중입니다.");

        try {
          const nextHistoryItems = await getPatentHistory(nextPatent.patentId);

          if (isMounted) {
            setPatentHistoryItems(nextHistoryItems);
            setPatentHistoryMessage(nextHistoryItems.length === 0 ? "아직 저장된 평가 및 판단 이력이 없습니다." : "");
          }
        } catch {
          if (isMounted) {
            setPatentHistoryItems([]);
            setPatentHistoryMessage("평가 및 판단 이력을 불러오지 못했습니다.");
          }
        }

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
  }, [isAdmin, patentId]);

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

  async function refreshPatentHistory(nextPatentId: string) {
    setPatentHistoryMessage("평가 및 판단 이력을 불러오는 중입니다.");
    try {
      const nextHistoryItems = await getPatentHistory(nextPatentId);
      setPatentHistoryItems(nextHistoryItems);
      setPatentHistoryMessage(nextHistoryItems.length === 0 ? "아직 저장된 평가 및 판단 이력이 없습니다." : "");
    } catch {
      setPatentHistoryItems([]);
      setPatentHistoryMessage("평가 및 판단 이력을 불러오지 못했습니다.");
    }
  }

  async function handleSubmitChecklist(submission: BusinessChecklistSubmission) {
    if (!patent) {
      return;
    }

    const savedSubmission = await submitBusinessChecklist(patent.patentId, submission);

    setBusinessChecklistSubmission(savedSubmission);
    setHasSubmittedBusinessChecklist(hasCompleteBusinessChecklistSubmission(savedSubmission));
    setPatent((await getPatentDetail(patent.patentId)) ?? patent);
    setIsChecklistOpen(false);
  }

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
        refreshPatentHistory(nextPatent.patentId);
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

      const saveFinalDecision = currentPatent.finalDecisionRecord.decisionId
        ? updatePatentFinalDecision
        : recordPatentFinalDecision;
      const result = await saveFinalDecision(currentPatent.patentId, {
        legalActionResult: legalActionDraft,
        reason: trimmedReason,
      });
      const nextPatent = await getPatentDetail(currentPatent.patentId);

      if (nextPatent) {
        setPatent(nextPatent);
        refreshPatentHistory(nextPatent.patentId);
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
      const job = await requestPatentAiReport(patent.patentId);
      setWorkflowActionMessage(job?.message ?? "AI 레포트 생성을 시작했습니다.");
      const completedJob = await waitForAiReportJob(patent.patentId, job);

      if (completedJob?.status === "FAILED") {
        setWorkflowActionMessage(completedJob.message ?? "AI 레포트 생성에 실패했습니다.");
        return;
      }

      const updated = await getPatentDetail(patent.patentId);
      if (updated) {
        setPatent(updated);
        refreshPatentHistory(updated.patentId);
      }
      setWorkflowActionMessage(
        completedJob?.status === "DEGRADED"
          ? completedJob.message ?? "AI 레포트가 제한된 근거로 생성되었습니다."
          : "AI 레포트 생성이 완료되었습니다.",
      );
    } catch (error) {
      setWorkflowActionMessage(error instanceof Error ? error.message : "AI 레포트 생성에 실패했습니다.");
    } finally {
      setIsWorkflowActionProcessing(false);
    }
  }

  function openFinalDecisionModal(patentDetail: PatentDetail) {
    const derived = patentDetail.businessOpinion.opinion === "ABANDON" ? "ABANDONED" : "MAINTAINED";
    setLegalActionDraft(patentDetail.legalActionResult ?? derived);
    setDecisionReasonDraft(patentDetail.finalDecisionRecord.reason ?? "");
    setDecisionMessage("");
    setIsDecisionModalOpen(true);
  }

  return {
    patentId,
    isAdmin,
    role,
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
    refreshPatentHistory,
    handleSubmitChecklist,
    handleOpenMailHistory,
    handleOpenMailPreview,
    handleCloseMailPreview,
    handleUpdateMailDraft,
    handleConfirmSendMails,
    handleRecordFinalDecision,
    handleRequestAiReport,
    openFinalDecisionModal,
  };
}
