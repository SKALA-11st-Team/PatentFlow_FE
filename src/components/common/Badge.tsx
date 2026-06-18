/**
 * @author 유건욱
 * @date 2026-05-06
 */
import type { ReactNode } from "react";

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 상태·권고 등을 톤별로 표시하는 공통 배지 컴포넌트.
 */
interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
