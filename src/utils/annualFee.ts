/**
 * @author 유건욱
 * @date 2026-05-06
 */
export type CurrencyCode = "KRW" | "USD" | "JPY" | "CNY" | "EUR";

export interface AnnualFeeEstimate {
  currency: CurrencyCode;
  /** 해당 국가 통화 기준 추정 연차료(원화 환산 전). */
  nativeAmount: number;
}

/**
 * 문서 기준 환율(통화 1단위당 KRW). 실시간 환율 조회 실패 시 폴백으로 사용한다.
 * @see src/api/exchangeRate.ts (실시간 환율 조회 및 폴백)
 */
export const DOCUMENTED_FX_RATES: Record<CurrencyCode, number> = {
  KRW: 1,
  USD: 1_350,
  JPY: 9,
  CNY: 190,
  EUR: 1_500,
};

export const FX_CURRENCY_LABELS: Record<CurrencyCode, string> = {
  KRW: "원화 (KRW)",
  USD: "미국 달러 (USD)",
  JPY: "일본 엔 (JPY)",
  CNY: "중국 위안 (CNY)",
  EUR: "유로 (EUR)",
};

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description FEE-06 국가별 기준에 따른 연차료 추정치를 '국가 통화 + 금액'으로 반환한다.
 * KR: 등록일 기준 누진(KRW) / US: 3.5·7.5·11.5년 유지료(USD) / JP·CN·EP: 출원일 기준 누진(JPY·CNY·EUR) /
 * 기타: 300,000원 플랫. 원화 환산은 estimateAnnualFeeKrw가 환율을 곱해 처리한다(실시간/폴백).
 */
export function estimateAnnualFee(
  country: string | null,
  registrationDate: string | null,
  applicationDate: string | null,
): AnnualFeeEstimate {
  const cc = (country ?? "").toUpperCase();
  const baseText = registrationDate ?? applicationDate;
  const baseMs = baseText ? new Date(baseText).getTime() : null;
  const ageYears = baseMs ? (Date.now() - baseMs) / (365.25 * 24 * 3_600_000) : 5;

  if (cc === "KR") {
    // 등록일 기준, 1~3년차 설정등록료 일괄 / 이후 매년 누진 (KRW)
    if (ageYears < 4) return { currency: "KRW", nativeAmount: 150_000 };
    if (ageYears < 7) return { currency: "KRW", nativeAmount: 180_000 };
    if (ageYears < 10) return { currency: "KRW", nativeAmount: 240_000 };
    return { currency: "KRW", nativeAmount: 300_000 };
  }
  if (cc === "US") {
    // 등록일 기준 3.5 / 7.5 / 11.5년 유지료 (소규모 법인 기준, USD)
    if (ageYears < 3.5) return { currency: "USD", nativeAmount: 1_000 };
    if (ageYears < 7.5) return { currency: "USD", nativeAmount: 1_880 };
    return { currency: "USD", nativeAmount: 3_850 };
  }
  if (cc === "JP") {
    // 출원일 기준 매년, 청구항 10개 기준 특허료 (JPY)
    if (ageYears < 4) return { currency: "JPY", nativeAmount: 33_000 };   // 설정등록 1~3년차 일괄 구간
    if (ageYears < 7) return { currency: "JPY", nativeAmount: 60_000 };
    if (ageYears < 10) return { currency: "JPY", nativeAmount: 110_000 };
    return { currency: "JPY", nativeAmount: 180_000 };
  }
  if (cc === "CN") {
    // 출원일 기준 매년, 발명특허 年费 (CNY)
    if (ageYears < 4) return { currency: "CNY", nativeAmount: 900 };
    if (ageYears < 7) return { currency: "CNY", nativeAmount: 1_200 };
    if (ageYears < 10) return { currency: "CNY", nativeAmount: 2_000 };
    if (ageYears < 13) return { currency: "CNY", nativeAmount: 4_000 };
    return { currency: "CNY", nativeAmount: 6_000 };
  }
  if (cc === "EP") {
    // EPO 출원일 기준 매년 renewal fee (EUR)
    if (ageYears < 4) return { currency: "EUR", nativeAmount: 470 };
    if (ageYears < 7) return { currency: "EUR", nativeAmount: 800 };
    if (ageYears < 10) return { currency: "EUR", nativeAmount: 1_400 };
    return { currency: "EUR", nativeAmount: 2_000 };
  }
  return { currency: "KRW", nativeAmount: 300_000 };
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description 국가별 추정 연차료를 환율로 곱해 KRW 추정치로 환산한다. rates 미지정 시 문서 기준 환율을 사용한다.
 */
export function estimateAnnualFeeKrw(
  country: string | null,
  registrationDate: string | null,
  applicationDate: string | null,
  rates: Partial<Record<CurrencyCode, number>> = DOCUMENTED_FX_RATES,
): number {
  const { currency, nativeAmount } = estimateAnnualFee(country, registrationDate, applicationDate);
  const rate = rates[currency] ?? DOCUMENTED_FX_RATES[currency] ?? 1;
  return Math.round(nativeAmount * rate);
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
