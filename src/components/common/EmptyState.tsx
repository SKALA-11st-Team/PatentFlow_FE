/**
 * @author 유건욱
 * @date 2026-06-11
 */
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 데이터 부재 상태를 일관된 카드형으로 표시하는 공통 컴포넌트(목록/레포트/이력 공용).
 * 기존 인라인 문구용 .empty-state(p 태그)와 구분되는 카드형 표시다.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state-card">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
