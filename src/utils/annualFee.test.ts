import { describe, it, expect } from "vitest";
import { getNextAnnualFeeDueDate, getRemainingDaysUntilDate } from "./annualFee";

describe("annualFee Utils", () => {
  describe("getNextAnnualFeeDueDate", () => {
    it("출원일의 월일을 기준으로 올해 납부 기한을 반환한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getNextAnnualFeeDueDate("2021-05-20", baseDate)).toBe("2024-05-20");
    });

    it("올해 출원일 월일이 지난 경우 다음 해 납부 기한을 반환한다", () => {
      const baseDate = new Date("2024-06-01");
      expect(getNextAnnualFeeDueDate("2020-05-19", baseDate)).toBe("2025-05-19");
    });

    it("오늘이 납부 기한인 경우 오늘 날짜를 반환한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getNextAnnualFeeDueDate("2020-05-19", baseDate)).toBe("2024-05-19");
    });

    it("등록일이 아닌 출원일을 넘겼을 때 등록일 월일로 보정하지 않는다", () => {
      const baseDate = new Date("2024-05-19");
      const applicationDate = "2020-02-10";
      const registrationDate = "2021-11-30";

      expect(getNextAnnualFeeDueDate(applicationDate, baseDate)).toBe("2025-02-10");
      expect(getNextAnnualFeeDueDate(applicationDate, baseDate)).not.toBe(getNextAnnualFeeDueDate(registrationDate, baseDate));
    });

    it("잘못된 날짜 형식이 입력되면 빈 문자열을 반환한다", () => {
      expect(getNextAnnualFeeDueDate("invalid-date")).toBe("");
      expect(getNextAnnualFeeDueDate("")).toBe("");
      // @ts-expect-error: intentional null test
      expect(getNextAnnualFeeDueDate(null)).toBe("");
    });

    it("존재하지 않는 날짜(예: 2월 30일)가 입력되면 빈 문자열을 반환한다", () => {
      expect(getNextAnnualFeeDueDate("2024-02-30")).toBe("");
    });

    // FEE-04: 출원일이 없으면 등록일로 폴백한다(BE applicationDate ?? registrationDate와 정합).
    it("출원일이 비어 있으면 등록일 기준으로 계산한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getNextAnnualFeeDueDate("", baseDate, "2020-03-10")).toBe("2025-03-10");
    });

    it("출원일·등록일이 모두 없으면 빈 문자열을 유지한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getNextAnnualFeeDueDate("", baseDate, null)).toBe("");
    });

  });

  describe("getRemainingDaysUntilDate", () => {
    it("미래 날짜까지 남은 일수를 정확히 계산한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getRemainingDaysUntilDate("2024-05-20", baseDate)).toBe(1);
    });

    it("이미 지난 날짜인 경우 음수 값을 반환한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getRemainingDaysUntilDate("2024-05-18", baseDate)).toBe(-1);
    });

    it("오늘인 경우 0을 반환한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getRemainingDaysUntilDate("2024-05-19", baseDate)).toBe(0);
    });

    // 파싱 실패는 null로 반환해 '오늘 마감'(유효 0)과 구분한다(D-day 오표시 방지).
    it("형식이 잘못된 날짜는 0이 아닌 null을 반환한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getRemainingDaysUntilDate("invalid", baseDate)).toBeNull();
      expect(getRemainingDaysUntilDate("2024-13-99", baseDate)).toBeNull();
      expect(getRemainingDaysUntilDate("", baseDate)).toBeNull();
    });
  });
});
