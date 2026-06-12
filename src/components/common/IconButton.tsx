import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // 항목14: 아이콘만 보이므로 접근성 라벨을 강제한다(툴팁으로도 노출).
  label: string;
  icon: "edit" | "delete";
  tone?: "default" | "danger";
}

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description 항목14: row 단위 수정/삭제 같은 행 내 동작을 텍스트 버튼 대신 아이콘 버튼으로
 * 제공한다(일괄 처리가 가능한 동작만 상단 버튼 유지).
 */
export function IconButton({ label, icon, tone = "default", className = "", ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${tone === "danger" ? "icon-button-danger" : ""} ${className}`.trim()}
      title={label}
      type="button"
      {...props}
    >
      {icon === "edit" ? <PencilIcon /> : <TrashIcon />}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6" />
    </svg>
  );
}
