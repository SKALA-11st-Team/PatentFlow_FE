export interface FeeExchangeRates {
  USD: number;
  JPY: number;
  CNY: number;
  EUR: number;
}

export const DEFAULT_FEE_EXCHANGE_RATES: FeeExchangeRates = { USD: 1_350, JPY: 9, CNY: 190, EUR: 1_500 };

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description D1-EXT: 대시보드 분기별 연차료 바 차트용 KRW 추정치. 실제 납부액과 다를 수 있으며 참고용이다.
 * KR: 등록일 기준 누진 / US: 3.5·7.5·11.5년 3단계 / JP: 출원일 기준 4단계 누진 /
 * CN: 출원일 기준 5단계 누진 / EP: 출원일 기준 4단계 누진 / 기타: 300,000원 플랫.
 *
 * rates 미전달 시 DEFAULT_FEE_EXCHANGE_RATES(JPY 9 / CNY 190 / EUR 1,500 / USD 1,350) 사용.
 */
export function estimateAnnualFeeKrw(
  country: string | null,
  registrationDate: string | null,
  applicationDate: string | null,
  rates?: FeeExchangeRates,
): number {
  const { USD, JPY, CNY, EUR } = rates ?? DEFAULT_FEE_EXCHANGE_RATES;
  const cc = (country ?? "").toUpperCase();
  // FEE-04: 국가별 기산일을 BE annualFeeBaseDate와 정합 — KR/US는 등록일 우선(등록일 기준),
  // 그 외(JP/CN/EP/기타)는 출원일 우선(출원일 기준).
  const registrationBased = cc === "KR" || cc === "US";
  const baseText = registrationBased
    ? registrationDate ?? applicationDate
    : applicationDate ?? registrationDate;
  const baseMs = baseText ? new Date(baseText).getTime() : null;
  const ageYears = baseMs ? (Date.now() - baseMs) / (365.25 * 24 * 3_600_000) : 5;

  if (cc === "KR") {
    if (ageYears < 4) return 150_000;
    if (ageYears < 7) return 180_000;
    if (ageYears < 10) return 240_000;
    return 300_000;
  }
  if (cc === "US") {
    // 소규모 법인 기준 USD 유지료
    const usd = ageYears < 3.5 ? 860 : ageYears < 7.5 ? 1_930 : 4_000;
    return Math.round(usd * USD);
  }
  if (cc === "JP") {
    // 청구항 10개 기준 JPY 특허료
    const jpy = ageYears < 4 ? 33_000 : ageYears < 7 ? 61_000 : ageYears < 10 ? 111_000 : 178_000;
    return Math.round(jpy * JPY);
  }
  if (cc === "CN") {
    // 발명특허 年费 CNY
    const cny = ageYears < 4 ? 900 : ageYears < 7 ? 1_200 : ageYears < 10 ? 2_000 : ageYears < 13 ? 4_000 : 6_000;
    return Math.round(cny * CNY);
  }
  if (cc === "EP") {
    // EPO renewal fee EUR
    const eur = ageYears < 4 ? 470 : ageYears < 7 ? 800 : ageYears < 10 ? 1_400 : 2_000;
    return Math.round(eur * EUR);
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
  // FEE-04: 국가 무관 출원일 우선, 없으면 등록일로 폴백한다(FE가 출원일만 보던 불일치 해소).
  // KR/US는 BE annualFeeBaseDate가 등록일을 우선하므로 등록일·출원일 월일이 다르면 BE와 어긋날 수 있다 —
  // BE feeDueDate가 정본이고 이 값은 BE feeDueDate가 비어 있을 때의 폴백/등록 폼 프리뷰로만 쓴다.
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
 * 파싱 실패 시 null을 반환한다(유효 입력 '오늘 마감'=0과 구분해야 호출처가 D-day 오표시를 막을 수 있다).
 */
export function getRemainingDaysUntilDate(dueDateText: string, baseDate = new Date()): number | null {
  const todayStart = getDateStart(baseDate);
  const dueDate = parseDate(dueDateText);

  if (!dueDate) {
    return null;
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
