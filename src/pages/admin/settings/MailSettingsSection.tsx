import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "../../../components/common/Button";
import type { MailOAuth2Status, ResponseDeadline } from "../../../api/settings";

// type=number 입력은 '1e'·'-' 같은 중간 입력에서 빈 문자열(→ Number는 NaN)을 만들 수 있다.
// NaN은 저장 비활성 비교(=== 현재값)를 통과해 버튼을 활성화하고, JSON.stringify에서 null로
// 직렬화되어 BE의 원시 int 바인딩에서 400을 유발한다. 항상 [min, max] 범위의 정수로 정규화한다.
export function normalizeNumberInput(rawValue: string, min: number, max: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

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
 * @description SETTINGS-12(항목8): 메일/회신 설정 — 카드 나열 대신 왼쪽 설명·오른쪽 입력의
 * 컴팩트한 행 레이아웃으로 Google 연동, 발송 기준, 회신 기한을 관리한다.
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
    <section className="section">
      <div className="section-header">
        <div>
          <h2>메일/회신 설정</h2>
          <p>검토 요청 메일 발송 계정과 발송·회신 기준을 관리합니다.</p>
        </div>
      </div>

      <div className="settings-row-list">
        <div className="settings-row">
          <div className="settings-row-info">
            <strong>Google 계정 연동</strong>
            <span>Gmail 발송은 Google 계정 연동으로만 지원되며, 연동된 계정으로 메일을 발송합니다.</span>
            {mailMessage ? <span className="settings-row-message">{mailMessage}</span> : null}
          </div>
          <div className="settings-row-control">
            {oauth2Status.connected ? (
              <>
                <span className="badge badge-success">연동됨</span>
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
        </div>

        <form className="settings-row" onSubmit={onSaveMailLeadMonths}>
          <div className="settings-row-info">
            <strong>검토 요청 메일 발송 기준</strong>
            {/* MAIL-09: 스케줄러는 분기 '활성화'만 자동 처리한다 — 검토 요청 메일은 관리자가 수동 발송한다. */}
            <span>
              분기 시작일 N개월 전에 스케줄러가 자동으로 분기를 활성화합니다. 검토 요청 메일은 관리자가 특허 조회
              화면에서 수동으로 발송합니다.
            </span>
            {mailLeadMessage ? <span className="settings-row-message">{mailLeadMessage}</span> : null}
          </div>
          <div className="settings-row-control">
            <label className="settings-inline-input">
              <input
                aria-label="발송 기준 (개월)"
                max={24}
                min={0}
                onChange={(e) => setMailLeadMonthsInput(normalizeNumberInput(e.target.value, 0, 24))}
                type="number"
                value={mailLeadMonthsInput}
              />
              <span>개월 전</span>
            </label>
            <Button disabled={isSavingMailLead || mailLeadMonthsInput === mailLeadMonths} type="submit" variant="secondary">
              {isSavingMailLead ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>

        <form className="settings-row" onSubmit={onSaveResponseDeadline}>
          <div className="settings-row-info">
            <strong>사업부 회신 기한</strong>
            <span>분기 활성화(검토 시작) 후 사업부가 회신해야 하는 기한입니다. 활성화일 기준 「+ N개월 + M일」로 계산됩니다.</span>
            {deadlineMessage ? <span className="settings-row-message">{deadlineMessage}</span> : null}
          </div>
          <div className="settings-row-control">
            <label className="settings-inline-input">
              <input
                aria-label="회신 기한 개월"
                max={12}
                min={0}
                onChange={(e) =>
                  setResponseDeadlineInput((prev) => ({ ...prev, months: normalizeNumberInput(e.target.value, 0, 12) }))
                }
                type="number"
                value={responseDeadlineInput.months}
              />
              <span>개월</span>
            </label>
            <label className="settings-inline-input">
              <input
                aria-label="회신 기한 일"
                max={30}
                min={0}
                onChange={(e) =>
                  setResponseDeadlineInput((prev) => ({ ...prev, days: normalizeNumberInput(e.target.value, 0, 30) }))
                }
                type="number"
                value={responseDeadlineInput.days}
              />
              <span>일</span>
            </label>
            <Button
              disabled={
                isSavingDeadline ||
                (responseDeadlineInput.months === responseDeadline.months &&
                  responseDeadlineInput.days === responseDeadline.days)
              }
              type="submit"
              variant="secondary"
            >
              {isSavingDeadline ? "저장 중…" : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
