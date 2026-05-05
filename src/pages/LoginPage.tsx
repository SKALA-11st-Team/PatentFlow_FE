import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import type { UserRole } from "../types/patent";

export function LoginPage() {
  const [role, setRole] = useState<UserRole>("ADMIN");
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(role === "ADMIN" ? "/admin/dashboard" : "/business/dashboard");
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-copy">
          <p className="eyebrow">PatentFlow</p>
          <h1>SK AX 특허 관리 AI Workflow</h1>
          <p>
            검토 대상 특허를 확인하고 요약, AI 특허 평가 레포트, 부서 의견, 최종 판단을 하나의 흐름으로 관리해요.
          </p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="role-tabs" aria-label="로그인 역할 선택">
            <button
              type="button"
              className={role === "ADMIN" ? "selected" : ""}
              onClick={() => setRole("ADMIN")}
            >
              관리자
            </button>
            <button
              type="button"
              className={role === "BUSINESS" ? "selected" : ""}
              onClick={() => setRole("BUSINESS")}
            >
              사업부서
            </button>
          </div>
          <label>
            이메일
            <input
              defaultValue={role === "ADMIN" ? "admin@syuuk.test" : "business@syuuk.test"}
              type="email"
            />
          </label>
          <label>
            비밀번호
            <input defaultValue="demo1234" type="password" />
          </label>
          <Button type="submit">{role === "ADMIN" ? "관리자로 로그인" : "사업부서로 로그인"}</Button>
        </form>
      </section>
    </main>
  );
}
