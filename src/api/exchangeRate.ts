/**
 * @author 유건욱
 * @date 2026-06-13
 */
import { DOCUMENTED_FX_RATES, type CurrencyCode } from "../utils/annualFee";

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description 분기별 예상 연차료의 외화 환산에 사용할 실시간 환율을 조회한다.
 * 외부 keyless FX API(open.er-api.com, USD 기준)를 사용하며, 실패 시 문서 기준 환율로 폴백한다.
 */

export type FxRates = Record<CurrencyCode, number>;

export interface ExchangeRateInfo {
  /** 통화 1단위당 KRW 환율. */
  rates: FxRates;
  /** 환율 출처 표기(API명 또는 폴백). */
  source: string;
  /** 환율 기준 시각(UTC 문자열). 폴백이면 null. */
  asOf: string | null;
  /** 실시간 조회 실패로 문서 기준 환율을 사용했는지 여부. */
  isFallback: boolean;
}

const FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

/** open.er-api.com USD 기준 응답으로부터 통화→KRW 환율을 계산한다(1 USD = rates.KRW 원). */
function deriveKrwRates(usdBased: Record<string, number>): FxRates {
  const krwPerUsd = usdBased.KRW;
  const perUnit = (code: string) => {
    const unitsPerUsd = usdBased[code];
    if (!krwPerUsd || !unitsPerUsd) {
      return DOCUMENTED_FX_RATES[code as CurrencyCode];
    }
    return krwPerUsd / unitsPerUsd;
  };
  return {
    KRW: 1,
    USD: krwPerUsd || DOCUMENTED_FX_RATES.USD,
    JPY: perUnit("JPY"),
    CNY: perUnit("CNY"),
    EUR: perUnit("EUR"),
  };
}

/**
 * @relatedFR FR-LEGAL-24
 * @relatedUI UI-LEGAL-01
 * @description 실시간 환율을 조회한다. 네트워크/모의 환경 등 실패 시 문서 기준 환율로 폴백한다.
 */
export async function getExchangeRates(): Promise<ExchangeRateInfo> {
  try {
    const response = await fetch(FX_ENDPOINT);
    if (!response.ok) {
      throw new Error(`FX HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    if (data.result !== "success" || !data.rates || !data.rates.KRW) {
      throw new Error("FX payload invalid");
    }
    return {
      rates: deriveKrwRates(data.rates),
      source: "open.er-api.com",
      asOf: data.time_last_update_utc ?? null,
      isFallback: false,
    };
  } catch {
    return {
      rates: { ...DOCUMENTED_FX_RATES },
      source: "문서 기준 환율 (폴백)",
      asOf: null,
      isFallback: true,
    };
  }
}
