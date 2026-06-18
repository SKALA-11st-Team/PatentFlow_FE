/**
 * @author 유건욱
 * @date 2026-05-06
 */
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  onClose: () => void;
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 화면 위에 뜨는 공통 모달 오버레이와 바깥 영역 클릭 닫힘 동작을 제공한다.
 */
export function Modal({ ariaLabel, children, className, onClose }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        aria-label={ariaLabel}
        aria-modal="true"
        className={className}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}
