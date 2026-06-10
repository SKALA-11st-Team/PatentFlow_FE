import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getDepartmentRecipientMappings, getMailingHistory } from "../../../api/mailing";
import { getPatentDetail, getPatents, sendBusinessReviewMails } from "../../../api/patents";
import { useToast } from "../../../components/common/toastContext";
import type { DepartmentRecipientMapping, MailingHistoryItem } from "../../../types/mailing";
import type { PatentDetail } from "../../../types/patent";
import {
  createGroupedBusinessReviewMailDrafts,
  toBusinessReviewMailSendDraft,
  type BusinessReviewMailDraft,
} from "../../../utils/businessReviewMail";

interface UseMailWorkflowArgs {
  patent: PatentDetail | null;
  setPatent: Dispatch<SetStateAction<PatentDetail | null>>;
  refreshPatentHistory: (patentId: string) => Promise<void>;
  // 메일 발송 결과/오류 메시지는 최종 판단 섹션과 같은 영역에 표시된다(기존 동작 유지).
  setActionMessage: (message: string) => void;
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-04, UI-LEGAL-06
 * @description 특허 상세의 메일 발송 흐름(드래프트 작성/미리보기/발송/이력) 상태를 관리한다.
 *     usePatentDetail 메가훅에서 순수 분리한 클러스터로, 동작 변경은 없다.
 */
export function useMailWorkflow({ patent, setPatent, refreshPatentHistory, setActionMessage }: UseMailWorkflowArgs) {
  const { showToast } = useToast();
  const [mailDrafts, setMailDrafts] = useState<BusinessReviewMailDraft[]>([]);
  const [recipientMappings, setRecipientMappings] = useState<DepartmentRecipientMapping[]>([]);
  const [activeMailIndex, setActiveMailIndex] = useState(0);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailingHistoryItems, setMailingHistoryItems] = useState<MailingHistoryItem[]>([]);
  const [isMailHistoryOpen, setIsMailHistoryOpen] = useState(false);
  const [mailHistoryMessage, setMailHistoryMessage] = useState("");

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
      setActionMessage("메일 발송 대기 상태의 특허만 발송할 수 있습니다.");
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
    setActionMessage("");
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
    setActionMessage("");

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
      const resultMessage =
        result.updatedCount > 0 ? "사업부 검토 요청 메일을 발송했습니다." : "메일 발송 처리할 선택 건이 없습니다.";
      setActionMessage(resultMessage);
      showToast(resultMessage, result.updatedCount > 0 ? "success" : "info");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "메일 발송 처리에 실패했습니다.";
      setActionMessage(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSendingMail(false);
    }
  }

  return {
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
    handleOpenMailHistory,
    handleOpenMailPreview,
    handleCloseMailPreview,
    handleUpdateMailDraft,
    handleConfirmSendMails,
  };
}
