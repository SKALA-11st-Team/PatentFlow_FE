import { describe, it, expect } from "vitest";
import {
  AI_SUGGESTED_SCORE_THRESHOLDS,
  CHECKLIST_ITEM_TO_AI_CATEGORY,
  DEFAULT_AI_SUGGESTED_SCORE,
  suggestedScoreFromRepresentative,
} from "./businessChecklist";

// BIZ-07: 임계값·매핑이 명명 상수로 외부화됐고 경계값 환산이 안정적인지 회귀 가드.
describe("businessChecklist — AI 제안 점수 환산(BIZ-07)", () => {
  it("0~100 대표 점수를 임계값(80/65/45) 경계 기준으로 1~4로 환산한다", () => {
    expect(suggestedScoreFromRepresentative(80)).toBe(4);
    expect(suggestedScoreFromRepresentative(79.9)).toBe(3);
    expect(suggestedScoreFromRepresentative(65)).toBe(3);
    expect(suggestedScoreFromRepresentative(64.9)).toBe(2);
    expect(suggestedScoreFromRepresentative(45)).toBe(2);
    expect(suggestedScoreFromRepresentative(44.9)).toBe(1);
    expect(suggestedScoreFromRepresentative(1)).toBe(1);
  });

  it("점수 미상(0/null/undefined)은 중립값을 반환한다", () => {
    expect(suggestedScoreFromRepresentative(0)).toBe(DEFAULT_AI_SUGGESTED_SCORE);
    expect(suggestedScoreFromRepresentative(null)).toBe(DEFAULT_AI_SUGGESTED_SCORE);
    expect(suggestedScoreFromRepresentative(undefined)).toBe(DEFAULT_AI_SUGGESTED_SCORE);
  });

  it("항목→AI 카테고리 매핑이 정의대로 고정된다", () => {
    expect(CHECKLIST_ITEM_TO_AI_CATEGORY.TECH_COMPLETENESS).toBe("TECHNOLOGY");
    expect(CHECKLIST_ITEM_TO_AI_CATEGORY.TECH_ORIGINALITY).toBe("TECHNOLOGY");
    expect(CHECKLIST_ITEM_TO_AI_CATEGORY.MARKETABILITY).toBe("MARKET");
    expect(CHECKLIST_ITEM_TO_AI_CATEGORY.EXPECTED_EFFECT).toBe("BUSINESS_ALIGNMENT");
  });

  it("임계값은 내림차순으로 정렬돼 있다(find 단락 평가 가정)", () => {
    const mins = AI_SUGGESTED_SCORE_THRESHOLDS.map((threshold) => threshold.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
  });
});
