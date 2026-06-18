/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 테이블 로딩 중 스켈레톤 행을 표시하는 공통 컴포넌트.
 * @author 유건욱
 * @date 2026-05-29
 */
interface TableLoadingRowsProps {
  columns: number;
  rows?: number;
}

export function TableLoadingRows({
  columns,
  rows = 5,
}: TableLoadingRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr aria-hidden="true" className="table-loading-row" key={rowIndex}>
          <td colSpan={columns}>
            <div className="table-loading-cell">
              <span className="table-loading-bar table-loading-bar-main" />
              <span className="table-loading-bar table-loading-bar-sub" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
