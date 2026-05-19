import { describe, it, expect } from "vitest";
import { getNextAnnualFeeDueDate, getRemainingDaysUntilDate } from "./annualFee";

describe("annualFee Utils", () => {
  describe("getNextAnnualFeeDueDate", () => {
    it("등록일로부터 3년 후의 날짜를 기본 납부 기한으로 반환한다", () => {
      // 2024-05-19 등록 -> 3년 후인 2027-05-19가 납부 기한
      const baseDate = new Date("2024-05-19");
      expect(getNextAnnualFeeDueDate("2024-05-19", baseDate)).toBe("2027-05-19");
    });

    it("이미 3년이 지난 경우, 매년 도래하는 다음 납부 기한을 반환한다", () => {
      // 2020-05-19 등록 -> 1차(2023), 2차(2024), 3차(2025) ... 
      // 현재가 2024-06-01이면 다음 기한은 2025-05-19
      const baseDate = new Date("2024-06-01");
      expect(getNextAnnualFeeDueDate("2020-05-19", baseDate)).toBe("2025-05-19");
    });

    it("오늘이 납부 기한인 경우 오늘 날짜를 반환한다", () => {
      const baseDate = new Date("2024-05-19");
      expect(getNextAnnualFeeDueDate("2021-05-19", baseDate)).toBe("2024-05-19");
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
  });
});
