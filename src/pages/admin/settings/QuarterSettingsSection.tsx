/**
 * @author 유건욱
 * @date 2026-06-04
 */
import { useState } from "react";
import { Button } from "../../../components/common/Button";
import type { QuarterSetting, ReviewPeriodTemplate } from "../../../api/settings";

interface QuarterSettingsSectionProps {
  isLoading: boolean;
  message: string;
  allQuarters: QuarterSetting[];
  reviewPeriodTemplates: ReviewPeriodTemplate[];
  onActivate: (quarterKey: string) => Promise<void>;
}

/**
 * @relatedFR FR-LEGAL-16, FR-LEGAL-22, FR-LEGAL-23
 * @relatedUI UI-LEGAL-07
 * @description 연차료 검토 분기 기준과 분기 이력·예정 일정을 표시하고 수동 분기 시작을 제공하는 설정 섹션.
 */
export function QuarterSettingsSection({
  isLoading,
  message,
  allQuarters,
  reviewPeriodTemplates,
  onActivate,
}: QuarterSettingsSectionProps) {
  const quarterPeriodRows = getQuarterPeriodRows(reviewPeriodTemplates);

  return (
    <>
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
              {quarterPeriodRows.map(({ q, range }) => (
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
                allQuarters
                  .slice()
                  .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
                  .map((quarter) => (
                    <QuarterHistoryRow
                      key={quarter.quarterKey}
                      quarter={quarter}
                      onActivate={onActivate}
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
    </>
  );
}

function QuarterHistoryRow({
  quarter,
  onActivate,
}: {
  quarter: QuarterSetting;
  onActivate: (key: string) => Promise<void>;
}) {
  const [isActivating, setIsActivating] = useState(false);

  // date-only 'YYYY-MM-DD'는 UTC 자정으로 해석되어 음수 오프셋 타임존에서 하루 밀린다.
  // 로컬 자정(`...T00:00:00`)으로 파싱해 타임존 무관하게 같은 날짜를 표시한다.
  // activatedAt/endedAt 등 오프셋 포함 datetime은 그대로 둔다.
  const toLocalDate = (d: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  const fmt = (d: string | null) =>
    d ? toLocalDate(d).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-";
  const fmtFull = (d: string | null) =>
    d ? toLocalDate(d).toLocaleDateString("ko-KR") : "-";

  const isUpcoming = !quarter.activated && !quarter.ended;
  const isActive = quarter.activated && !quarter.ended;

  async function activate() {
    setIsActivating(true);
    await onActivate(quarter.quarterKey).finally(() => setIsActivating(false));
  }

  return (
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
        {quarter.scheduledMailSendDate ? (
          <>
            <strong>{fmtFull(quarter.scheduledMailSendDate)}</strong>
            <span className="table-subtext">{quarter.mailLeadMonths}개월 전</span>
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

function getQuarterPeriodRows(reviewPeriodTemplates: ReviewPeriodTemplate[]) {
  const templates = reviewPeriodTemplates.length > 0
    ? reviewPeriodTemplates
    : [
        { periodNumber: 1, startMonth: 1, startDay: 1, endMonth: 3, endDay: 31, label: "Q1" },
        { periodNumber: 2, startMonth: 4, startDay: 1, endMonth: 6, endDay: 30, label: "Q2" },
        { periodNumber: 3, startMonth: 7, startDay: 1, endMonth: 9, endDay: 30, label: "Q3" },
        { periodNumber: 4, startMonth: 10, startDay: 1, endMonth: 12, endDay: 31, label: "Q4" },
      ];

  return templates
    .slice()
    .sort((first, second) => first.periodNumber - second.periodNumber)
    .map((template) => ({
      q: template.label || `Q${template.periodNumber}`,
      range: `${template.startMonth}월 ${template.startDay}일 ~ ${template.endMonth}월 ${template.endDay}일`,
    }));
}
