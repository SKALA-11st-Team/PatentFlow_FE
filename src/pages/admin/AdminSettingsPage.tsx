import { useEffect, useState } from "react";
import {
  addClassification,
  adjustAnnualFeeSchedule,
  activateReviewQuarter,
  deleteClassification,
  endReviewQuarter,
  getAnnualFeeSchedule,
  getClassifications,
  getCountryExtensions,
  getMailSettings,
  getReviewQuarters,
  renameClassification,
  updateCountryExtension,
  updateMailSettings,
  updateReviewQuarter,
  updateReviewSchedule,
  type AnnualFeeScheduleItem,
  type ClassificationGroup,
  type ClassificationType,
  type CountryExtension,
  type MailSettings,
  type QuarterSetting,
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
  const [scheduleForm, setScheduleForm] = useState({ businessResponseDueDate: "", mailLeadMonths: 2 });
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [classifications, setClassifications] = useState<ClassificationGroup[]>([]);
  const [classificationMessage, setClassificationMessage] = useState("");
  const [annualFeeSchedule, setAnnualFeeSchedule] = useState<AnnualFeeScheduleItem[]>([]);
  const [annualFeeCountry, setAnnualFeeCountry] = useState("ALL");
  const [annualFeeMessage, setAnnualFeeMessage] = useState("");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getReviewQuarters(), getMailSettings(), getCountryExtensions(), getClassifications()])
      .then(([nextQuarters, nextMailSettings, nextExtensions, nextClassifications]) => {
        setQuarters(nextQuarters);
        setMailSettings(nextMailSettings);
        setMailForm({ gmailUsername: nextMailSettings.gmailUsername ?? "", gmailAppPassword: "" });
        setCountryExtensions(nextExtensions);
        setClassifications(nextClassifications);
        const firstQuarter = nextQuarters[0];
        setScheduleForm({
          businessResponseDueDate: firstQuarter?.businessResponseDueDate ?? firstQuarter?.submissionDeadline ?? "",
          mailLeadMonths: firstQuarter?.mailLeadMonths ?? 2,
        });
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

  async function handleSave(quarterKey: string, startDate: string | null, endDate: string | null, submissionDeadline: string | null) {
    try {
      const updated = await updateReviewQuarter(quarterKey, startDate, endDate, submissionDeadline);
      setQuarters((prev) => prev.map((q) => (q.quarterKey === quarterKey ? updated : q)));
      setMessage(`${quarterKey} 설정이 저장되었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    }
  }

  async function handleSaveReviewSchedule(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingSchedule(true);
    setScheduleMessage("");
    try {
      const year = quarters[0]?.year ?? new Date().getFullYear();
      const updated = await updateReviewSchedule(
        year,
        scheduleForm.mailLeadMonths,
        scheduleForm.businessResponseDueDate || null,
      );
      setQuarters(updated);
      setScheduleMessage("회신 기한과 메일 발송 기준이 저장되었습니다.");
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSavingSchedule(false);
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
      const updated = await getReviewQuarters();
      setQuarters(updated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분기 시작에 실패했습니다.");
    }
  }

  async function handleEnd(quarterKey: string) {
    if (!confirm(`${quarterKey} 분기를 종료하시겠습니까?`)) return;
    try {
      const updated = await endReviewQuarter(quarterKey);
      setQuarters((prev) => prev.map((q) => (q.quarterKey === quarterKey ? updated : q)));
      setMessage(`${quarterKey} 분기가 종료되었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분기 종료에 실패했습니다.");
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
          <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>현재 상태:</span>
            {mailSettings?.gmailUsername ? (
              <>
                <span className="badge badge-success">설정됨</span>
                <span className="form-helper-text">
                  {mailSettings.gmailUsername} · {mailSettings.isAppPasswordConfigured ? "레거시 자격 증명 등록됨" : "Google 계정 연동 권장"}
                </span>
              </>
            ) : (
              <span className="badge badge-neutral">미설정</span>
            )}
          </div>

          <div className="settings-form">
            <div className="oauth-pending-panel">
              <Button disabled type="button">
                Google 계정으로 연동하기
              </Button>
              <span className="form-helper-text">Google 계정 연동은 백엔드 인증 엔드포인트 준비 후 활성화됩니다.</span>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="table-action-link"
                onClick={() => setShowLegacyMailForm((s) => !s)}
              >
                {showLegacyMailForm ? "앱 비밀번호 숨기기(권장 아님)" : "앱 비밀번호 직접 입력(레거시)"}
              </button>
            </div>

            {showLegacyMailForm ? (
              <form onSubmit={handleSaveMail} className="settings-form" style={{ marginTop: "0.75rem" }}>
                <label className="form-field">
                  <span className="form-label-text">Gmail 계정 (레거시)</span>
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
                {mailMessage ? (
                  <p className="notice notice-compact">{mailMessage}</p>
                ) : null}
                <div>
                  <Button disabled={isSavingMail || !mailForm.gmailUsername} type="submit">
                    {isSavingMail ? "저장 중…" : "저장 (레거시)"}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>회신 기한 및 발송 기준</h2>
            <p>사업부에는 회신 기한을 표시하고, 실제 법무 처리 기한과 분리해서 관리합니다.</p>
          </div>
        </div>
        <form className="settings-card settings-form" onSubmit={handleSaveReviewSchedule}>
          <label className="form-field">
            <span className="form-label-text">일괄 회신 기한</span>
            <input
              onChange={(event) => setScheduleForm((form) => ({ ...form, businessResponseDueDate: event.target.value }))}
              type="date"
              value={scheduleForm.businessResponseDueDate}
            />
          </label>
          <label className="form-field">
            <span className="form-label-text">검토 요청 메일 발송 기준</span>
            <input
              max={24}
              min={0}
              onChange={(event) => setScheduleForm((form) => ({ ...form, mailLeadMonths: Number(event.target.value) }))}
              type="number"
              value={scheduleForm.mailLeadMonths}
            />
            <small className="form-helper-text">분기 시작일 몇 개월 전에 보낼지 설정합니다. 기본값은 2개월 전입니다.</small>
          </label>
          {scheduleMessage ? <p className="notice notice-compact">{scheduleMessage}</p> : null}
          <div>
            <Button disabled={isSavingSchedule} type="submit">
              {isSavingSchedule ? "저장 중…" : "일괄 저장"}
            </Button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>검토 분기 설정</h2>
            <p>
              {isLoading
                ? "분기 설정을 불러오는 중입니다."
                : "각 분기의 연차료 납부 기간을 설정하고, 해당 분기 검토를 시작하세요."}
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
                <th>납부 기간 시작</th>
                <th>납부 기간 종료</th>
                <th>회신 기한</th>
                <th>메일 발송 예정일</th>
                <th>대상 특허</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((quarter) => (
                <QuarterRow
                  key={quarter.quarterKey}
                  quarter={quarter}
                  onSave={handleSave}
                  onActivate={handleActivate}
                  onEnd={handleEnd}
                />
              ))}
              {!isLoading && quarters.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={8}>
                    분기 설정이 없습니다. BE 실행 상태를 확인하세요.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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

function QuarterRow({
  quarter,
  onSave,
  onActivate,
  onEnd,
}: {
  quarter: QuarterSetting;
  onSave: (key: string, start: string | null, end: string | null, deadline: string | null) => Promise<void>;
  onActivate: (key: string) => Promise<void>;
  onEnd: (key: string) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState(quarter.startDate ?? "");
  const [endDate, setEndDate] = useState(quarter.endDate ?? "");
  const [submissionDeadline, setSubmissionDeadline] = useState(quarter.submissionDeadline ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const isDateRangeDirty = !quarter.activated && (
    startDate !== (quarter.startDate ?? "") || endDate !== (quarter.endDate ?? "")
  );
  const isDeadlineDirty = submissionDeadline !== (quarter.submissionDeadline ?? "");
  const isDirty = isDateRangeDirty || isDeadlineDirty;

  async function save() {
    setIsSaving(true);
    const start = quarter.activated ? null : (startDate || null);
    const end = quarter.activated ? null : (endDate || null);
    await onSave(quarter.quarterKey, start, end, submissionDeadline || null).finally(() => setIsSaving(false));
  }

  async function activate() {
    setIsActivating(true);
    await onActivate(quarter.quarterKey).finally(() => setIsActivating(false));
  }

  async function end() {
    setIsEnding(true);
    await onEnd(quarter.quarterKey).finally(() => setIsEnding(false));
  }

  return (
    <tr>
      <td>
        <strong>{quarter.quarterLabel}</strong>
      </td>
      <td>
        <input
          disabled={quarter.activated}
          onChange={(e) => setStartDate(e.target.value)}
          type="date"
          value={startDate}
        />
      </td>
      <td>
        <input
          disabled={quarter.activated}
          onChange={(e) => setEndDate(e.target.value)}
          type="date"
          value={endDate}
        />
      </td>
      <td>
        <input
          disabled={quarter.ended}
          onChange={(e) => setSubmissionDeadline(e.target.value)}
          placeholder="회신 기한 설정"
          type="date"
          value={submissionDeadline}
        />
      </td>
      <td>
        <strong>{quarter.scheduledMailSendDate ?? "-"}</strong>
        <span className="table-subtext">{quarter.mailLeadMonths}개월 전 발송</span>
      </td>
      <td>{quarter.activated ? `${quarter.targetPatentCount}건` : quarter.targetPatentCount > 0 ? `${quarter.targetPatentCount}건 (예정)` : "-"}</td>
      <td>
        {quarter.ended ? (
          <span className="badge badge-neutral">종료</span>
        ) : quarter.activated ? (
          <span className="badge badge-success">활성</span>
        ) : (
          <span className="badge badge-neutral">미시작</span>
        )}
      </td>
      <td className="table-cell-actions">
        {!quarter.ended && (
          <Button
            disabled={isSaving || !isDirty}
            onClick={save}
            type="button"
            variant="secondary"
          >
            {isSaving ? "저장 중…" : "저장"}
          </Button>
        )}
        {!quarter.activated && !quarter.ended && (
          <Button
            disabled={isActivating || !quarter.startDate || !quarter.endDate || isDateRangeDirty}
            onClick={activate}
            type="button"
          >
            {isActivating ? "처리 중…" : "분기 시작"}
          </Button>
        )}
        {quarter.activated && !quarter.ended && (
          <Button
            disabled={isEnding}
            onClick={end}
            type="button"
            variant="secondary"
          >
            {isEnding ? "처리 중…" : "분기 종료"}
          </Button>
        )}
        {quarter.ended && quarter.endedAt ? (
          <span className="table-subtext">
            {new Date(quarter.endedAt).toLocaleDateString("ko-KR")} 종료됨
          </span>
        ) : quarter.activated && quarter.activatedAt ? (
          <span className="table-subtext">
            {new Date(quarter.activatedAt).toLocaleDateString("ko-KR")} 시작됨
          </span>
        ) : null}
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
