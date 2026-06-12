/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description D1-EXT: 대시보드 분기별 연차료 바 차트용 KRW 추정치. 실제 납부액과 다를 수 있으며 참고용이다.
 * KR: 등록일 기준 4단계 누진 / US: 3.5·7.5·11.5년 유지료 / 그 외: 플랫 300,000원.
 */
export function estimateAnnualFeeKrw(
  country: string | null,
  registrationDate: string | null,
  applicationDate: string | null,
): number {
  const cc = (country ?? "").toUpperCase();
  const baseText = registrationDate ?? applicationDate;
  const baseMs = baseText ? new Date(baseText).getTime() : null;
  const ageYears = baseMs ? (Date.now() - baseMs) / (365.25 * 24 * 3_600_000) : 5;

  if (cc === "KR") {
    if (ageYears < 4) return 150_000;
    if (ageYears < 7) return 180_000;
    if (ageYears < 10) return 240_000;
    return 300_000;
  }
  if (cc === "US") {
    if (ageYears < 3.5) return 1_160_000;
    if (ageYears < 7.5) return 2_600_000;
    return 5_400_000;
  }
  return 300_000;
}

/**
 * @relatedFR FR-LEGAL-01
 * @relatedUI UI-LEGAL-01, UI-LEGAL-04, UI-BUS-03
 * @description 출원일 기준으로 매년 도래하는 다음 연차료 납부 기한을 계산한다.
 */
export function getNextAnnualFeeDueDate(
  applicationDateText: string,
  baseDate = new Date(),
  registrationDateText?: string | null,
) {
  // FEE-04: BE와 동일 기준 — 출원일 우선, 없으면 등록일로 폴백한다(FE가 출원일만 보던 불일치 해소).
  // 둘 다 유효하지 않으면 빈 문자열 유지(당해 12/31 폴백은 BE effective 필드를 정본으로 사용).
  const baseDateValue = parseDate(applicationDateText) ?? parseDate(registrationDateText);

  if (!baseDateValue) {
    return "";
  }

  const todayStart = getDateStart(baseDate);
  const dueDate = new Date(todayStart.getFullYear(), baseDateValue.getMonth(), baseDateValue.getDate());

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
