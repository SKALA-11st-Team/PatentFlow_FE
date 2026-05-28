import { useEffect, useState } from "react";
import {
  addClassification,
  adjustAnnualFeeSchedule,
  activateReviewQuarter,
  deleteClassification,
  disconnectMailOAuth2,
  getAnnualFeeSchedule,
  getClassifications,
  getCountryExtensions,
  getMailLeadMonths,
  getMailOAuth2Status,
  getMailSettings,
  getResponseDeadline,
  getReviewQuarters,
  redirectToGoogleOAuth2,
  renameClassification,
  updateCountryExtension,
  updateMailLeadMonths,
  updateMailSettings,
  updateResponseDeadline,
  type AnnualFeeScheduleItem,
  type ClassificationGroup,
  type ClassificationType,
  type CountryExtension,
  type MailOAuth2Status,
  type MailSettings,
  type QuarterSetting,
  type ResponseDeadline,
} from "../../api/settings";
import { Button } from "../../components/common/Button";
import { AppLayout } from "../../components/layout/AppLayout";

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-16, FR-LEGAL-21
 * @relatedUI UI-LEGAL-07
 * @description 연차료 검토 분기 기간을 설정하고 분기를 시작하는 관리자 운영 설정 화면
 */
export function AdminSettingsPage() {
  const [quarters, setQuarters] = useState<QuarterSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [mailSettings, setMailSettings] = useState<MailSettings | null>(null);
  const [mailForm, setMailForm] = useState({ gmailUsername: "", gmailAppPassword: "" });
  const [showLegacyMailForm, setShowLegacyMailForm] = useState(false);
  const [isSavingMail, setIsSavingMail] = useState(false);
  const [mailMessage, setMailMessage] = useState("");
  const [countryExtensions, setCountryExtensions] = useState<CountryExtension[]>([]);
  const [extMessage, setExtMessage] = useState("");
  // *Months = 서버에 저장된 확정값, *MonthsInput = 사용자가 수정 중인 임시값
  // 저장 버튼은 두 값이 다를 때만 활성화해 불필요한 API 호출을 막는다.
  const [mailLeadMonths, setMailLeadMonths] = useState(2);
  const [mailLeadMonthsInput, setMailLeadMonthsInput] = useState(2);
  const [isSavingMailLead, setIsSavingMailLead] = useState(false);
  const [mailLeadMessage, setMailLeadMessage] = useState("");
  const [responseDeadline, setResponseDeadline] = useState<ResponseDeadline>({ months: 1, days: 0 });
  const [responseDeadlineInput, setResponseDeadlineInput] = useState<ResponseDeadline>({ months: 1, days: 0 });
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [deadlineMessage, setDeadlineMessage] = useState("");
  // 당해 연도 + 내년 분기를 합쳐 이력/예정 테이블에 표시한다.
  // quarters(당해)는 다른 섹션에서 현재 활성 분기 판단 등에도 사용.
  const [allQuarters, setAllQuarters] = useState<QuarterSetting[]>([]);
  const [classifications, setClassifications] = useState<ClassificationGroup[]>([]);
  const [classificationMessage, setClassificationMessage] = useState("");
  const [oauth2Status, setOAuth2Status] = useState<MailOAuth2Status>({ connected: false, connectedEmail: null });
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [annualFeeSchedule, setAnnualFeeSchedule] = useState<AnnualFeeScheduleItem[]>([]);
  const [annualFeeCountry, setAnnualFeeCountry] = useState("ALL");
  const [annualFeeMessage, setAnnualFeeMessage] = useState("");

  // OAuth2 콜백에서 돌아왔을 때 URL 파라미터로 결과를 전달받아 메시지를 표시한다.
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
    // 당해·내년 분기를 한 번에 로드해 이력 테이블에 2개 연도를 함께 표시한다.
    // mailLeadMonths·responseDeadline은 기존 review-schedule 단일 엔드포인트에서
    // 분리된 독립 엔드포인트로 각각 조회한다.
    Promise.all([
      getReviewQuarters(currentYear),
      getReviewQuarters(currentYear + 1),
      getMailSettings(),
      getCountryExtensions(),
      getClassifications(),
      getMailLeadMonths(),
      getResponseDeadline(),
      // OAuth2 상태 조회 실패 시 fallback을 반환해 나머지 설정 로드가 중단되지 않도록 한다
      getMailOAuth2Status().catch(() => ({ connected: false, connectedEmail: null } as MailOAuth2Status)),
    ])
      .then(([thisYearQ, nextYearQ, nextMailSettings, nextExtensions, nextClassifications, nextMailLead, nextDeadline, nextOAuth2]) => {
        setQuarters(thisYearQ);
        setAllQuarters([...thisYearQ, ...nextYearQ]);
        setMailSettings(nextMailSettings);
        setMailForm({ gmailUsername: nextMailSettings.gmailUsername ?? "", gmailAppPassword: "" });
        setCountryExtensions(nextExtensions);
        setClassifications(nextClassifications);
        setOAuth2Status(nextOAuth2);
        setMailLeadMonths(nextMailLead);
        setMailLeadMonthsInput(nextMailLead);
        setResponseDeadline(nextDeadline);
        setResponseDeadlineInput(nextDeadline);
      })
      .catch(() => setMessage("설정을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    getAnnualFeeSchedule(annualFeeCountry)
      .then(setAnnualFeeSchedule)
      .catch(() => setAnnualFeeSchedule([]));
  }, [annualFeeCountry]);

  async function handleSaveMail(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingMail(true);
    setMailMessage("");
    try {
      const updated = await updateMailSettings(mailForm.gmailUsername, mailForm.gmailAppPassword);
      setMailSettings(updated);
      setMailForm((f) => ({ ...f, gmailAppPassword: "" }));
      setMailMessage("메일 설정이 저장되었습니다.");
    } catch (error) {
      setMailMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSavingMail(false);
    }
  }

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
      // 활성화 후 activated/submissionDeadline 등이 변경되므로 양쪽 연도를 다시 불러온다.
      const currentYear = new Date().getFullYear();
      const [thisYearQ, nextYearQ] = await Promise.all([
        getReviewQuarters(currentYear),
        getReviewQuarters(currentYear + 1),
      ]);
      setQuarters(thisYearQ);
      setAllQuarters([...thisYearQ, ...nextYearQ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분기 시작에 실패했습니다.");
    }
  }

  return (
    <AppLayout role="ADMIN" title="설정" description="메일 발송 설정과 연차료 검토 분기를 관리합니다.">
      <section className="section">
        <div className="section-header">
          <div>
            <h2>메일 발송 설정</h2>
            <p>Gmail 발송은 Google 계정 연동이 기본입니다. 앱 비밀번호 입력은 레거시 방식으로만 남겨 둡니다.</p>
          </div>
        </div>

        <div className="settings-card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {oauth2Status.connected ? (
              <>
                <span className="badge badge-success">Google 연동됨</span>
                <span className="form-helper-text">{oauth2Status.connectedEmail}</span>
                <Button
                  disabled={isDisconnecting}
                  onClick={async () => {
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
                  }}
                  type="button"
                  variant="secondary"
                >
                  {isDisconnecting ? "해제 중…" : "연동 해제"}
                </Button>
              </>
            ) : (
              <>
                <span className="badge badge-neutral">미연동</span>
                <Button
                  onClick={() => redirectToGoogleOAuth2().catch(() => setMailMessage("Google 연동 URL을 불러오지 못했습니다."))}
                  type="button"
                >
                  Google 계정으로 연동하기
                </Button>
              </>
            )}
          </div>
          <small className="form-helper-text" style={{ marginTop: "0.5rem", display: "block" }}>
            연동된 Google 계정으로 메일을 발송합니다. 앱 비밀번호보다 안전하며 재입력이 필요 없습니다.
          </small>
        </div>

        {mailMessage ? <p className="notice notice-compact" style={{ margin: "0.5rem 0" }}>{mailMessage}</p> : null}

        {/* 레거시: 앱 비밀번호 (OAuth2 미연동 시 폴백) */}
        <div className="settings-card">
          <div style={{ marginBottom: "0.5rem" }}>
            <button
              type="button"
              className="table-action-link"
              onClick={() => setShowLegacyMailForm((s) => !s)}
            >
              {showLegacyMailForm ? "앱 비밀번호 숨기기 (레거시)" : "앱 비밀번호 직접 입력 (레거시, OAuth2 미연동 시 폴백)"}
            </button>
          </div>
          {showLegacyMailForm ? (
            <form onSubmit={handleSaveMail} className="settings-form">
              <label className="form-field">
                <span className="form-label-text">Gmail 계정</span>
                <input
                  onChange={(e) => setMailForm((f) => ({ ...f, gmailUsername: e.target.value }))}
                  placeholder="your@gmail.com"
                  type="email"
                  value={mailForm.gmailUsername}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">Gmail 앱 비밀번호</span>
                <input
                  onChange={(e) => setMailForm((f) => ({ ...f, gmailAppPassword: e.target.value }))}
                  placeholder={mailSettings?.isAppPasswordConfigured ? "변경하려면 새로 입력 (공백이면 유지)" : "xxxx xxxx xxxx xxxx"}
                  type="password"
                  value={mailForm.gmailAppPassword}
                />
                <small className="form-helper-text">
                  Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호에서 발급
                </small>
              </label>
              <div>
                <Button disabled={isSavingMail || !mailForm.gmailUsername} type="submit">
                  {isSavingMail ? "저장 중…" : "저장 (레거시)"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>검토 요청 메일 발송 기준</h2>
            <p>분기 시작일 N개월 전에 스케줄러가 자동으로 분기를 활성화하고 검토 요청 메일을 발송합니다.</p>
          </div>
        </div>
        <form className="settings-card settings-form" onSubmit={handleSaveMailLeadMonths}>
          <label className="form-field">
            <span className="form-label-text">발송 기준 (개월)</span>
            <input
              max={24}
              min={0}
              onChange={(e) => setMailLeadMonthsInput(Number(e.target.value))}
              type="number"
              value={mailLeadMonthsInput}
            />
            <small className="form-helper-text">
              분기 시작일 몇 개월 전에 검토를 시작할지 설정합니다. 기본값은 2개월입니다.
              현재 저장값: {mailLeadMonths}개월
            </small>
          </label>
          {mailLeadMessage ? <p className="notice notice-compact">{mailLeadMessage}</p> : null}
          <div>
            <Button disabled={isSavingMailLead || mailLeadMonthsInput === mailLeadMonths} type="submit">
              {isSavingMailLead ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>사업부 회신 기한</h2>
            <p>
              분기 활성화(검토 시작) 후 사업부가 회신해야 하는 기한입니다.
              활성화일 기준 「+ N개월 + M일」로 자동 계산됩니다.
            </p>
          </div>
        </div>
        <form className="settings-card settings-form" onSubmit={handleSaveResponseDeadline}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <label className="form-field" style={{ flex: "1 1 120px" }}>
              <span className="form-label-text">개월</span>
              <input
                max={12}
                min={0}
                onChange={(e) => setResponseDeadlineInput((prev) => ({ ...prev, months: Number(e.target.value) }))}
                type="number"
                value={responseDeadlineInput.months}
              />
            </label>
            <label className="form-field" style={{ flex: "1 1 120px" }}>
              <span className="form-label-text">일</span>
              <input
                max={30}
                min={0}
                onChange={(e) => setResponseDeadlineInput((prev) => ({ ...prev, days: Number(e.target.value) }))}
                type="number"
                value={responseDeadlineInput.days}
              />
            </label>
          </div>
          <small className="form-helper-text">
            기본값: 검토 시작 후 1개월 0일.
            현재 저장값: 검토 시작 후 {responseDeadline.months}개월 {responseDeadline.days}일
          </small>
          {deadlineMessage ? <p className="notice notice-compact">{deadlineMessage}</p> : null}
          <div>
            <Button
              disabled={
                isSavingDeadline ||
                (responseDeadlineInput.months === responseDeadline.months &&
                  responseDeadlineInput.days === responseDeadline.days)
              }
              type="submit"
            >
              {isSavingDeadline ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>분기 기준</h2>
            <p>연차료 납부 기간 기준으로 구분되는 분기 범위입니다.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>분기</th>
                <th>납부 기간</th>
              </tr>
            </thead>
            <tbody>
              {[
                { q: "Q1", range: "1월 1일 ~ 3월 31일" },
                { q: "Q2", range: "4월 1일 ~ 6월 30일" },
                { q: "Q3", range: "7월 1일 ~ 9월 30일" },
                { q: "Q4", range: "10월 1일 ~ 12월 31일" },
              ].map(({ q, range }) => (
                <tr key={q}>
                  <td><strong>{q}</strong></td>
                  <td>{range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>분기 이력 및 예정 일정</h2>
            <p>
              과거 분기 진행 이력과 향후 예정 일정을 확인합니다.
              분기 시작·종료는 스케줄러가 자동 처리하며, 수동으로 시작할 수도 있습니다.
            </p>
          </div>
        </div>
        {message ? (
          <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>
            {message}
          </p>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>분기</th>
                <th>납부 기간</th>
                <th>검토 시작일</th>
                <th>회신 기한</th>
                <th>대상 특허</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="empty-table-cell" colSpan={7}>불러오는 중…</td></tr>
              ) : allQuarters.length === 0 ? (
                <tr><td className="empty-table-cell" colSpan={7}>분기 데이터가 없습니다.</td></tr>
              ) : (
                // .slice()로 원본 배열을 복사한 뒤 정렬 — allQuarters state를 직접 변경하지 않기 위해
                allQuarters
                  .slice()
                  .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
                  .map((quarter) => (
                    <QuarterHistoryRow
                      key={quarter.quarterKey}
                      quarter={quarter}
                      onActivate={handleActivate}
                    />
                  ))
              )}
            </tbody>
          </table>
        </div>
        <p className="form-helper-text" style={{ marginTop: "0.5rem" }}>
          분기 종료는 납부 기간 종료일 경과 후 스케줄러가 자동 처리합니다.
        </p>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>사업/기술 분류 관리</h2>
            <p>기존 사업은 종료된 사업을 의미합니다. 특허 등록, 필터, AI 레포트에서 같은 기준값을 사용합니다.</p>
          </div>
        </div>
        {classificationMessage ? <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>{classificationMessage}</p> : null}
        <div className="settings-grid">
          {classifications.map((group) => (
            <ClassificationEditor
              group={group}
              key={group.type}
              onAdd={(value) => handleClassificationUpdate(group.type, () => addClassification(group.type, value))}
              onDelete={(value) => handleClassificationUpdate(group.type, () => deleteClassification(group.type, value))}
              onRename={(currentValue, nextValue) =>
                handleClassificationUpdate(group.type, () => renameClassification(group.type, currentValue, nextValue))
              }
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>유지 결정 시 납부일 연장 기간</h2>
            <p>관리자가 특허를 유지 처리하면 납부 기한이 아래 설정값(개월)만큼 자동 연장됩니다.</p>
          </div>
        </div>
        {extMessage ? <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>{extMessage}</p> : null}
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
                    try {
                      const updated = await updateCountryExtension(country, months);
                      setCountryExtensions((prev) => prev.map((e) => (e.country === country ? updated : e)));
                      setExtMessage(`${updated.label} 연장 기간이 ${updated.extensionMonths}개월로 저장되었습니다.`);
                    } catch (error) {
                      setExtMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>국가별 연차료 납부 예정일</h2>
            <p>국내특허와 해외특허를 구분해 미래 납부 예정일을 확인하고 조정합니다.</p>
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
                  <td className="empty-table-cell" colSpan={6}>연차료 납부 예정일 데이터가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>납부 기간 안내</h2>
            <p>국가별 연차료 납부 주기 기준입니다.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>국가</th>
                <th>납부 주기</th>
                <th>기준일</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🇰🇷 한국 (KR)</td>
                <td>매년</td>
                <td>출원일 기준 매년</td>
                <td>4월 전 특허는 설정月 내 납부 필요</td>
              </tr>
              <tr>
                <td>🇯🇵 일본 (JP)</td>
                <td>매년</td>
                <td>출원일 기준 매년</td>
                <td>-</td>
              </tr>
              <tr>
                <td>🇨🇳 중국 (CN)</td>
                <td>매년</td>
                <td>출원일 기준 매년</td>
                <td>-</td>
              </tr>
              <tr>
                <td>🇺🇸 미국 (US)</td>
                <td>매년</td>
                <td>출원일 기준 매년</td>
                <td>국가별 조정 이력으로 별도 관리</td>
              </tr>
              <tr>
                <td>기타 (TW / UAE 등)</td>
                <td>매년</td>
                <td>출원일 기준 매년</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </AppLayout>
  );
}

// 분기 이력·예정 행 — 분기 편집·종료 버튼을 제거하고 읽기 전용으로 단순화.
// 종료는 스케줄러 자동 처리, 수동 시작만 isUpcoming 상태에서 허용.
function QuarterHistoryRow({
  quarter,
  onActivate,
}: {
  quarter: QuarterSetting;
  onActivate: (key: string) => Promise<void>;
}) {
  const [isActivating, setIsActivating] = useState(false);

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-";
  const fmtFull = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ko-KR") : "-";

  // isUpcoming: 아직 활성화되지 않은 예정 분기 — 수동 시작 버튼 표시 조건
  // isActive: 현재 진행 중인 분기 — 종료는 스케줄러가 처리하므로 UI에서 별도 버튼 없음
  const isUpcoming = !quarter.activated && !quarter.ended;
  const isActive = quarter.activated && !quarter.ended;

  async function activate() {
    setIsActivating(true);
    await onActivate(quarter.quarterKey).finally(() => setIsActivating(false));
  }

  return (
    // 종료된 분기는 opacity를 낮춰 과거 이력임을 시각적으로 구분
    <tr style={{ opacity: quarter.ended ? 0.6 : 1 }}>
      <td>
        <strong>{quarter.quarterLabel}</strong>
        {quarter.ended && quarter.endedAt ? (
          <span className="table-subtext">{fmtFull(quarter.endedAt)} 종료</span>
        ) : null}
      </td>
      <td>
        {fmt(quarter.startDate)} ~ {fmt(quarter.endDate)}
      </td>
      <td>
        {quarter.activated ? (
          <>
            <strong>{fmtFull(quarter.activatedAt)}</strong>
            <span className="table-subtext">실제 시작</span>
          </>
        ) : quarter.scheduledMailSendDate ? (
          <>
            <strong>{fmtFull(quarter.scheduledMailSendDate)}</strong>
            <span className="table-subtext">예정 ({quarter.mailLeadMonths}개월 전)</span>
          </>
        ) : "-"}
      </td>
      <td>
        {quarter.submissionDeadline ? (
          <strong>{fmtFull(quarter.submissionDeadline)}</strong>
        ) : (
          <span className="table-subtext">활성화 시 자동 계산</span>
        )}
      </td>
      <td>
        {quarter.activated
          ? `${quarter.targetPatentCount}건`
          : "-"}
      </td>
      <td>
        {quarter.ended ? (
          <span className="badge badge-neutral">종료</span>
        ) : isActive ? (
          <span className="badge badge-success">진행 중</span>
        ) : (
          <span className="badge badge-neutral">예정</span>
        )}
      </td>
      <td className="table-cell-actions">
        {isUpcoming && (
          <Button
            disabled={isActivating}
            onClick={activate}
            type="button"
            variant="secondary"
          >
            {isActivating ? "처리 중…" : "수동 시작"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function ClassificationEditor({
  group,
  onAdd,
  onDelete,
  onRename,
}: {
  group: ClassificationGroup;
  onAdd: (value: string) => Promise<void>;
  onDelete: (value: string) => Promise<void>;
  onRename: (currentValue: string, nextValue: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [editingNextValue, setEditingNextValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const title = group.type === "BUSINESS" ? "사업 분류" : "기술 분류";

  async function run(action: () => Promise<void>) {
    setIsSaving(true);
    await action().finally(() => setIsSaving(false));
  }

  return (
    <div className="settings-card">
      <div className="section-header section-header-compact">
        <div>
          <h3>{title}</h3>
          <p>{group.values.length}개 기준값</p>
        </div>
      </div>
      <div className="inline-form-row">
        <input
          onChange={(event) => setNewValue(event.target.value)}
          placeholder={`${title} 추가`}
          value={newValue}
        />
        <Button
          disabled={isSaving || !newValue.trim()}
          onClick={() => run(async () => {
            await onAdd(newValue);
            setNewValue("");
          })}
          type="button"
          variant="secondary"
        >
          추가
        </Button>
      </div>
      <div className="classification-list">
        {group.values.map((value) => (
          <div className="classification-row" key={value}>
            {editingValue === value ? (
              <input
                autoFocus
                onChange={(event) => setEditingNextValue(event.target.value)}
                value={editingNextValue}
              />
            ) : (
              <span>{value}</span>
            )}
            <div className="table-cell-actions">
              {editingValue === value ? (
                <>
                  <Button
                    disabled={isSaving || !editingNextValue.trim()}
                    onClick={() => run(async () => {
                      await onRename(value, editingNextValue);
                      setEditingValue("");
                      setEditingNextValue("");
                    })}
                    type="button"
                    variant="secondary"
                  >
                    저장
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      setEditingValue("");
                      setEditingNextValue("");
                    }}
                    type="button"
                    variant="secondary"
                  >
                    취소
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      setEditingValue(value);
                      setEditingNextValue(value);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    수정
                  </Button>
                  <Button disabled={isSaving} onClick={() => run(() => onDelete(value))} type="button" variant="secondary">
                    삭제
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const isDirty = months !== ext.extensionMonths;

  async function save() {
    setIsSaving(true);
    await onSave(ext.country, months).finally(() => setIsSaving(false));
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
        <strong>{item.managementNumber}</strong>
        <span className="table-subtext">{item.title}</span>
      </td>
      <td>
        <span className={item.domesticPatent ? "badge badge-success" : "badge badge-neutral"}>
          {item.domesticPatent ? "국내특허" : "해외특허"}
        </span>
        <span className="table-subtext">{item.country}</span>
      </td>
      <td>{item.annualFeeBaseDate ?? "-"}</td>
      <td>
        <strong>{item.nextAnnualFeeDueDate ?? "-"}</strong>
        {item.adjustedAnnualFeeDueDate ? <span className="table-subtext">조정됨</span> : null}
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
