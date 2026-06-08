import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { Button } from "../components/common/Button";
import type { UserRole } from "../types/patent";

// 역할별로 분리 저장 — 관리자와 사업부서 아이디가 서로 달라 독립 관리
const REMEMBER_KEY: Record<UserRole, string> = {
  ADMIN: "patentflow.remembered.admin",
  BUSINESS: "patentflow.remembered.business",
};

const LEGACY_REMEMBER_KEY: Record<UserRole, string> = {
  ADMIN: "patentflow_remembered_admin",
  BUSINESS: "patentflow_remembered_business",
};

/**
 * @relatedFR FR-COM-01
 * @relatedUI UI-COM-01
 * @description 관리자/사업부서 사용자가 역할을 선택해 실제 백엔드 JWT 로그인 후 PatentFlow 화면에 진입하는 로그인 화면
 */
export function LoginPage() {
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // 역할 탭 전환 시 해당 역할의 저장된 아이디 불러오기
  useEffect(() => {
    const saved = getRememberedEmail(role);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    } else {
      setEmail("");
      setRememberMe(false);
    }
    setPassword("");
    setErrorMessage("");
  }, [role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loginResult = await login({ email, password });
      // 서버가 반환한 실제 역할을 우선 사용 — 탭 선택과 실제 역할이 다를 경우를 방어
      const nextRole = loginResult.user.role ?? role;

      // 아이디 기억은 로그인 성공 후 확정된 역할 키(role)에만 저장/삭제한다
      if (rememberMe) {
        storeRememberedEmail(role, email);
      } else {
        clearRememberedEmail(role);
      }

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
            아이디
            <input
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
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
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
            <input
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              type="checkbox"
            />
            아이디 기억하기
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

function getRememberedEmail(role: UserRole) {
  const saved = localStorage.getItem(REMEMBER_KEY[role]);
  if (saved) {
    return saved;
  }

  const legacySaved = localStorage.getItem(LEGACY_REMEMBER_KEY[role]);
  if (legacySaved) {
    storeRememberedEmail(role, legacySaved);
    localStorage.removeItem(LEGACY_REMEMBER_KEY[role]);
  }

  return legacySaved;
}

function storeRememberedEmail(role: UserRole, email: string) {
  localStorage.setItem(REMEMBER_KEY[role], email);
  localStorage.removeItem(LEGACY_REMEMBER_KEY[role]);
}

function clearRememberedEmail(role: UserRole) {
  localStorage.removeItem(REMEMBER_KEY[role]);
  localStorage.removeItem(LEGACY_REMEMBER_KEY[role]);
}
