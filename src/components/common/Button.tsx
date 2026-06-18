/**
 * @author 유건욱
 * @date 2026-05-06
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * @relatedFR N/A
 * @relatedUI COMMON
 * @description primary/secondary 변형을 지원하는 공통 버튼 컴포넌트.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
