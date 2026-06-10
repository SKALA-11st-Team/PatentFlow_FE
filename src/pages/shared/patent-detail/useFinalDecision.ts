import { useState, type Dispatch, type SetStateAction } from "react";
import { getPatentDetail, recordPatentFinalDecision, updatePatentFinalDecision } from "../../../api/patents";
import { legalActionResultLabels } from "../../../constants/status";
import type { LegalActionResult, PatentDetail } from "../../../types/patent";

interface UseFinalDecisionArgs {
  patent: PatentDetail | null;
  setPatent: Dispatch<SetStateAction<PatentDetail | null>>;
  refreshPatentHistory: (patentId: string) => Promise<void>;
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-15
 * @relatedUI UI-LEGAL-04
 * @description 관리자 최종 판단(모달/초안/저장) 상태를 관리한다.
 *     usePatentDetail 메가훅에서 순수 분리한 클러스터로, 동작 변경은 없다.
 *     decisionMessage는 메일 발송 흐름도 같은 영역에 메시지를 쓰므로 setter를 함께 노출한다.
 */
export function useFinalDecision({ patent, setPatent, refreshPatentHistory }: UseFinalDecisionArgs) {
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [legalActionDraft, setLegalActionDraft] = useState<LegalActionResult>("MAINTAINED");
  const [decisionReasonDraft, setDecisionReasonDraft] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [isApplyingDecision, setIsApplyingDecision] = useState(false);

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

  function openFinalDecisionModal(patentDetail: PatentDetail) {
    const derived = patentDetail.businessOpinion.opinion === "ABANDON" ? "ABANDONED" : "MAINTAINED";
    setLegalActionDraft(patentDetail.legalActionResult ?? derived);
    setDecisionReasonDraft(patentDetail.finalDecisionRecord.reason ?? "");
    setDecisionMessage("");
    setIsDecisionModalOpen(true);
  }

  return {
    isDecisionModalOpen,
    setIsDecisionModalOpen,
    legalActionDraft,
    decisionReasonDraft,
    setDecisionReasonDraft,
    decisionMessage,
    setDecisionMessage,
    isApplyingDecision,
    handleRecordFinalDecision,
    openFinalDecisionModal,
  };
}
