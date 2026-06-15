import { describe, it, expect } from "vitest";
import { patentDetails } from "../mocks/patents.mock";
import { businessChecklistItems } from "../mocks/businessChecklist.mock";
import type { BusinessChecklistItem } from "../types/businessChecklist";
import {
  AI_SUGGESTED_SCORE_THRESHOLDS,
  CHECKLIST_ITEM_TO_AI_CATEGORY,
  createBusinessChecklistDraft,
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

// 동적 체크리스트 항목(BE DB)이 정적 mock과 다를 때 draft.responses가 모달 렌더 항목과
// 동일한 출처로 시드되는지 회귀 가드. (legal팀이 'CHK-XXXX' 항목을 추가/수정/삭제 가능)
describe("createBusinessChecklistDraft — 동적 항목 시드", () => {
  const patent = patentDetails[0];

  it("checklistItems가 전달되면 draft.responses가 그 동적 항목 ID로 시드된다", () => {
    const dynamicItems: BusinessChecklistItem[] = [
      {
        id: "CHK-ABCDEF12",
        category: "사업적 가치",
        title: "전략 부합도",
        description: "사업 전략 부합 정도",
        options: [{ score: 4, label: "높음" }, { score: 1, label: "낮음" }],
      },
      {
        id: "CHK-99887766",
        category: "기술적 가치",
        title: "구현 난이도",
        description: "회피 구현 난이도",
        options: [{ score: 4, label: "높음" }, { score: 1, label: "낮음" }],
      },
    ];

    const draft = createBusinessChecklistDraft(patent, dynamicItems);

    expect(draft.responses.map((response) => response.itemId)).toEqual(["CHK-ABCDEF12", "CHK-99887766"]);
  });

  it("checklistItems 미전달/빈 배열이면 정적 mock 항목으로 폴백한다", () => {
    const mockIds = businessChecklistItems.map((item) => item.id);

    expect(createBusinessChecklistDraft(patent).responses.map((response) => response.itemId)).toEqual(mockIds);
    expect(createBusinessChecklistDraft(patent, []).responses.map((response) => response.itemId)).toEqual(mockIds);
  });
});
