import { useEffect, useState } from "react";
import {
  adjustAnnualFeeSchedule,
  activateReviewQuarter,
  disconnectMailOAuth2,
  getAnnualFeeSchedule,
  getClassifications,
  getCountryExtensions,
  getMailLeadMonths,
  getMailOAuth2Status,
  getResponseDeadline,
  getReviewPeriodTemplates,
  getReviewQuarters,
  redirectToGoogleOAuth2,
  updateCountryExtension,
  updateMailLeadMonths,
  updateResponseDeadline,
  type AnnualFeeScheduleItem,
  type ClassificationGroup,
  type ClassificationType,
  type CountryExtension,
  type MailOAuth2Status,
  type QuarterSetting,
  type ReviewPeriodTemplate,
  type ResponseDeadline,
} from "../../api/settings";
import { getApiErrorMessage } from "../../api/client";
import { Button } from "../../components/common/Button";
import { AppLayout } from "../../components/layout/AppLayout";
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
  const [countryExtensions, setCountryExtensions] = useState<CountryExtension[]>([]);
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
  const [annualFeeSchedule, setAnnualFeeSchedule] = useState<AnnualFeeScheduleItem[]>([]);
  const [annualFeeCountry, setAnnualFeeCountry] = useState("ALL");
  const [annualFeeMessage, setAnnualFeeMessage] = useState("");
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
      getCountryExtensions(),
      getClassifications(),
      getMailLeadMonths(),
      getResponseDeadline(),
      getMailOAuth2Status().catch(() => ({ connected: false, connectedEmail: null } as MailOAuth2Status)),
    ])
      .then(([
        thisYearQ,
        nextYearQ,
        nextReviewPeriodTemplates,
        nextExtensions,
        nextClassifications,
        nextMailLead,
        nextDeadline,
        nextOAuth2,
      ]) => {
        setAllQuarters([...thisYearQ, ...nextYearQ]);
        setReviewPeriodTemplates(nextReviewPeriodTemplates);
        setCountryExtensions(nextExtensions);
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

  useEffect(() => {
    getAnnualFeeSchedule(annualFeeCountry)
      .then((nextSchedule) => {
        setAnnualFeeSchedule(nextSchedule);
        setAnnualFeeMessage("");
      })
      .catch((error) => {
        setAnnualFeeSchedule([]);
        setAnnualFeeMessage(getApiErrorMessage(error, "연차료 예정표를 불러오지 못했습니다."));
      });
  }, [annualFeeCountry]);

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

      {activeSettingsSection === "annualFee" ? (
        <>
          <section className="section">
            <div className="section-header">
              <div>
                <h2>유지 결정 시 납부일 연장 기간</h2>
                <p>관리자가 특허를 유지 처리하면 국가별 납부 규칙에 따라 다음 납부 예정일을 계산합니다.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>국가</th>
                    <th>연장 기간 (개월)</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {countryExtensions.map((ext) => (
                    <CountryExtensionRow
                      key={ext.country}
                      ext={ext}
                      onSave={async (country, months) => {
                        const updated = await updateCountryExtension(country, months);
                        setCountryExtensions((prev) => prev.map((e) => (e.country === country ? updated : e)));
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-helper-text" style={{ marginTop: "0.5rem" }}>
              미국 특허는 등록일 기준 3.5년, 7.5년, 11.5년 유지료 일정을 우선 적용합니다.
            </p>
          </section>

          <section className="section">
            <div className="section-header">
              <div>
                <h2>국가별 연차료 납부 예정일</h2>
                <p>실제 특허 데이터와 국가별 계산 규칙으로 산정된 미래 납부 예정일을 확인하고 조정합니다.</p>
              </div>
              <label className="form-field" style={{ maxWidth: 220 }}>
                <span className="form-label-text">국가</span>
                <select onChange={(event) => setAnnualFeeCountry(event.target.value)} value={annualFeeCountry}>
                  <option value="ALL">전체</option>
                  {countryExtensions.map((ext) => (
                    <option key={ext.country} value={ext.country}>{ext.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {annualFeeMessage ? <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>{annualFeeMessage}</p> : null}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>특허</th>
                    <th>국가 구분</th>
                    <th>기준일</th>
                    <th>현재 예정일</th>
                    <th>적용 규칙</th>
                    <th>최근 조정</th>
                    <th>조정</th>
                  </tr>
                </thead>
                <tbody>
                  {annualFeeSchedule.slice(0, 20).map((item) => (
                    <AnnualFeeScheduleRow
                      item={item}
                      key={item.patentId}
                      onSave={async (adjustedDueDate, reason) => {
                        try {
                          const updated = await adjustAnnualFeeSchedule(item.patentId, adjustedDueDate, reason);
                          setAnnualFeeSchedule((prev) => prev.map((row) => (row.patentId === item.patentId ? updated : row)));
                          setAnnualFeeMessage(`${item.managementNumber} 납부 예정일이 조정되었습니다.`);
                        } catch (error) {
                          setAnnualFeeMessage(error instanceof Error ? error.message : "납부 예정일 조정에 실패했습니다.");
                        }
                      }}
                    />
                  ))}
                  {annualFeeSchedule.length === 0 ? (
                    <tr>
                      <td className="empty-table-cell" colSpan={7}>연차료 납부 예정일 데이터가 없습니다.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

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

function CountryExtensionRow({
  ext,
  onSave,
}: {
  ext: CountryExtension;
  onSave: (country: string, months: number) => Promise<void>;
}) {
  const [months, setMonths] = useState(ext.extensionMonths);
  const [isSaving, setIsSaving] = useState(false);
  // SETTINGS-10: 저장 결과를 행 단위로 표시 — 여러 국가를 연속 저장해도 메시지가 섞이지 않는다.
  const [saveMessage, setSaveMessage] = useState("");
  const isDirty = months !== ext.extensionMonths;

  async function save() {
    setIsSaving(true);
    setSaveMessage("");
    try {
      await onSave(ext.country, months);
      setSaveMessage(`${months}개월로 저장됨`);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <tr>
      <td><strong>{ext.label}</strong></td>
      <td>
        <input
          max={120}
          min={1}
          onChange={(e) => setMonths(Number(e.target.value))}
          style={{ width: "80px" }}
          type="number"
          value={months}
        />
      </td>
      <td>
        <Button disabled={isSaving || !isDirty} onClick={save} type="button" variant="secondary">
          {isSaving ? "저장 중…" : "저장"}
        </Button>
        {saveMessage ? <span className="table-subtext">{saveMessage}</span> : null}
      </td>
    </tr>
  );
}

function AnnualFeeScheduleRow({
  item,
  onSave,
}: {
  item: AnnualFeeScheduleItem;
  onSave: (adjustedDueDate: string, reason: string) => Promise<void>;
}) {
  const [adjustedDueDate, setAdjustedDueDate] = useState(item.nextAnnualFeeDueDate ?? "");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = adjustedDueDate && adjustedDueDate !== item.nextAnnualFeeDueDate;

  async function save() {
    setIsSaving(true);
    await onSave(adjustedDueDate, reason).finally(() => setIsSaving(false));
    setReason("");
  }

  return (
    <tr>
      <td>
        <strong>{item.title}</strong>
        <span className="table-subtext">{item.managementNumber}</span>
      </td>
      <td>
        <span className={item.domesticPatent ? "badge badge-success" : "badge badge-neutral"}>
          {item.domesticPatent ? "국내특허" : "해외특허"}
        </span>
        <span className="table-subtext">{item.country}</span>
      </td>
      <td>{item.annualFeeBaseDate ?? "-"}</td>
      <td>
        {/* FEE-06: 실효 납부일(effective)을 표시하고, 저장값(stored)이 과거라 굴려진 경우 원본을 함께 노출. */}
        <strong>{item.effectiveAnnualFeeDueDate ?? item.nextAnnualFeeDueDate ?? "-"}</strong>
        {item.adjustedAnnualFeeDueDate ? <span className="table-subtext">조정됨</span> : null}
        {item.storedAnnualFeeDueDate
          && item.effectiveAnnualFeeDueDate
          && item.storedAnnualFeeDueDate !== item.effectiveAnnualFeeDueDate ? (
          <span className="table-subtext">저장값 {item.storedAnnualFeeDueDate} → 재계산</span>
        ) : null}
      </td>
      <td>
        <span>{item.paymentRuleLabel ?? "-"}</span>
        <span className="table-subtext">{item.annualFeeBasis === "REGISTRATION_DATE" ? "등록일 기준" : "출원일 기준"}</span>
      </td>
      <td>
        {item.latestAdjustmentReason ? (
          <>
            <span>{item.latestAdjustmentReason}</span>
            <span className="table-subtext">{item.adjustmentHistory[0]?.adjustedAt?.slice(0, 10)}</span>
          </>
        ) : "-"}
      </td>
      <td>
        <div className="annual-fee-adjust-form">
          <input
            onChange={(event) => setAdjustedDueDate(event.target.value)}
            type="date"
            value={adjustedDueDate}
          />
          <input
            onChange={(event) => setReason(event.target.value)}
            placeholder="조정 사유"
            value={reason}
          />
          <Button disabled={isSaving || !isDirty || !reason.trim()} onClick={save} type="button" variant="secondary">
            {isSaving ? "저장 중…" : "조정"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
