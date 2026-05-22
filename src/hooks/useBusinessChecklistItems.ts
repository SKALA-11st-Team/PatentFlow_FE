import { useEffect, useState } from "react";
import { getBusinessChecklistItems } from "../api/businessChecklist";
import type { BusinessChecklistItem } from "../types/businessChecklist";

/**
 * @relatedFR FR-BUS-01, FR-BUS-04
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03, UI-BUS-05
 * @description 사업부 의견 화면들이 백엔드 체크리스트 항목 API를 공통으로 조회하도록 돕는다.
 */
export function useBusinessChecklistItems() {
  const [items, setItems] = useState<BusinessChecklistItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getBusinessChecklistItems()
      .then((nextItems) => {
        if (isMounted) {
          setItems(nextItems);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage("체크리스트 항목을 불러오지 못했습니다.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { errorMessage, items };
}
