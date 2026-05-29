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
