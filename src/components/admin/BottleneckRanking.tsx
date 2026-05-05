import {
  reviewWorkflowStatusLabels,
  workflowBottleneckDescriptions,
  workflowStageActions,
  workflowUrgencyRank,
} from "../../constants/status";
import type { ReviewWorkflowStatus } from "../../types/patent";

interface WorkflowProgressItem {
  status: ReviewWorkflowStatus;
  count: number;
  percent: number;
  rawPercent: number;
}

/**
 * @relatedFR FR-001, FR-012
 * @relatedUI UI-002
 * @description 관리자 대시보드에서 미완료 workflow 병목 Top 3를 순위 카드로 표시한다.
 */
export function BottleneckRanking({ workflowProgress }: { workflowProgress: WorkflowProgressItem[] }) {
  const bottleneckItems = getBottleneckItems(workflowProgress);

  return (
    <div className="bottleneck-ranking">
      {bottleneckItems.map((item) => (
        <article className="bottleneck-rank-card" key={item.status}>
          <span className="bottleneck-rank-number">{item.rank}</span>
          <div>
            <small>{workflowStageActions[item.status]}</small>
            <strong>{reviewWorkflowStatusLabels[item.status]}</strong>
            <p>{item.description}</p>
          </div>
          <b>{item.count}건</b>
        </article>
      ))}
    </div>
  );
}

/**
 * @relatedFR FR-001, FR-012
 * @relatedUI UI-002
 * @description 관리자 대시보드 병목 Top 3 후보를 미완료 단계 기준으로 산출한다.
 */
function getBottleneckItems(workflowProgress: WorkflowProgressItem[]) {
  return workflowProgress
    .filter((item) => item.status !== "LEGAL_ACTION_RECORDED")
    .sort((firstItem, secondItem) => {
      if (secondItem.count !== firstItem.count) {
        return secondItem.count - firstItem.count;
      }

      return workflowUrgencyRank[firstItem.status] - workflowUrgencyRank[secondItem.status];
    })
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      description: workflowBottleneckDescriptions[item.status],
    }));
}
