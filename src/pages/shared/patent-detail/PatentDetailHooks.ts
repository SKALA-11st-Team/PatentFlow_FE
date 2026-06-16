import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { submitBusinessChecklist } from "../../../api/businessChecklist";
import { getLatestBusinessSubmission } from "../../../api/businessSubmissions";
import {
  getPatentDetail,
  getBusinessPatentDetail,
  getPatentAiReportStatus,
  getPatentHistory,
  requestPatentAiReport,
} from "../../../api/patents";
// CONTRACT-02: 대표 점수 산식은 api/patents의 단일 정본을 재노출한다(기존 import 경로 호환).
export { formatReportDisplayScore } from "../../../api/patents";
import {
  createBusinessChecklistDraft,
  getBusinessChecklistTotal,
} from "../../../utils/businessChecklist";
import { useBusinessChecklistItems } from "../../../hooks/useBusinessChecklistItems";
import { businessOpinionLabels } from "../../../constants/status";
import type { BusinessChecklistSubmission } from "../../../types/businessChecklist";
import type { AiReportJob, PatentDetail, PatentHistoryItem, UserRole } from "../../../types/patent";
import { useCoApplicantConsent } from "./useCoApplicantConsent";
import { useFinalDecision } from "./useFinalDecision";
import { useMailWorkflow } from "./useMailWorkflow";

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-05
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description 특허 상세 날짜를 yyyy-mm-dd 형식으로 표시한다.
 */
export function formatDate(dateText: string) {
  return dateText.slice(0, 10);
}

const AI_REPORT_POLL_INTERVAL_MS = 3000;
const AI_REPORT_POLL_TIMEOUT_MS = 20 * 60 * 1000;

async function waitForAiReportJob(
  patentId: string,
  initialJob?: AiReportJob,
  onProgress?: (stageLabel: string | null) => void,
  signal?: AbortSignal,
): Promise<AiReportJob | undefined> {
  if (initialJob && isAiReportTerminalStatus(initialJob.status)) {
    return initialJob;
  }

  const startedAt = Date.now();
  let latestJob = initialJob;

  while (Date.now() - startedAt < AI_REPORT_POLL_TIMEOUT_MS) {
    if (signal?.aborted) return undefined;
    await sleep(AI_REPORT_POLL_INTERVAL_MS);
    if (signal?.aborted) return undefined;
    latestJob = await getPatentAiReportStatus(patentId);
    if (latestJob && isAiReportTerminalStatus(latestJob.status)) {
      return latestJob;
    }
    // W1: RUNNING 중에는 agent 진행 단계(근거 수집/압축/4축 평가/레포트 작성)를 화면에 중계한다.
    if (latestJob?.status === "RUNNING" && onProgress) {
      onProgress(latestJob.progressStageLabel ?? null);
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
      submission.responses.every((response) => response.score !== null && response.score >= 1 && response.score <= 4) &&
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
 * @description 특허 상세 화면의 데이터 적재와 사업부 의견/체크리스트 상태를 관리하고,
 *     최종 판단(useFinalDecision)·메일 발송(useMailWorkflow) 클러스터를 합성해 기존 인터페이스를 유지한다.
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
  const [patentHistoryItems, setPatentHistoryItems] = useState<PatentHistoryItem[]>([]);
  const [patentHistoryMessage, setPatentHistoryMessage] = useState("");
  const [isWorkflowActionProcessing, setIsWorkflowActionProcessing] = useState(false);
  const [workflowActionMessage, setWorkflowActionMessage] = useState("");
  const [aiReportScrollTrigger, setAiReportScrollTrigger] = useState(0);
  const [regenStartedAt, setRegenStartedAt] = useState<string | null>(null);
  const regenAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      regenAbortRef.current?.abort();
    };
  }, []);
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

      // handleRequestAiReport finally가 signal.aborted 시 reset을 건너뛰어 다음 특허에 "생성 중..." 잔존하는 것을 방지.
      setIsWorkflowActionProcessing(false);
      setWorkflowActionMessage("");
      setRegenStartedAt(null);

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

        if (isAdmin) {
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
        } else {
          // /patents/{id}/history는 ADMIN 전용 — BUSINESS는 보장된 403 호출 대신 호출을 생략한다.
          setPatentHistoryItems([]);
          setPatentHistoryMessage("기존 의사결정 기록이 없습니다.");
        }

        if (!isMounted) {
          return;
        }

        if (hasPersistedBusinessOpinion(nextPatent)) {
          setHasSubmittedBusinessChecklist(true);
          try {
            const latestSubmission = await getLatestBusinessSubmission(nextPatent);
            if (!isMounted) {
              return;
            }
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
              setBusinessChecklistSubmission(createBusinessChecklistDraft(nextPatent, businessChecklistItems));
            }
          } catch {
            if (isMounted) {
              setBusinessChecklistSubmission(createBusinessChecklistDraft(nextPatent, businessChecklistItems));
            }
          }
        } else {
          setBusinessChecklistSubmission(createBusinessChecklistDraft(nextPatent));
          setHasSubmittedBusinessChecklist(false);
        }

        if (isMounted) {
          setLoadMessage("");
        }

        // 페이지를 나갔다 돌아온 경우 실행 중인 재생성 job을 감지해 폴링을 재개한다.
        try {
          const runningJob = await getPatentAiReportStatus(nextPatent.patentId);
          if (!isMounted) return;
          if (runningJob && (runningJob.status === "RUNNING" || runningJob.status === "PENDING")) {
            const startedAt = runningJob.requestedAt ?? null;
            setRegenStartedAt(startedAt);
            setIsWorkflowActionProcessing(true);
            setWorkflowActionMessage(
              runningJob.progressStageLabel
                ? `AI 레포트 생성 중 · ${runningJob.progressStageLabel}`
                : "AI 레포트를 생성하고 있어요...",
            );

            regenAbortRef.current?.abort();
            const resumeController = new AbortController();
            regenAbortRef.current = resumeController;

            waitForAiReportJob(
              nextPatent.patentId,
              runningJob,
              (stageLabel) => {
                if (!resumeController.signal.aborted) {
                  setWorkflowActionMessage(stageLabel ? `AI 레포트 생성 중 · ${stageLabel}` : "AI 레포트를 생성하고 있어요...");
                }
              },
              resumeController.signal,
            )
              .then(async (completedJob) => {
                if (resumeController.signal.aborted) return;
                const updated = isAdmin
                  ? await getPatentDetail(nextPatent.patentId)
                  : await getBusinessPatentDetail(nextPatent.patentId);
                if (resumeController.signal.aborted) return;
                if (updated) {
                  setPatent(updated);
                  if (isAdmin) refreshPatentHistory(updated.patentId);
                  setAiReportScrollTrigger((n) => n + 1);
                }
                setWorkflowActionMessage(
                  completedJob?.status === "DEGRADED"
                    ? completedJob.message ?? "일부 정보로 AI 레포트를 생성했어요."
                    : "AI 레포트 생성이 완료됐어요!",
                );
                setIsWorkflowActionProcessing(false);
                setRegenStartedAt(null);
              })
              .catch(() => {
                if (!resumeController.signal.aborted) {
                  setWorkflowActionMessage("AI 레포트 생성 상태를 확인하지 못했어요.");
                  setIsWorkflowActionProcessing(false);
                  setRegenStartedAt(null);
                }
              });
          }
        } catch {
          // 재생성 상태 확인 실패는 비치명 — 특허 로드 자체는 성공했으므로 무시.
        }
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
    try {
      // 사업부 사용자는 ADMIN 전용 /patents/{id}가 403이므로 역할에 맞는 상세 API로 재조회한다.
      // 과거에는 항상 getPatentDetail을 호출해 제출이 성공해도 403으로 모달이 닫히지 않았다.
      const refreshed = isAdmin
        ? await getPatentDetail(patent.patentId)
        : await getBusinessPatentDetail(patent.patentId);
      if (refreshed) {
        setPatent(refreshed);
      }
    } catch {
      // 재조회 실패는 비치명 — 제출 자체는 성공했으므로 모달은 닫는다.
    }
    setIsChecklistOpen(false);
  }

  // 최종 판단/메일 발송 클러스터 — 순수 분리된 훅을 합성한다(외부 인터페이스 불변).
  const finalDecision = useFinalDecision({ patent, setPatent, refreshPatentHistory });
  // 공동출원 합의 게이트 클러스터.
  const coApplicantConsent = useCoApplicantConsent({ patent, setPatent, refreshPatentHistory });
  const mailWorkflow = useMailWorkflow({
    patent,
    setPatent,
    refreshPatentHistory,
    setActionMessage: finalDecision.setDecisionMessage,
  });

  async function handleRequestAiReport() {
    if (!patent) return;

    // 이전 폴링 취소(페이지 이탈 또는 재클릭 시)
    regenAbortRef.current?.abort();
    const abortController = new AbortController();
    regenAbortRef.current = abortController;
    const { signal } = abortController;

    setIsWorkflowActionProcessing(true);
    setWorkflowActionMessage("");
    try {
      const job = await requestPatentAiReport(patent.patentId);
      if (signal.aborted) return;
      setRegenStartedAt(job?.requestedAt ?? null);
      setWorkflowActionMessage(job?.message ?? "AI 레포트 생성을 시작했어요.");
      const completedJob = await waitForAiReportJob(patent.patentId, job, (stageLabel) => {
        // W1: 진행 단계 중계 — 단계 정보가 없으면 일반 진행 문구를 유지한다.
        if (!signal.aborted) {
          setWorkflowActionMessage(stageLabel ? `AI 레포트 생성 중 · ${stageLabel}` : "AI 레포트를 생성하고 있어요...");
        }
      }, signal);

      if (signal.aborted) return;

      if (completedJob?.status === "FAILED") {
        // I2: 실패 사유를 그대로 보여주고 같은 버튼으로 재시도할 수 있음을 안내한다.
        setWorkflowActionMessage(
          `${completedJob.message ?? "AI 레포트 생성에 실패했어요."} 같은 버튼으로 다시 시도해 보세요.`,
        );
        return;
      }

      // 사업부 사용자는 ADMIN 전용 /patents/{id}가 403이므로 역할에 맞는 상세 API로 재조회한다.
      // 과거에는 항상 getPatentDetail을 호출해 재생성이 성공해도 403이 catch로 잡혀 실패로 표시됐다.
      const updated = isAdmin
        ? await getPatentDetail(patent.patentId)
        : await getBusinessPatentDetail(patent.patentId);
      if (signal.aborted) return;
      if (updated) {
        setPatent(updated);
        // /patents/{id}/history도 ADMIN 전용 — BUSINESS는 보장된 403 호출을 생략한다.
        if (isAdmin) {
          refreshPatentHistory(updated.patentId);
        }
        setAiReportScrollTrigger((n) => n + 1);
      }
      setWorkflowActionMessage(
        completedJob?.status === "DEGRADED"
          ? completedJob.message ?? "일부 정보로 AI 레포트를 생성했어요."
          : "AI 레포트 생성이 완료됐어요!",
      );
    } catch (error) {
      if (!signal.aborted) {
        setWorkflowActionMessage(error instanceof Error ? error.message : "AI 레포트 생성에 실패했어요.");
      }
    } finally {
      if (!signal.aborted) {
        setIsWorkflowActionProcessing(false);
        setRegenStartedAt(null);
      }
    }
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
    isApplyingDecision: finalDecision.isApplyingDecision,
    isWorkflowActionProcessing,
    decisionMessage: finalDecision.decisionMessage,
    workflowActionMessage,
    legalActionDraft: finalDecision.legalActionDraft,
    decisionReasonDraft: finalDecision.decisionReasonDraft,
    setDecisionReasonDraft: finalDecision.setDecisionReasonDraft,
    isChecklistOpen,
    setIsChecklistOpen,
    isDecisionModalOpen: finalDecision.isDecisionModalOpen,
    setIsDecisionModalOpen: finalDecision.setIsDecisionModalOpen,
    // 공동출원 합의 게이트
    coApplicantConsentMessage: coApplicantConsent.consentMessage,
    isApplyingCoApplicantConsent: coApplicantConsent.isApplyingConsent,
    isConsentModalOpen: coApplicantConsent.isConsentModalOpen,
    consentStatusDraft: coApplicantConsent.consentStatusDraft,
    setConsentStatusDraft: coApplicantConsent.setConsentStatusDraft,
    consentReasonDraft: coApplicantConsent.consentReasonDraft,
    setConsentReasonDraft: coApplicantConsent.setConsentReasonDraft,
    handleRecordCoApplicantConsent: coApplicantConsent.handleRecordConsent,
    openCoApplicantConsentModal: coApplicantConsent.openConsentModal,
    setIsConsentModalOpen: coApplicantConsent.setIsConsentModalOpen,
    mailDrafts: mailWorkflow.mailDrafts,
    activeMailIndex: mailWorkflow.activeMailIndex,
    setActiveMailIndex: mailWorkflow.setActiveMailIndex,
    isSendConfirmOpen: mailWorkflow.isSendConfirmOpen,
    setIsSendConfirmOpen: mailWorkflow.setIsSendConfirmOpen,
    isSendingMail: mailWorkflow.isSendingMail,
    mailingHistoryItems: mailWorkflow.mailingHistoryItems,
    isMailHistoryOpen: mailWorkflow.isMailHistoryOpen,
    setIsMailHistoryOpen: mailWorkflow.setIsMailHistoryOpen,
    mailHistoryMessage: mailWorkflow.mailHistoryMessage,
    patentHistoryItems,
    patentHistoryMessage,
    refreshPatentHistory,
    handleSubmitChecklist,
    handleOpenMailHistory: mailWorkflow.handleOpenMailHistory,
    handleOpenMailPreview: mailWorkflow.handleOpenMailPreview,
    handleCloseMailPreview: mailWorkflow.handleCloseMailPreview,
    handleUpdateMailDraft: mailWorkflow.handleUpdateMailDraft,
    handleConfirmSendMails: mailWorkflow.handleConfirmSendMails,
    handleRecordFinalDecision: finalDecision.handleRecordFinalDecision,
    handleRequestAiReport,
    aiReportScrollTrigger,
    regenStartedAt,
    openFinalDecisionModal: finalDecision.openFinalDecisionModal,
  };
}
