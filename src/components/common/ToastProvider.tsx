import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

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

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length ? (
        <div aria-live="polite" className="toast-stack" role="status">
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
      ) : null}
    </ToastContext.Provider>
  );
}

/** Provider 밖(테스트 등)에서도 안전하게 동작하도록 no-op 폴백을 제공한다. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { showToast: () => {} };
}
