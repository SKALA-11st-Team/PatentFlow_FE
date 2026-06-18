/**
 * @author 유건욱
 * @date 2026-05-06
 */
interface QuarterCompletionDonutProps {
  completed: number;
  helper: string;
  isLoading?: boolean;
  label: string;
  total: number;
  quarterLabel?: string;
}

/**
 * @relatedFR FR-LEGAL-01, FR-BUS-01, FR-LEGAL-10
 * @relatedUI UI-LEGAL-01, UI-BUS-01
 * @description 대시보드에서 이번 분기 대상 대비 완료 비율을 원형 그래프로 표시한다.
 */
export function QuarterCompletionDonut({
  completed,
  helper,
  isLoading = false,
  label,
  quarterLabel,
  total,
}: QuarterCompletionDonutProps) {
  const percent = getCompletionPercent(completed, total);
  const denominatorLabel = `${completed} / ${total}건`;
  // DASH-EMPTY: 검토 대상이 0건이면 0/0건·0% 대신 명확한 빈 상태 문구를 보여준다.
  const isEmpty = !isLoading && total <= 0;

  if (isEmpty) {
    return (
      <article
        className="quarter-donut-card quarter-donut-empty"
        aria-label={`${quarterLabel ?? getCurrentQuarterLabel()} ${label}: 검토할 특허가 없습니다`}
      >
        <span>{quarterLabel ?? getCurrentQuarterLabel()}</span>
        <div className="quarter-donut-empty-body">
          <strong>{label}</strong>
          <p className="empty-state">검토할 특허가 없습니다</p>
          <small>{helper}</small>
        </div>
      </article>
    );
  }

  return (
    <article
      className="quarter-donut-card"
      aria-busy={isLoading}
      aria-label={`${quarterLabel ?? getCurrentQuarterLabel()} ${label} ${percent}%, ${denominatorLabel}`}
      title={`${label}: ${denominatorLabel}. 분모는 현재 조회 기준 대상 건수입니다.`}
    >
      <span>{quarterLabel ?? getCurrentQuarterLabel()}</span>
      <div
        className={`quarter-donut-ring${isLoading ? " quarter-donut-loading-ring" : ""}`}
        style={{
          background: `conic-gradient(var(--color-success) 0 ${percent}%, var(--color-bg-secondary) ${percent}% 100%)`,
        }}
      >
        <div className="quarter-donut-center">
          {isLoading ? (
            <span aria-label={`${label} 불러오는 중`} className="donut-loading-value" role="status" />
          ) : (
            <>
              <strong>{percent}%</strong>
              <small>완료</small>
            </>
          )}
        </div>
      </div>
      <div>
        <strong>{label}</strong>
        {isLoading ? <span className="donut-loading-line" /> : <p aria-label={`완료 ${completed}건, 대상 ${total}건`}>{denominatorLabel}</p>}
        <small>{helper}</small>
      </div>
    </article>
  );
}

/**
 * @relatedFR FR-LEGAL-01, FR-BUS-01, FR-LEGAL-10
 * @relatedUI UI-LEGAL-01, UI-BUS-01
 * @description 완료 건수와 전체 건수로 대시보드 원형 그래프 비율을 계산한다.
 */
export function getCompletionPercent(completed: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/**
 * @relatedFR FR-LEGAL-01, FR-BUS-01, FR-LEGAL-10
 * @relatedUI UI-LEGAL-01, UI-BUS-01
 * @description 현재 날짜를 yy-n분기 형식으로 표시한다.
 */
function getCurrentQuarterLabel() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(2);
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  return `${year}-${quarter}분기`;
}
