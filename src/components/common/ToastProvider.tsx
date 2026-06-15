import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastTone } from "./toastContext";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const TOAST_DURATION_MS = 4000;

/**
 * @relatedUI UI-COM-02
 * @description 전역 토스트 알림. 저장/발송 등 액션 결과를 화면 위치와 무관하게 일관되게 알린다.
 *     기존에는 결과 메시지가 각 섹션의 인라인 notice로만 표시되어 스크롤 위치에 따라 놓치기 쉬웠다.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextIdRef.current++;
      setToasts((current) => [...current.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  // error 톤이 하나라도 있으면 즉시 알림(assertive/alert)으로 승격해 실패 통지를 지연 없이 읽게 한다.
  const hasError = toasts.some((toast) => toast.tone === "error");

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        live region 컨테이너는 항상 DOM에 두고 내부 항목만 토글한다.
        조건부로 region 자체를 마운트하면 스크린리더가 첫 토스트 변경을 감지하지 못할 수 있다.
      */}
      <div
        aria-live={hasError ? "assertive" : "polite"}
        className="toast-stack"
        role={hasError ? "alert" : "status"}
      >
        {toasts.map((toast) => (
          <button
            className={`toast toast-${toast.tone}`}
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
