/**
 * @author 유건욱
 * @date 2026-06-14
 */
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvitation, validateInvitation } from "../api/invitations";
import { getApiErrorMessage } from "../api/client";
import { Button } from "../components/common/Button";
import type { InvitationValidation } from "../types/invitation";

type PageState = "loading" | "valid" | "invalid" | "done";

/**
 * @relatedFR FR-LEGAL-12
 * @relatedUI UI-COM-04
 * @description 사업부 사용자가 법무팀 초대 메일 링크로 진입해 최초 비밀번호를 설정하고 계정을 활성화하는 공개 화면.
 *              임시 비밀번호 평문 전달 대신 본인이 직접 비밀번호를 설정하므로, 담당자 변경 시에도 재발송으로 온보딩을 이어간다.
 */
export function InvitationAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [validation, setValidation] = useState<InvitationValidation | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setPageState("invalid");
      setErrorMessage("초대 토큰이 없습니다. 법무팀이 보낸 초대 메일의 링크로 다시 접속해 주세요.");
      return;
    }

    validateInvitation(token)
      .then((result) => {
        if (!isMounted) return;
        setValidation(result);
        if (result.valid) {
          setPageState("valid");
        } else {
          setPageState("invalid");
          setErrorMessage(
            result.status === "EXPIRED"
              ? "초대 링크가 만료되었습니다. 법무팀에 초대 재발송을 요청해 주세요."
              : "유효하지 않은 초대 링크입니다. 법무팀에 초대 재발송을 요청해 주세요.",
          );
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setPageState("invalid");
        setErrorMessage(getApiErrorMessage(error, "초대 링크를 확인하지 못했습니다. 법무팀에 문의해 주세요."));
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvitation(token, password);
      setPageState("done");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "초대 수락에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-copy">
          <p className="eyebrow">PatentFlow</p>
          <h1>사업부 계정 초대 수락</h1>
          <p>법무팀이 보낸 초대로 계정을 활성화해요. 최초 비밀번호를 직접 설정하면 바로 로그인할 수 있어요.</p>
        </div>

        {pageState === "loading" ? (
          <div className="login-form" aria-live="polite">
            <p>초대 링크를 확인하는 중입니다.</p>
          </div>
        ) : pageState === "invalid" ? (
          <div className="login-form" aria-live="polite">
            <p className="form-error">{errorMessage}</p>
            <Button onClick={() => navigate("/login")} type="button">
              로그인 화면으로 이동
            </Button>
          </div>
        ) : pageState === "done" ? (
          <div className="login-form" aria-live="polite">
            <p>비밀번호가 설정되어 계정이 활성화되었습니다. 새 비밀번호로 로그인해 주세요.</p>
            <Button onClick={() => navigate("/login")} type="button">
              로그인 화면으로 이동
            </Button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {validation?.email ? (
              <p className="form-helper-text">
                계정 <strong>{validation.email}</strong>
              </p>
            ) : null}
            {validation?.responseDeadline ? (
              <p className="form-helper-text">이번 분기 회신 기한: {validation.responseDeadline}</p>
            ) : null}
            <label>
              새 비밀번호
              <input
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <label>
              새 비밀번호 확인
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>
            <p className="form-helper-text">비밀번호는 8자 이상으로 설정해 주세요.</p>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "설정 중" : "비밀번호 설정하고 계정 활성화"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
