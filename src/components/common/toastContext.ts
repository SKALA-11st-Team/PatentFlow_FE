import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";

export interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Provider 밖(테스트 등)에서도 안전하게 동작하도록 no-op 폴백을 제공한다. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { showToast: () => {} };
}
