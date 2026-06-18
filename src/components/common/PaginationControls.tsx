/**
 * @author 유건욱
 * @date 2026-05-06
 */
interface PaginationControlsProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI COMMON
 * @description 목록 하단에서 20개 단위 페이지 이동을 제공한다.
 */
export function PaginationControls({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
  totalPages,
}: PaginationControlsProps) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-controls">
      <span>
        {firstItem}-{lastItem} / {totalItems}
      </span>
      <div>
        <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} type="button">
          이전
        </button>
        <strong>
          {currentPage} / {totalPages}
        </strong>
        <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} type="button">
          다음
        </button>
      </div>
    </div>
  );
}
