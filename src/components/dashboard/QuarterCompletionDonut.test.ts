import { describe, it, expect } from "vitest";
import { getCompletionPercent } from "./QuarterCompletionDonut";

// 분모가 '현재 조회 기준 대상 건수'라 필터/집계 타이밍에 따라 일시적으로 completed > total이
// 발생할 수 있다. 이 경우에도 퍼센트 라벨과 conic-gradient stop이 0~100 범위를 벗어나지 않아야 한다.
describe("getCompletionPercent — 0~100 클램프 회귀 가드", () => {
  it("total<=0이면 0을 반환한다", () => {
    expect(getCompletionPercent(0, 0)).toBe(0);
    expect(getCompletionPercent(5, 0)).toBe(0);
    expect(getCompletionPercent(3, -2)).toBe(0);
  });

  it("정상 범위는 반올림한 퍼센트를 반환한다", () => {
    expect(getCompletionPercent(0, 10)).toBe(0);
    expect(getCompletionPercent(1, 4)).toBe(25);
    expect(getCompletionPercent(1, 3)).toBe(33);
    expect(getCompletionPercent(10, 10)).toBe(100);
  });

  it("completed > total인 비정상 집계도 100을 초과하지 않는다", () => {
    expect(getCompletionPercent(12, 10)).toBe(100);
    expect(getCompletionPercent(1, 0.0001)).toBe(100);
  });

  it("음수 completed도 0 미만으로 내려가지 않는다", () => {
    expect(getCompletionPercent(-5, 10)).toBe(0);
  });
});
