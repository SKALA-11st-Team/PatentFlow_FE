import { useState } from "react";
import { getStoredAuthUser, storeAuthSession, getStoredAccessToken } from "../../api/authStorage";
import { updateProfile } from "../../api/auth";
import { Button } from "../../components/common/Button";
import { AppLayout } from "../../components/layout/AppLayout";

/**
 * @relatedFR FR-009
 * @relatedUI UI-BUS-06
 * @description 사업부 사용자의 수신자 표시명을 관리하는 화면.
 *              이메일(로그인 계정)은 변경 불가, 담당자 이름(displayName)만 수정 가능.
 */
export function BusinessSettingsPage() {
  const user = getStoredAuthUser();
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isDirty = displayName.trim() !== (user?.displayName ?? user?.name ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsSaving(true);
    setMessage("");
    try {
      await updateProfile(displayName.trim());
      if (user) {
        const token = getStoredAccessToken() ?? "";
        storeAuthSession(token, { ...user, displayName: displayName.trim(), name: displayName.trim() });
      }
      setMessage("저장되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout
      role="BUSINESS"
      title="설정"
      description="메일 수신에 사용되는 담당자 이름을 관리합니다."
    >
      <section className="section">
        <div className="section-header">
          <div>
            <h2>내 계정 정보</h2>
            <p>
              관리자가 사업부 검토 요청 메일을 발송할 때 아래 정보를 사용합니다.
            </p>
          </div>
        </div>

        <div className="settings-card">
          <form onSubmit={handleSave} className="settings-form">
            <label className="form-field">
              <span className="form-label-text">수신 이메일 (변경 불가)</span>
              <input
                disabled
                className="form-helper-text"
                type="email"
                value={user?.email ?? user?.username ?? ""}
              />
            </label>
            <label className="form-field">
              <span className="form-label-text">사업부</span>
              <input
                disabled
                className="form-helper-text"
                value={user?.departmentName ?? "—"}
              />
            </label>
            <label className="form-field">
              <span className="form-label-text">담당자 이름</span>
              <input
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="메일에 표시될 담당자 이름"
                required
                value={displayName}
              />
              <small className="form-helper-text">
                메일 수신 시 "OOO 담당자님"으로 표시됩니다.
              </small>
            </label>
            {message ? <p className="notice notice-compact">{message}</p> : null}
            <div>
              <Button disabled={isSaving || !isDirty || !displayName.trim()} type="submit">
                {isSaving ? "저장 중…" : "저장"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </AppLayout>
  );
}
