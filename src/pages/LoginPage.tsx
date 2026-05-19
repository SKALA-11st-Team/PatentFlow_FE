import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { Button } from "../components/common/Button";
import type { UserRole } from "../types/patent";

const DEV_ACCOUNTS: Record<UserRole, { password: string; username: string }> = {
  ADMIN: {
    password: "admin1234",
    username: "admin",
  },
  BUSINESS: {
    password: "business1234",
    username: "business",
  },
};

/**
 * @relatedFR N/A
 * @relatedUI UI-COM-01
 * @description 관리자/사업부서 사용자가 역할을 선택해 실제 백엔드 JWT 로그인 후 PatentFlow 화면에 진입하는 로그인 화면
 */
export function LoginPage() {
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [username, setUsername] = useState(DEV_ACCOUNTS.ADMIN.username);
  const [password, setPassword] = useState(DEV_ACCOUNTS.ADMIN.password);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setUsername(DEV_ACCOUNTS[nextRole].username);
    setPassword(DEV_ACCOUNTS[nextRole].password);
    setErrorMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loginResult = await login({ password, username });
      const nextRole = loginResult.user.role ?? role;

      navigate(nextRole === "ADMIN" ? "/admin/dashboard" : "/business/dashboard");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "로그인에 실패했습니다. 계정 정보를 확인해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
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
              onClick={() => handleRoleChange("ADMIN")}
            >
              관리자
            </button>
            <button
              type="button"
              className={role === "BUSINESS" ? "selected" : ""}
              onClick={() => handleRoleChange("BUSINESS")}
            >
              사업부서
            </button>
          </div>
          <label>
            아이디
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              type="text"
              value={username}
            />
          </label>
          <label>
            비밀번호
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "로그인 중" : role === "ADMIN" ? "관리자로 로그인" : "사업부서로 로그인"}
          </Button>
        </form>
      </section>
    </main>
  );
}
