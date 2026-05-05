import { Badge } from "../common/Badge";
import { REVIEW_WORKFLOW_PROGRESS_STATUSES, reviewWorkflowStatusLabels } from "../../constants/status";
import type { PatentListItem, ReviewWorkflowStatus } from "../../types/patent";

interface WorkflowProgressItem {
  status: ReviewWorkflowStatus;
  count: number;
  rawPercent: number;
  percent: number;
}

/**
 * @relatedFR FR-001, FR-012
 * @relatedUI UI-002
 * @description 관리자 대시보드에서 이번 분기 workflow 병목과 단계별 흐름을 표시한다.
 */
export function WorkflowBottleneckOverview({ quarterlyTargets }: { quarterlyTargets: PatentListItem[] }) {
  const quarterlyTargetCount = quarterlyTargets.length;
  const workflowProgress = getWorkflowProgress(quarterlyTargets);

  return (
    <section className="section workflow-overview-section">
      <div className="section-header">
        <div>
          <h2>이번 분기 병목 현황</h2>
          <p>미완료 특허가 가장 많이 쌓인 단계를 먼저 보고, 아래 흐름에서 전체 분포를 확인합니다.</p>
        </div>
        <Badge tone="primary">{quarterlyTargetCount}건 진행 중</Badge>
      </div>

      {/*
        병목 Top 3 카드는 화면 밀도 이슈로 임시 비활성화했습니다.
        다시 사용할 때는 BottleneckRanking 컴포넌트를 import한 뒤 아래처럼 렌더링하세요.
        <BottleneckRanking workflowProgress={workflowProgress} />
      */}

      <div className="workflow-flow" aria-label="이번 분기 단계별 흐름">
        {workflowProgress.map((item, index) => (
          <article className={item.count > 0 ? "workflow-flow-node" : "workflow-flow-node is-empty"} key={item.status}>
            <span className="workflow-flow-step">{index + 1}</span>
            <strong>{item.count}</strong>
            <p>{reviewWorkflowStatusLabels[item.status]}</p>
            <small>{formatPercent(item.count, quarterlyTargetCount)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * @relatedFR FR-001, FR-012
 * @relatedUI UI-002
 * @description 이번 분기 검토 대상 특허를 workflow 단계별 처리 현황 데이터로 집계한다.
 */
function getWorkflowProgress(quarterlyTargets: PatentListItem[]): WorkflowProgressItem[] {
  const counts = REVIEW_WORKFLOW_PROGRESS_STATUSES.map((status) => ({
    status,
    count: quarterlyTargets.filter((patent) => patent.reviewWorkflowStatus === status).length,
  }));
  const total = quarterlyTargets.length;

  return counts.map(({ status, count }) => {
    const rawPercent = total === 0 ? 0 : (count / total) * 100;

    return {
      status,
      count,
      rawPercent,
      percent: count === 0 ? 0 : Math.max(rawPercent, 3),
    };
  });
}

function formatPercent(value: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}
