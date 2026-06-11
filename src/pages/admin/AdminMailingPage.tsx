import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDepartmentRecipientMappings, getMailingHistory, getPatentPdfLinks } from "../../api/mailing";
import { getPatents, sendBusinessReviewMails } from "../../api/patents";
import { getApiErrorMessage } from "../../api/client";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Section } from "../../components/common/Section";
import { AppLayout } from "../../components/layout/AppLayout";
import { BusinessReviewMailPreviewModal } from "../../components/mailing/BusinessReviewMailPreviewModal";
import {
  createGroupedBusinessReviewMailDrafts,
  toBusinessReviewMailSendDraft,
  type BusinessReviewMailDraft,
} from "../../utils/businessReviewMail";
import type { DepartmentRecipientMapping, MailingDeliveryStatus, MailingHistoryItem } from "../../types/mailing";
import type { PatentListItem } from "../../types/patent";

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-13, FR-LEGAL-14
 * @relatedUI UI-LEGAL-05
 * @description 관리자 메일 미리보기, 담당자별 묶음 발송, 발송 이력을 관리하는 화면.
 *              메일 수신자는 계정 관리에서 등록한 사업부 계정을 자동으로 사용합니다.
 */
export function AdminMailingPage() {
  const [recipientMappings, setRecipientMappings] = useState<DepartmentRecipientMapping[]>([]);
  const [patents, setPatents] = useState<PatentListItem[]>([]);
  const [mailingHistoryItems, setMailingHistoryItems] = useState<MailingHistoryItem[]>([]);
  const [mailDrafts, setMailDrafts] = useState<BusinessReviewMailDraft[]>([]);
  const [activeMailIndex, setActiveMailIndex] = useState(0);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("메일링 설정을 불러오는 중입니다.");

  const readyPatents = useMemo(
    () => patents.filter((patent) => patent.reviewWorkflowStatus === "MAIL_READY"),
    [patents],
  );
  const groupedPreview = createGroupedBusinessReviewMailDrafts(readyPatents, recipientMappings);

  useEffect(() => {
    let isMounted = true;
    async function loadMailingData() {
      try {
        const [nextMappings, nextPatents, nextHistoryItems] = await Promise.all([
          getDepartmentRecipientMappings(),
          getPatents(),
          getMailingHistory(),
        ]);
        if (!isMounted) return;
        setRecipientMappings(nextMappings);
        setPatents(nextPatents);
        setMailingHistoryItems(nextHistoryItems);
        setMessage("");
      } catch (error) {
        if (isMounted) {
          setMessage(getApiErrorMessage(error, "메일링 설정을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요."));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadMailingData();
    return () => { isMounted = false; };
  }, []);

  const hasNoRecipients = !isLoading && recipientMappings.length === 0;

  async function handleOpenGroupedPreview() {
    if (hasNoRecipients) {
      setMessage("등록된 사업부 계정이 없습니다. 계정 관리에서 사업부 계정을 먼저 추가하세요.");
      return;
    }
    // MAIL-12: 미리보기 열 때 PDF 다운로드 링크를 해석해 본문에 포함한다(실패 시 원문 URL만).
    const pdfLinks = await getPatentPdfLinks(readyPatents.map((patent) => patent.patentId));
    const drafts = createGroupedBusinessReviewMailDrafts(readyPatents, recipientMappings, pdfLinks);
    setMailDrafts(drafts);
    setActiveMailIndex(0);
    setIsSendConfirmOpen(false);
    setMessage(drafts.length === 0 ? "메일 발송 대기 상태의 특허가 없습니다." : "");
  }

  function handleCloseMailPreview() {
    if (isProcessing) return;
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
    setIsProcessing(true);
    setMessage("");
    try {
      const result = await sendBusinessReviewMails(mailDrafts.map(toBusinessReviewMailSendDraft));
      setPatents(await getPatents());
      setMailingHistoryItems(await getMailingHistory());
      setMailDrafts([]);
      setActiveMailIndex(0);
      setIsSendConfirmOpen(false);
      setMessage(
        result.updatedCount > 0
          ? `${mailDrafts.length}통의 메일로 ${result.updatedCount}건의 사업부 검토 요청을 발송 처리했습니다.`
          : "메일 발송 처리할 선택 건이 없습니다.",
      );
    } catch (error) {
      setMessage(getApiErrorMessage(error, "메일 발송 처리에 실패했습니다."));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <AppLayout
      role="ADMIN"
      title="AI 레포트 메일 발송"
      description="사업부 계정의 이메일로 담당자별 묶음 발송합니다."
    >
      <Section title="메일 발송 준비" description="메일 발송 대기 특허를 담당자 이메일 기준으로 묶어 미리봅니다.">
        <div className="mailing-summary-grid">
          <SummaryItem label="발송 대기 특허" value={`${readyPatents.length}건`} />
          <SummaryItem label="생성될 메일" value={`${groupedPreview.length}통`} />
          <SummaryItem label="등록 사업부" value={`${recipientMappings.length}개`} />
        </div>
        {hasNoRecipients ? (
          <p className="notice notice-warning">
            등록된 사업부 계정이 없습니다.{" "}
            <Link to="/admin/users" className="text-link">
              계정 관리
            </Link>
            에서 사업부 계정을 추가하면 해당 이메일로 메일이 발송됩니다.
          </p>
        ) : message ? (
          <p className="notice">{message}</p>
        ) : null}
        <div className="form-actions">
          <Button disabled={readyPatents.length === 0 || isProcessing || hasNoRecipients} onClick={handleOpenGroupedPreview} type="button">
            담당자별 묶음 메일 미리보기
          </Button>
        </div>
      </Section>

      <Section
        title="사업부별 수신자"
        description="계정 관리에서 등록한 사업부 계정 이메일이 자동으로 사용됩니다. 수신자 변경은 계정 관리에서 하세요."
      >
        <div className="table-wrap">
          <table className="compact-table">
            <thead>
              <tr>
                <th>사업부명</th>
                <th>담당자</th>
                <th>수신 이메일 (계정)</th>
                <th>참조 (추가 계정)</th>
              </tr>
            </thead>
            <tbody>
              {recipientMappings.map((mapping) => (
                <tr key={mapping.departmentId}>
                  <td>{mapping.departmentName}</td>
                  <td>{mapping.managerName}</td>
                  <td>{mapping.managerEmail}</td>
                  <td>{mapping.ccEmails.length > 0 ? mapping.ccEmails.join(", ") : "-"}</td>
                </tr>
              ))}
              {recipientMappings.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={4}>
                    등록된 사업부 계정이 없습니다. 계정 관리에서 사업부 계정을 추가하세요.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="발송 이력" description="사업부 검토 요청 메일의 발송 대상, 포함 특허, 처리 상태를 확인합니다.">
        <MailingHistoryTable historyItems={mailingHistoryItems} />
      </Section>

      {mailDrafts.length > 0 ? (
        <BusinessReviewMailPreviewModal
          activeIndex={activeMailIndex}
          drafts={mailDrafts}
          isConfirmOpen={isSendConfirmOpen}
          isProcessing={isProcessing}
          onClose={handleCloseMailPreview}
          onConfirmSend={handleConfirmSendMails}
          onConfirmToggle={setIsSendConfirmOpen}
          onDraftChange={handleUpdateMailDraft}
          onIndexChange={setActiveMailIndex}
        />
      ) : null}
    </AppLayout>
  );
}

function MailingHistoryTable({ historyItems }: { historyItems: MailingHistoryItem[] }) {
  return (
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
          {historyItems.length === 0 ? (
            <tr>
              <td className="empty-table-cell" colSpan={5}>
                발송 이력이 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const mailingHistoryStatusLabels: Record<MailingDeliveryStatus, string> = {
  FAILED: "실패",
  PENDING: "대기",
  RECORDED: "발송 기록",
  SENT: "발송 완료",
};

function getMailingHistoryStatusTone(status: MailingDeliveryStatus) {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RECORDED") return "neutral";
  return "warning";
}

function formatDateTime(dateText: string) {
  return dateText.replace("T", " ").slice(0, 16);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="mailing-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
