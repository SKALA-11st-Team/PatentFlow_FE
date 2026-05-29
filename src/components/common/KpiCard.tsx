import { Link } from "react-router-dom";

interface KpiCardProps {
  denominator?: number;
  helper?: string;
  isLoading?: boolean;
  isSelected?: boolean;
  label: string;
  onClick?: () => void;
  to?: string;
  tone?: string;
  value: number;
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-BUS-01, FR-LEGAL-10
 * @relatedUI UI-LEGAL-01, UI-BUS-01
 * @description 관리자/사업부 대시보드 KPI 값을 표시하고 선택적으로 화면 이동 또는 대시보드 내부 필터 액션을 실행한다.
 */
export function KpiCard({
  denominator,
  helper,
  isLoading = false,
  isSelected = false,
  label,
  onClick,
  to,
  value,
  tone = "neutral",
}: KpiCardProps) {
  const className = `kpi-card kpi-${tone}${to || onClick ? " kpi-card-button" : ""}${isSelected ? " selected-kpi-card" : ""}`;
  const content = (
    <>
      <span className="kpi-card-title">{label}</span>
      {isLoading ? (
        <span aria-label={`${label} 불러오는 중`} className="kpi-loading-value" role="status" />
      ) : (
        <strong>
          {value}
          {denominator === undefined ? null : <small className="kpi-denominator"> / {denominator}</small>}
        </strong>
      )}
      {helper ? <small>{helper}</small> : null}
    </>
  );

  return to ? (
    <Link className={className} to={to}>
      {content}
    </Link>
  ) : onClick ? (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  ) : (
    <article className={className}>{content}</article>
  );
}
