import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { Button } from "../components/common/Button";
import type { UserRole } from "../types/patent";

// 역할별로 분리 저장 — 관리자와 사업부서 아이디가 서로 달라 독립 관리
const REMEMBER_KEY: Record<UserRole, string> = {
  ADMIN: "patentflow.remembered.admin",
  // I3: LEGAL은 관리자 워크스페이스 사용자 — 저장 키만 분리한다.
  LEGAL: "patentflow.remembered.legal",
  BUSINESS: "patentflow.remembered.business",
};

const LEGACY_REMEMBER_KEY: Record<UserRole, string> = {
  ADMIN: "patentflow_remembered_admin",
  LEGAL: "patentflow_remembered_legal",
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

    // 빈값/공백만 입력 시 빈 자격증명을 BE로 보내지 않고 즉시 안내한다.
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const loginResult = await login({ email: trimmedEmail, password });
      // 서버가 반환한 실제 역할을 우선 사용 — 탭 선택과 실제 역할이 다를 경우를 방어
      const nextRole = loginResult.user.role ?? role;

      // AUTH-07: 아이디 기억은 탭 선택값(role)이 아니라 서버 확정 역할(nextRole) 키에 저장/삭제한다.
      if (rememberMe) {
        storeRememberedEmail(nextRole, trimmedEmail);
      } else {
        clearRememberedEmail(nextRole);
      }

      // I3: LEGAL도 관리자 워크스페이스로 진입한다(운영 메뉴만 숨김).
      navigate(nextRole === "BUSINESS" ? "/business/dashboard" : "/admin/dashboard");
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
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            비밀번호
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
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

// 관리자 탭이 복원할 때 조회할 역할 키 목록. LEGAL은 별도 탭이 없고 관리자
// 워크스페이스로 진입하므로(I3), ADMIN 탭에서 LEGAL로 저장된 아이디도 복원한다.
function rememberLookupRoles(role: UserRole): UserRole[] {
  return role === "ADMIN" ? ["ADMIN", "LEGAL"] : [role];
}

function getRememberedEmail(role: UserRole) {
  for (const lookupRole of rememberLookupRoles(role)) {
    const saved = localStorage.getItem(REMEMBER_KEY[lookupRole]);
    if (saved) {
      return saved;
    }

    const legacySaved = localStorage.getItem(LEGACY_REMEMBER_KEY[lookupRole]);
    if (legacySaved) {
      storeRememberedEmail(lookupRole, legacySaved);
      localStorage.removeItem(LEGACY_REMEMBER_KEY[lookupRole]);
      return legacySaved;
    }
  }

  return null;
}

function storeRememberedEmail(role: UserRole, email: string) {
  localStorage.setItem(REMEMBER_KEY[role], email);
  localStorage.removeItem(LEGACY_REMEMBER_KEY[role]);
}

function clearRememberedEmail(role: UserRole) {
  localStorage.removeItem(REMEMBER_KEY[role]);
  localStorage.removeItem(LEGACY_REMEMBER_KEY[role]);
}
