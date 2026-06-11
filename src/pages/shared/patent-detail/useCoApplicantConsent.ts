import { useState, type Dispatch, type SetStateAction } from "react";
import { recordCoApplicantConsent } from "../../../api/patents";
import { useToast } from "../../../components/common/toastContext";
import { coApplicantConsentStatusLabels, type CoApplicantConsentStatus } from "../../../constants/status";
import type { PatentDetail } from "../../../types/patent";

interface UseCoApplicantConsentArgs {
  patent: PatentDetail | null;
  setPatent: Dispatch<SetStateAction<PatentDetail | null>>;
  refreshPatentHistory: (patentId: string) => Promise<void>;
}

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10
 * @relatedUI UI-LEGAL-04
 * @description 공동출원 특허의 공동출원인 합의(모달/초안/저장) 상태를 관리한다. 최종 판단의 전제 게이트.
 */
export function useCoApplicantConsent({ patent, setPatent, refreshPatentHistory }: UseCoApplicantConsentArgs) {
  const { showToast } = useToast();
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentStatusDraft, setConsentStatusDraft] = useState<CoApplicantConsentStatus>("AGREED");
  const [consentReasonDraft, setConsentReasonDraft] = useState("");
  const [consentMessage, setConsentMessage] = useState("");
  const [isApplyingConsent, setIsApplyingConsent] = useState(false);

  async function handleRecordConsent() {
    if (!patent) {
      return;
    }
    const trimmedReason = consentReasonDraft.trim();
    if (!trimmedReason) {
      setConsentMessage("합의 내용/사유를 입력해 주세요.");
      return;
    }

    setIsApplyingConsent(true);
    setConsentMessage("");
    try {
      const updated = await recordCoApplicantConsent(patent.patentId, {
        status: consentStatusDraft,
        reason: trimmedReason,
      });
      if (updated) {
        setPatent(updated);
        refreshPatentHistory(updated.patentId);
      }
      const label = coApplicantConsentStatusLabels[consentStatusDraft];
      setConsentMessage(`공동출원인 합의(${label})를 기록했습니다.`);
      showToast(`공동출원인 합의(${label})를 기록했습니다.`, "success");
      setIsConsentModalOpen(false);
    } catch (error) {
      setConsentMessage(error instanceof Error ? error.message : "공동출원인 합의를 기록하지 못했습니다.");
    } finally {
      setIsApplyingConsent(false);
    }
  }

  function openConsentModal() {
    setConsentStatusDraft(patent?.coApplicantConsent?.status === "DISAGREED" ? "DISAGREED" : "AGREED");
    setConsentReasonDraft(patent?.coApplicantConsent?.reason ?? "");
    setConsentMessage("");
    setIsConsentModalOpen(true);
  }

  return {
    isConsentModalOpen,
    setIsConsentModalOpen,
    consentStatusDraft,
    setConsentStatusDraft,
    consentReasonDraft,
    setConsentReasonDraft,
    consentMessage,
    isApplyingConsent,
    handleRecordConsent,
    openConsentModal,
  };
}
