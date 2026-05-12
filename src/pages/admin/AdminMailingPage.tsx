import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { getDepartmentRecipientMappings, getMailingHistory, updateDepartmentRecipientMapping } from "../../api/mailing";
import { getPatents, sendBusinessReviewMails } from "../../api/patents";
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

type RecipientMappingForm = Omit<DepartmentRecipientMapping, "ccEmails"> & {
  ccEmailsText: string;
};

/**
 * @relatedFR FR-014, FR-015, FR-016
 * @relatedUI UI-LEGAL-06
 * @description 관리자 메일 미리보기, 담당자별 묶음 발송, 부서별 수신자 매핑, 발송 이력을 관리하는 화면
 */
export function AdminMailingPage() {
  const [recipientMappings, setRecipientMappings] = useState<DepartmentRecipientMapping[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [form, setForm] = useState<RecipientMappingForm | null>(null);
  const [patents, setPatents] = useState<PatentListItem[]>([]);
  const [mailingHistoryItems, setMailingHistoryItems] = useState<MailingHistoryItem[]>([]);
  const [mailDrafts, setMailDrafts] = useState<BusinessReviewMailDraft[]>([]);
  const [activeMailIndex, setActiveMailIndex] = useState(0);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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

        if (!isMounted) {
          return;
        }

        setRecipientMappings(nextMappings);
        setPatents(nextPatents);
        setMailingHistoryItems(nextHistoryItems);
        setSelectedDepartmentId(nextMappings[0]?.departmentId ?? "");
        setForm(nextMappings[0] ? createFormFromMapping(nextMappings[0]) : null);
        setMessage("");
      } catch {
        if (isMounted) {
          setMessage("메일링 설정을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
        }
      }
    }

    loadMailingData();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSelectMapping(mapping: DepartmentRecipientMapping) {
    setSelectedDepartmentId(mapping.departmentId);
    setForm(createFormFromMapping(mapping));
    setMessage("");
  }

  function handleAddMapping() {
    const nextForm = createEmptyMappingForm();

    setSelectedDepartmentId(nextForm.departmentId);
    setForm(nextForm);
    setMessage("");
  }

  function handleFormChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setForm((currentForm) => (currentForm ? { ...currentForm, [name]: value } : currentForm));
  }

  async function handleSaveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    if (!form.departmentName.trim() || !form.managerName.trim() || !form.managerEmail.trim()) {
      setMessage("부서명, 담당자 이름, 이메일을 확인해 주세요.");
      return;
    }

    const mappingToSave = {
      ...form,
      ccEmails: form.ccEmailsText.split(",").map((email) => email.trim()).filter(Boolean),
      departmentId: form.departmentId || createDepartmentId(form.departmentName),
    };
    const savedMapping = await updateDepartmentRecipientMapping(mappingToSave);

    setRecipientMappings((currentMappings) => {
      const hasMapping = currentMappings.some((mapping) => mapping.departmentId === savedMapping.departmentId);

      return hasMapping
        ? currentMappings.map((mapping) =>
            mapping.departmentId === savedMapping.departmentId ? savedMapping : mapping,
          )
        : [...currentMappings, savedMapping];
    });
    setSelectedDepartmentId(savedMapping.departmentId);
    setForm(createFormFromMapping(savedMapping));
    setMessage(`${savedMapping.departmentName} 담당자 매핑을 저장했습니다.`);
  }

  function handleOpenGroupedPreview() {
    setMailDrafts(groupedPreview);
    setActiveMailIndex(0);
    setIsSendConfirmOpen(false);
    setMessage(groupedPreview.length === 0 ? "메일 발송 대기 상태의 특허가 없습니다." : "");
  }

  function handleCloseMailPreview() {
    if (isProcessing) {
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
      setMessage(error instanceof Error ? error.message : "메일 발송 처리에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <AppLayout
      role="ADMIN"
      title="AI 레포트 메일 발송"
      description="부서별 담당자를 관리하고 같은 담당자의 여러 특허를 한 메일로 묶어 발송합니다."
    >
      <Section title="메일 발송 준비" description="메일 발송 대기 특허를 담당자 이메일 기준으로 묶어 미리봅니다.">
        <div className="mailing-summary-grid">
          <SummaryItem label="발송 대기 특허" value={`${readyPatents.length}건`} />
          <SummaryItem label="생성될 메일" value={`${groupedPreview.length}통`} />
          <SummaryItem label="담당자 매핑" value={`${recipientMappings.length}개 부서`} />
        </div>
        <div className="form-actions">
          <Button disabled={readyPatents.length === 0 || isProcessing} onClick={handleOpenGroupedPreview} type="button">
            담당자별 묶음 메일 미리보기
          </Button>
        </div>
      </Section>

      <Section
        title="부서 및 담당자 설정"
        description="메일링 nav에서 부서명과 담당자 이름, 이메일을 바로 변경합니다."
        actions={
          <Button onClick={handleAddMapping} type="button" variant="secondary">
            담당자 추가
          </Button>
        }
      >
        <div className="recipient-settings-grid">
          <div className="table-wrap">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>부서</th>
                  <th>담당자</th>
                  <th>이메일</th>
                  <th>수정일</th>
                </tr>
              </thead>
              <tbody>
                {recipientMappings.map((mapping) => (
                  <tr
                    className={
                      mapping.departmentId === selectedDepartmentId ? "clickable-row selected-row" : "clickable-row"
                    }
                    key={mapping.departmentId}
                    onClick={() => handleSelectMapping(mapping)}
                  >
                    <td>{mapping.departmentName}</td>
                    <td>{mapping.managerName}</td>
                    <td>{mapping.managerEmail}</td>
                    <td>{mapping.updatedAt}</td>
                  </tr>
                ))}
                {recipientMappings.length === 0 ? (
                  <tr>
                    <td className="empty-table-cell" colSpan={4}>
                      등록된 부서 담당자가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {form ? (
            <form className="recipient-form" onSubmit={handleSaveMapping}>
              <strong>{form.departmentId ? "담당자 정보 수정" : "새 부서 담당자 추가"}</strong>
              <label>
                부서명
                <input name="departmentName" onChange={handleFormChange} value={form.departmentName} />
              </label>
              <label>
                담당자 이름
                <input name="managerName" onChange={handleFormChange} value={form.managerName} />
              </label>
              <label>
                담당자 이메일
                <input name="managerEmail" onChange={handleFormChange} type="email" value={form.managerEmail} />
              </label>
              <label>
                참조 이메일
                <input name="ccEmailsText" onChange={handleFormChange} value={form.ccEmailsText} />
              </label>
              <Button type="submit">매핑 저장</Button>
            </form>
          ) : (
            <p className="empty-state">수정할 부서 매핑이 없습니다.</p>
          )}
        </div>
        {message ? <p className="notice patent-form-notice">{message}</p> : null}
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

/**
 * @relatedFR FR-016
 * @relatedUI UI-LEGAL-06
 * @description 관리자 메일링 화면에서 사업부 검토 요청 메일 발송 이력을 mock 테이블로 표시한다.
 */
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
                <span className="table-subtext">{history.patents.map((patent) => patent.managementNumber).join(", ")}</span>
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
  SENT: "발송 완료",
};

function getMailingHistoryStatusTone(status: MailingDeliveryStatus) {
  if (status === "SENT") {
    return "success";
  }

  if (status === "FAILED") {
    return "danger";
  }

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

/**
 * @relatedFR FR-014
 * @relatedUI UI-LEGAL-06
 * @description 부서별 담당자 매핑 데이터를 설정 폼 상태로 변환한다.
 */
function createFormFromMapping(mapping: DepartmentRecipientMapping): RecipientMappingForm {
  return {
    ...mapping,
    ccEmailsText: mapping.ccEmails.join(", "),
  };
}

/**
 * @relatedFR FR-014
 * @relatedUI UI-LEGAL-06
 * @description 부서별 담당자 신규 추가 폼의 초기 상태를 만든다.
 */
function createEmptyMappingForm(): RecipientMappingForm {
  return {
    ccEmailsText: "legal-review@syuuk.test",
    departmentId: "",
    departmentName: "",
    managerEmail: "",
    managerName: "",
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

/**
 * @relatedFR FR-014
 * @relatedUI UI-LEGAL-06
 * @description 신규 부서명으로 mock/API 전달용 부서 ID를 생성한다.
 */
function createDepartmentId(departmentName: string) {
  const normalizedName = departmentName
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z가-힣]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return `DEPT-${normalizedName || "NEW"}`;
}
