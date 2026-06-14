import { describe, it, expect } from "vitest";
import { normalizeNumberInput } from "./MailSettingsSection";

// fe-admin-settings-6: type=number 입력의 빈/중간 입력이 NaN으로 state에 들어가면
// 저장 비활성 비교를 통과하고 JSON.stringify에서 null로 직렬화되어 BE int 바인딩 400을 유발한다.
// 정규화가 항상 [min, max] 범위의 유한 정수를 반환하는지 회귀 가드.
describe("MailSettingsSection — normalizeNumberInput(fe-admin-settings-6)", () => {
  it("빈 문자열/비숫자/중간 입력은 min으로 정규화한다", () => {
    expect(normalizeNumberInput("", 0, 24)).toBe(0);
    expect(normalizeNumberInput("abc", 0, 24)).toBe(0);
    expect(normalizeNumberInput("1e", 0, 24)).toBe(0);
    expect(normalizeNumberInput("-", 0, 24)).toBe(0);
  });

  it("정상 입력은 정수로 절단하여 그대로 반환한다", () => {
    expect(normalizeNumberInput("3", 0, 24)).toBe(3);
    expect(normalizeNumberInput("3.7", 0, 24)).toBe(3);
  });

  it("범위 밖 값은 [min, max]로 클램프한다", () => {
    expect(normalizeNumberInput("99", 0, 24)).toBe(24);
    expect(normalizeNumberInput("-5", 0, 24)).toBe(0);
    expect(normalizeNumberInput("31", 0, 30)).toBe(30);
  });

  it("반환값은 항상 유한수라 JSON 직렬화 시 null이 되지 않는다", () => {
    const value = normalizeNumberInput("", 0, 12);
    expect(Number.isFinite(value)).toBe(true);
    expect(JSON.parse(JSON.stringify({ months: value })).months).toBe(0);
  });
});
