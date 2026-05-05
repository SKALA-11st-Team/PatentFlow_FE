import type { ReactNode } from "react";

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
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <section
        aria-label={ariaLabel}
        className={className}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}
