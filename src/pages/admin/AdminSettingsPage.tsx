import { useEffect, useState } from "react";
import {
  activateReviewQuarter,
  disconnectMailOAuth2,
  getClassifications,
  getMailLeadMonths,
  getMailOAuth2Status,
  getResponseDeadline,
  getReviewPeriodTemplates,
  getReviewQuarters,
  redirectToGoogleOAuth2,
  updateMailLeadMonths,
  updateResponseDeadline,
  type ClassificationGroup,
  type ClassificationType,
  type MailOAuth2Status,
  type QuarterSetting,
  type ReviewPeriodTemplate,
  type ResponseDeadline,
} from "../../api/settings";
import { getApiErrorMessage } from "../../api/client";
import { AppLayout } from "../../components/layout/AppLayout";
import { AnnualFeeSettingsSection } from "./settings/AnnualFeeSettingsSection";
import { MailSettingsSection } from "./settings/MailSettingsSection";
import { QuarterSettingsSection } from "./settings/QuarterSettingsSection";
import { ClassificationSettingsSection } from "./settings/ClassificationSettingsSection";
import { ValuationCriteriaSection } from "./settings/ValuationCriteriaSection";
import { ChecklistSettingsSection } from "./settings/ChecklistSettingsSection";

type SettingsSectionId = "mail" | "quarter" | "annualFee" | "valuation" | "checklist" | "classification";

const SETTINGS_SECTIONS: { id: SettingsSectionId; label: string }[] = [
  { id: "mail", label: "메일/회신" },
  { id: "quarter", label: "분기/검토 일정" },
  { id: "annualFee", label: "연차료 납부" },
  { id: "valuation", label: "AI 평가 기준" },
  { id: "checklist", label: "사업부 체크리스트" },
  { id: "classification", label: "분류 기준" },
];

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-16, FR-LEGAL-21
 * @relatedUI UI-LEGAL-07
 * @description 연차료 검토 분기 기간을 설정하고 분기를 시작하는 관리자 운영 설정 화면
 */
export function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailLeadMonths, setMailLeadMonths] = useState(2);
  const [mailLeadMonthsInput, setMailLeadMonthsInput] = useState(2);
  const [isSavingMailLead, setIsSavingMailLead] = useState(false);
  const [mailLeadMessage, setMailLeadMessage] = useState("");
  const [responseDeadline, setResponseDeadline] = useState<ResponseDeadline>({ months: 1, days: 0 });
  const [responseDeadlineInput, setResponseDeadlineInput] = useState<ResponseDeadline>({ months: 1, days: 0 });
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [deadlineMessage, setDeadlineMessage] = useState("");
  const [allQuarters, setAllQuarters] = useState<QuarterSetting[]>([]);
  const [reviewPeriodTemplates, setReviewPeriodTemplates] = useState<ReviewPeriodTemplate[]>([]);
  const [classifications, setClassifications] = useState<ClassificationGroup[]>([]);
  const [classificationMessage, setClassificationMessage] = useState("");
  const [oauth2Status, setOAuth2Status] = useState<MailOAuth2Status>({ connected: false, connectedEmail: null });
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>("mail");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth2_success")) {
      setMailMessage("Google 계정 연동이 완료되었습니다.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("oauth2_error")) {
      setMailMessage(`Google 연동에 실패했습니다: ${params.get("oauth2_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const currentYear = new Date().getFullYear();
    Promise.all([
      getReviewQuarters(currentYear),
      getReviewQuarters(currentYear + 1),
      getReviewPeriodTemplates(),
      getClassifications(),
      getMailLeadMonths(),
      getResponseDeadline(),
      getMailOAuth2Status().catch(() => ({ connected: false, connectedEmail: null } as MailOAuth2Status)),
    ])
      .then(([
        thisYearQ,
        nextYearQ,
        nextReviewPeriodTemplates,
        nextClassifications,
        nextMailLead,
        nextDeadline,
        nextOAuth2,
      ]) => {
        setAllQuarters([...thisYearQ, ...nextYearQ]);
        setReviewPeriodTemplates(nextReviewPeriodTemplates);
        setClassifications(nextClassifications);
        setOAuth2Status(nextOAuth2);
        setMailLeadMonths(nextMailLead);
        setMailLeadMonthsInput(nextMailLead);
        setResponseDeadline(nextDeadline);
        setResponseDeadlineInput(nextDeadline);
      })
      .catch((error) => setMessage(getApiErrorMessage(error, "설정을 불러오지 못했습니다.")))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSaveMailLeadMonths(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingMailLead(true);
    setMailLeadMessage("");
    try {
      const updated = await updateMailLeadMonths(mailLeadMonthsInput);
      setMailLeadMonths(updated);
      setMailLeadMonthsInput(updated);
      setMailLeadMessage("메일 발송 기준이 저장되었습니다.");
    } catch (error) {
      setMailLeadMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSavingMailLead(false);
    }
  }

  async function handleSaveResponseDeadline(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingDeadline(true);
    setDeadlineMessage("");
    try {
      const updated = await updateResponseDeadline(responseDeadlineInput.months, responseDeadlineInput.days);
      setResponseDeadline(updated);
      setResponseDeadlineInput(updated);
      setDeadlineMessage("회신 기한이 저장되었습니다.");
    } catch (error) {
      setDeadlineMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSavingDeadline(false);
    }
  }

  async function handleClassificationUpdate(
    type: ClassificationType,
    updater: () => Promise<ClassificationGroup>,
  ) {
    try {
      const updated = await updater();
      setClassifications((prev) => prev.map((group) => (group.type === type ? updated : group)));
      setClassificationMessage("분류 설정이 저장되었습니다.");
    } catch (error) {
      setClassificationMessage(error instanceof Error ? error.message : "분류 설정 저장에 실패했습니다.");
      // 실패를 호출자(ClassificationEditor)에 전파해 성공 분기(입력 초기화·편집 종료)가 실행되지 않도록 한다.
      throw error;
    }
  }

  async function handleActivate(quarterKey: string) {
    if (!confirm(`${quarterKey} 분기를 시작하시겠습니까?\n해당 분기 납부 대상 특허는 검토 시작 상태로 변경됩니다.`)) {
      return;
    }
    try {
      const result = await activateReviewQuarter(quarterKey);
      setMessage(`${quarterKey} 분기 시작 완료: 검토 시작 ${result.reviewStartedCount}건`);
      const currentYear = new Date().getFullYear();
      const [thisYearQ, nextYearQ] = await Promise.all([
        getReviewQuarters(currentYear),
        getReviewQuarters(currentYear + 1),
      ]);
      setAllQuarters([...thisYearQ, ...nextYearQ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분기 시작에 실패했습니다.");
    }
  }

  function handleConnectOAuth2() {
    redirectToGoogleOAuth2().catch(() => setMailMessage("Google 연동 URL을 불러오지 못했습니다."));
  }

  async function handleDisconnectOAuth2() {
    setIsDisconnecting(true);
    try {
      await disconnectMailOAuth2();
      setOAuth2Status({ connected: false, connectedEmail: null });
      setMailMessage("Google 계정 연동이 해제되었습니다.");
    } catch {
      setMailMessage("연동 해제에 실패했습니다.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <AppLayout role="ADMIN" title="설정" description="메일 발송 설정과 연차료 검토 분기를 관리합니다.">
      <div className="settings-subnav" aria-label="설정 하위 메뉴" role="tablist">
        {SETTINGS_SECTIONS.map((section) => (
          <button
            aria-selected={activeSettingsSection === section.id}
            className={activeSettingsSection === section.id ? "selected" : ""}
            key={section.id}
            onClick={() => setActiveSettingsSection(section.id)}
            role="tab"
            type="button"
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSettingsSection === "mail" ? (
        <MailSettingsSection
          oauth2Status={oauth2Status}
          isDisconnecting={isDisconnecting}
          onConnect={handleConnectOAuth2}
          onDisconnect={handleDisconnectOAuth2}
          mailMessage={mailMessage}
          mailLeadMonths={mailLeadMonths}
          mailLeadMonthsInput={mailLeadMonthsInput}
          setMailLeadMonthsInput={setMailLeadMonthsInput}
          isSavingMailLead={isSavingMailLead}
          mailLeadMessage={mailLeadMessage}
          onSaveMailLeadMonths={handleSaveMailLeadMonths}
          responseDeadline={responseDeadline}
          responseDeadlineInput={responseDeadlineInput}
          setResponseDeadlineInput={setResponseDeadlineInput}
          isSavingDeadline={isSavingDeadline}
          deadlineMessage={deadlineMessage}
          onSaveResponseDeadline={handleSaveResponseDeadline}
        />
      ) : null}

      {activeSettingsSection === "quarter" ? (
        <QuarterSettingsSection
          isLoading={isLoading}
          message={message}
          allQuarters={allQuarters}
          reviewPeriodTemplates={reviewPeriodTemplates}
          onActivate={handleActivate}
        />
      ) : null}

      {activeSettingsSection === "annualFee" ? <AnnualFeeSettingsSection /> : null}

      {activeSettingsSection === "valuation" ? <ValuationCriteriaSection /> : null}
      {activeSettingsSection === "checklist" ? <ChecklistSettingsSection /> : null}
      {activeSettingsSection === "classification" ? (
        <ClassificationSettingsSection
          classifications={classifications}
          classificationMessage={classificationMessage}
          onClassificationUpdate={handleClassificationUpdate}
        />
      ) : null}
    </AppLayout>
  );
}
