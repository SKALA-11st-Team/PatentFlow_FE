import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "../../../components/common/Button";
import type { MailOAuth2Status, ResponseDeadline } from "../../../api/settings";

interface MailSettingsSectionProps {
  oauth2Status: MailOAuth2Status;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  mailMessage: string;
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
 * @description Google 계정 연동 메일 설정, 검토 요청 메일 발송 기준(개월), 사업부 회신 기한을 관리하는 설정 섹션.
 */
export function MailSettingsSection({
  oauth2Status,
  isDisconnecting,
  onConnect,
  onDisconnect,
  mailMessage,
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
            <p>Gmail 발송은 Google 계정 연동으로만 지원됩니다.</p>
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
            연동된 Google 계정으로 메일을 발송합니다.
          </small>
        </div>

        {mailMessage ? <p className="notice notice-compact" style={{ margin: "0.5rem 0" }}>{mailMessage}</p> : null}
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>검토 요청 메일 발송 기준</h2>
            {/* MAIL-09: 스케줄러는 분기 '활성화'만 자동 처리한다 — 검토 요청 메일은 관리자가 수동 발송한다(거짓 카피 정정). */}
            <p>분기 시작일 N개월 전에 스케줄러가 자동으로 분기를 활성화합니다. 검토 요청 메일은 관리자가 검토 대상 화면에서 수동으로 발송합니다.</p>
          </div>
        </div>
        <form className="settings-card settings-form" onSubmit={onSaveMailLeadMonths}>
          <label className="form-field" style={{ maxWidth: "180px" }}>
            <span className="form-label-text">발송 기준 (개월)</span>
            <input
              max={24}
              min={0}
              onChange={(e) => setMailLeadMonthsInput(Number(e.target.value))}
              style={{ maxWidth: "100px" }}
              type="number"
              value={mailLeadMonthsInput}
            />
            <small className="form-saved-value">현재 저장값: {mailLeadMonths}개월</small>
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
            <label className="form-field" style={{ maxWidth: "120px" }}>
              <span className="form-label-text">개월</span>
              <input
                max={12}
                min={0}
                onChange={(e) => setResponseDeadlineInput((prev) => ({ ...prev, months: Number(e.target.value) }))}
                style={{ maxWidth: "100px" }}
                type="number"
                value={responseDeadlineInput.months}
              />
            </label>
            <label className="form-field" style={{ maxWidth: "120px" }}>
              <span className="form-label-text">일</span>
              <input
                max={30}
                min={0}
                onChange={(e) => setResponseDeadlineInput((prev) => ({ ...prev, days: Number(e.target.value) }))}
                style={{ maxWidth: "100px" }}
                type="number"
                value={responseDeadlineInput.days}
              />
            </label>
          </div>
          <small className="form-saved-value">현재 저장값: 검토 시작 후 {responseDeadline.months}개월 {responseDeadline.days}일</small>
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
