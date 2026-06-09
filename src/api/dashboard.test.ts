import { describe, it, expect } from "vitest";
import { getLegalDashboardSummary } from "./dashboard";

// DASH-05: KPI 단일 출처(요약) 회귀 가드. mock 모드(백엔드 미설정)에서 요약 필드 간 정합 불변식을 고정한다.
describe("dashboard API — DASH-01 KPI 단일 출처", () => {
  it("quarterlyTargetCount는 하위 분모(대기/회신/접수)의 합 이상이고 전체 특허 이하이다", async () => {
    const summary = await getLegalDashboardSummary();

    // 이번 분기 검토 대상(NOT_IN_REVIEW 제외)은 메일대기·응답대기·접수 상태를 모두 포함 → 부분합 이상
    const subset =
      summary.pendingReview + summary.waitingBusinessResponse + summary.businessResponseReceived;
    expect(summary.quarterlyTargetCount).toBeGreaterThanOrEqual(subset);
    expect(summary.quarterlyTargetCount).toBeLessThanOrEqual(summary.totalPatents);

    // 최종 판단 대기는 사업부 응답 접수분 중 미결정 → 접수 수 이하
    expect(summary.pendingFinalDecision).toBeLessThanOrEqual(summary.businessResponseReceived);
  });
});
