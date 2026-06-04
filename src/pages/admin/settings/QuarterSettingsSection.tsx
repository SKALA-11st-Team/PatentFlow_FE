import { useState } from "react";
import { Button } from "../../../components/common/Button";
import type { QuarterSetting } from "../../../api/settings";

interface QuarterSettingsSectionProps {
  isLoading: boolean;
  message: string;
  allQuarters: QuarterSetting[];
  onActivate: (quarterKey: string) => Promise<void>;
}

/**
 * @relatedFR FR-LEGAL-16, FR-LEGAL-22, FR-LEGAL-23
 * @relatedUI UI-LEGAL-07
 * @description 연차료 검토 분기 기준과 분기 이력·예정 일정을 표시하고 수동 분기 시작을 제공하는 설정 섹션.
 */
export function QuarterSettingsSection({ isLoading, message, allQuarters, onActivate }: QuarterSettingsSectionProps) {
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
