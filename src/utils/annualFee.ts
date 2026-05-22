/**
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01, UI-LEGAL-04, UI-BUS-03
 * @description 등록일 기준 첫 3년 후, 이후 매년 도래하는 다음 연차료 납부 기한을 계산한다.
 */
export function getNextAnnualFeeDueDate(registrationDateText: string, baseDate = new Date()) {
  const registrationDate = parseDate(registrationDateText);
  
  if (!registrationDate) {
    // 유효하지 않은 날짜인 경우 계산이 불가능하므로 빈 문자열 반환
    return "";
  }

  const todayStart = getDateStart(baseDate);
  const dueDate = new Date(registrationDate.getFullYear() + 3, registrationDate.getMonth(), registrationDate.getDate());

  while (dueDate.getTime() < todayStart.getTime()) {
    dueDate.setFullYear(dueDate.getFullYear() + 1);
  }

  return formatDate(dueDate);
}

/**
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-BUS-01, UI-BUS-02
 * @description 현재 날짜 기준 납부 기한까지 남은 일수를 계산한다.
 */
export function getRemainingDaysUntilDate(dueDateText: string, baseDate = new Date()) {
  const todayStart = getDateStart(baseDate);
  const dueDate = parseDate(dueDateText);

  if (!dueDate) {
    return 0;
  }

  return Math.ceil((dueDate.getTime() - todayStart.getTime()) / 86_400_000);
}

function parseDate(dateText: string | null | undefined): Date | null {
  if (!dateText || typeof dateText !== "string") {
    return null;
  }

  const parts = dateText.split("-");
  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts.map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  
  // Date 객체의 특성상 2024-02-30 같은 입력도 유효하게 처리될 수 있으므로 실제 값이 일치하는지 확인
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
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
