import { useEffect, useState } from "react";
import { getBusinessPatents, getPatents, type PatentListQuery } from "../api/patents";
import { getApiErrorMessage } from "../api/client";
import { getStoredAuthUser } from "../api/authStorage";
import type { PatentListItem } from "../types/patent";

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03, UI-LEGAL-07, UI-BUS-01, UI-BUS-02, UI-BUS-04
 * @description 특허 목록 화면들이 mock fixture 대신 백엔드 특허 목록 API를 공통으로 조회하도록 돕는다.
 */
export function usePatentList(query: PatentListQuery = {}) {
  const { departmentId, keyword, page, reviewWorkflowStatus, size, sort } = query;
  const [patents, setPatents] = useState<PatentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage("");

    const user = getStoredAuthUser();
    const loadPatents = user?.role === "BUSINESS" ? getBusinessPatents : getPatents;

    loadPatents({ departmentId, keyword, page, reviewWorkflowStatus, size, sort })
      .then((items) => {
        if (isMounted) {
          setPatents(items);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, "특허 목록을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요."));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [departmentId, keyword, page, reviewWorkflowStatus, size, sort]);

  return { errorMessage, isLoading, patents, setPatents };
}
