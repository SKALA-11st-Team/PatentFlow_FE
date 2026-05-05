import { Badge } from "../common/Badge";
import type { ReviewWorkflowStatus } from "../../types/patent";
import { getReviewWorkflowTone, reviewWorkflowStatusLabels } from "../../constants/status";

interface WorkflowStatusBadgeProps {
  status: ReviewWorkflowStatus;
}

/**
 * @relatedFR FR-001, FR-011, FR-012
 * @relatedUI UI-002, UI-005
 * @description 특허 검토 workflow 상태를 일관된 배지 색상과 라벨로 표시한다.
 */
export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  return <Badge tone={getReviewWorkflowTone(status)}>{reviewWorkflowStatusLabels[status]}</Badge>;
}
