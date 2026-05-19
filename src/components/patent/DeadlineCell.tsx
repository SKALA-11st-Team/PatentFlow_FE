import { getRemainingDaysUntilDate } from "../../utils/annualFee";

interface DeadlineCellProps {
  dueDate: string | null | undefined;
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-01, UI-BUS-01
 * @description 특허 마감 기한을 D-n, yy-mm-dd 2줄 형식으로 표시한다.
 */
export function DeadlineCell({ dueDate }: DeadlineCellProps) {
  if (!dueDate) return <span className="deadline-cell"><strong>-</strong></span>;
  return (
    <span className="deadline-cell">
      <strong>{formatRemainingDays(dueDate)}</strong>
      <small>{formatShortDate(dueDate)}</small>
    </span>
  );
}

function formatShortDate(dateText: string) {
  return dateText.slice(2);
}

function formatRemainingDays(dueDateText: string) {
  const remainingDays = getRemainingDaysUntilDate(dueDateText);

  if (remainingDays === 0) {
    return "D-day";
  }

  return remainingDays > 0 ? `D-${remainingDays}` : `D+${Math.abs(remainingDays)}`;
}
