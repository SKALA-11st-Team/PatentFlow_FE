import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "../../../components/common/Button";
import type { MailOAuth2Status, MailSettings, ResponseDeadline } from "../../../api/settings";

interface MailFormState {
  gmailUsername: string;
  gmailAppPassword: string;
}

interface MailSettingsSectionProps {
  oauth2Status: MailOAuth2Status;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  mailMessage: string;
  mailSettings: MailSettings | null;
  mailForm: MailFormState;
  setMailForm: Dispatch<SetStateAction<MailFormState>>;
  showLegacyMailForm: boolean;
  setShowLegacyMailForm: Dispatch<SetStateAction<boolean>>;
  isSavingMail: boolean;
  onSaveMail: (event: FormEvent) => void;
  mailLeadMonths: number;
  mailLeadMonthsInput: number;
  setMailLeadMonthsInput: Dispatch<SetStateAction<number>>;
  isSavingMailLead: boolean;
  mailLeadMessage: string;
  onSaveMailLeadMonths: (event: FormEvent) => void;
  responseDeadline: ResponseDeadline;
  responseDeadlineInput: ResponseDeadline;
  setResponseDeadlineInput: Dispatch<SetStateAction<ResponseDeadline>>;
  isSavingDeadline: boolean;
  deadlineMessage: string;
  onSaveResponseDeadline: (event: FormEvent) => void;
}

/**
 * @relatedFR FR-LEGAL-12, FR-LEGAL-16, FR-LEGAL-23
 * @relatedUI UI-LEGAL-07
 * @description Google 계정 연동/앱 비밀번호 메일 설정, 검토 요청 메일 발송 기준(개월), 사업부 회신 기한을 관리하는 설정 섹션.
 */
export function MailSettingsSection({
  oauth2Status,
  isDisconnecting,
  onConnect,
  onDisconnect,
  mailMessage,
  mailSettings,
  mailForm,
  setMailForm,
  showLegacyMailForm,
  setShowLegacyMailForm,
  isSavingMail,
  onSaveMail,
  mailLeadMonths,
  mailLeadMonthsInput,
  setMailLeadMonthsInput,
  isSavingMailLead,
  mailLeadMessage,
  onSaveMailLeadMonths,
  responseDeadline,
  responseDeadlineInput,
  setResponseDeadlineInput,
  isSavingDeadline,
  deadlineMessage,
  onSaveResponseDeadline,
}: MailSettingsSectionProps) {
  return (
    <>
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
                <Button disabled={isDisconnecting} onClick={onDisconnect} type="button" variant="secondary">
                  {isDisconnecting ? "해제 중…" : "연동 해제"}
                </Button>
              </>
            ) : (
              <>
                <span className="badge badge-neutral">미연동</span>
                <Button onClick={onConnect} type="button">
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

        <div className="settings-card">
          <div style={{ marginBottom: "0.5rem" }}>
            <button
              type="button"
              className="table-action-link"
              onClick={() => setShowLegacyMailForm((s) => !s)}
            >
              {showLegacyMailForm ? "앱 비밀번호 숨기기 (레거시)" : "앱 비밀번호 직접 입력 (레거시, Google 계정 미연동 시 폴백)"}
            </button>
          </div>
          {showLegacyMailForm ? (
            <form onSubmit={onSaveMail} className="settings-form">
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
        <form className="settings-card settings-form" onSubmit={onSaveMailLeadMonths}>
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
        <form className="settings-card settings-form" onSubmit={onSaveResponseDeadline}>
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
    </>
  );
}
