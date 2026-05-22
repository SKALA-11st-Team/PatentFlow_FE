import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 20;

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI COMMON
 * @description 클라이언트에서 필터링된 목록을 20개 단위 페이지로 나누고 필터 변경 시 첫 페이지로 되돌린다.
 */
export function useClientPagination<T>(items: T[], resetKeys: unknown[], pageSize = DEFAULT_PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
    // resetKeys는 각 화면의 필터 조합을 그대로 전달받는 동적 dependency 목록입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetKeys);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return items.slice(startIndex, startIndex + pageSize);
  }, [currentPage, items, pageSize]);

  return {
    currentPage,
    pageSize,
    pagedItems,
    setCurrentPage,
    totalItems: items.length,
    totalPages,
  };
}
