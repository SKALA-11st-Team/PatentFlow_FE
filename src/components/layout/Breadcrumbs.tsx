/**
 * @author 유건욱
 * @date 2026-06-11
 */
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 상세/편집 등 깊은 화면에서 현재 위치와 상위 경로를 보여주는 공통 브레드크럼.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="현재 위치" className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li aria-current={isLast ? "page" : undefined} key={`${item.label}-${index}`}>
              {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
