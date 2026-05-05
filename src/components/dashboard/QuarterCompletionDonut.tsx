interface QuarterCompletionDonutProps {
  completed: number;
  helper: string;
  label: string;
  total: number;
}

/**
 * @relatedFR FR-001, FR-009, FR-012
 * @relatedUI UI-002, UI-006
 * @description 대시보드에서 이번 분기 대상 대비 완료 비율을 원형 그래프로 표시한다.
 */
export function QuarterCompletionDonut({ completed, helper, label, total }: QuarterCompletionDonutProps) {
  const percent = getCompletionPercent(completed, total);

  return (
    <article className="quarter-donut-card" aria-label={`${label} ${percent}%`}>
      <span>{getCurrentQuarterLabel()}</span>
      <div
        className="quarter-donut-ring"
        style={{
          background: `conic-gradient(var(--color-success) 0 ${percent}%, var(--color-bg-secondary) ${percent}% 100%)`,
        }}
      >
        <div className="quarter-donut-center">
          <strong>{percent}%</strong>
          <small>완료</small>
        </div>
      </div>
      <div>
        <strong>{label}</strong>
        <p>
          {completed} / {total}건
        </p>
        <small>{helper}</small>
      </div>
    </article>
  );
}

/**
 * @relatedFR FR-001, FR-009, FR-012
 * @relatedUI UI-002, UI-006
 * @description 완료 건수와 전체 건수로 대시보드 원형 그래프 비율을 계산한다.
 */
function getCompletionPercent(completed: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

/**
 * @relatedFR FR-001, FR-009, FR-012
 * @relatedUI UI-002, UI-006
 * @description 현재 날짜를 yy-n분기 형식으로 표시한다.
 */
function getCurrentQuarterLabel() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(2);
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  return `${year}-${quarter}분기`;
}
