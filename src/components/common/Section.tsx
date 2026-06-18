/**
 * @author 유건욱
 * @date 2026-05-06
 */
import type { ReactNode } from "react";

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 제목·설명·액션 영역을 갖춘 공통 섹션 레이아웃 컴포넌트.
 */
interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Section({ title, description, children, actions }: SectionProps) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="section-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
