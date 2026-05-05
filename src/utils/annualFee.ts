/**
 * @relatedFR FR-001
 * @relatedUI UI-002, UI-005
 * @description 등록일 기준 첫 3년 후, 이후 매년 도래하는 다음 연차료 납부 기한을 계산한다.
 */
export function getNextAnnualFeeDueDate(registrationDateText: string, baseDate = new Date()) {
  const registrationDate = parseDate(registrationDateText);
  const todayStart = getDateStart(baseDate);
  const dueDate = new Date(registrationDate.getFullYear() + 3, registrationDate.getMonth(), registrationDate.getDate());

  while (dueDate.getTime() < todayStart.getTime()) {
    dueDate.setFullYear(dueDate.getFullYear() + 1);
  }

  return formatDate(dueDate);
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-002
 * @description 현재 날짜 기준 납부 기한까지 남은 일수를 계산한다.
 */
export function getRemainingDaysUntilDate(dueDateText: string, baseDate = new Date()) {
  const todayStart = getDateStart(baseDate);
  const dueDate = parseDate(dueDateText);

  return Math.ceil((dueDate.getTime() - todayStart.getTime()) / 86_400_000);
}

function parseDate(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDateStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
