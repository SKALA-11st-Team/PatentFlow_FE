import { useEffect, useState } from "react";
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  type CreateUserRequest,
  type UserItem,
} from "../../api/adminUsers";
import { createDepartment, deleteDepartment, getDepartments, type Department } from "../../api/departments";
import { getApiErrorMessage } from "../../api/client";
import { Button } from "../../components/common/Button";
import { AppLayout } from "../../components/layout/AppLayout";

const EMPTY_FORM: CreateUserRequest = {
  username: "",
  role: "BUSINESS",
  departmentId: null,
  departmentName: null,
  displayName: "",
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateUserRequest>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deptForm, setDeptForm] = useState({ departmentId: "", departmentName: "" });
  const [deptMessage, setDeptMessage] = useState("");
  const [isSavingDept, setIsSavingDept] = useState(false);

  useEffect(() => {
    Promise.all([getUsers(), getDepartments()])
      .then(([nextUsers, nextDepts]) => {
        setUsers(nextUsers);
        setDepartments(nextDepts);
        if (nextDepts.length > 0) {
          setForm((f) => ({ ...f, departmentId: nextDepts[0].departmentId, departmentName: nextDepts[0].departmentName }));
        }
      })
      .catch(() => showMessage("데이터를 불러오지 못했습니다.", true))
      .finally(() => setIsLoading(false));
  }, []);

  function showMessage(msg: string, error = false) {
    setMessage(msg);
    setIsError(error);
  }

  function handleRoleChange(role: "ADMIN" | "BUSINESS") {
    if (role === "ADMIN") {
      setForm((f) => ({ ...f, role, departmentId: null, departmentName: null }));
    } else {
      const first = departments[0];
      setForm((f) => ({
        ...f,
        role,
        departmentId: first?.departmentId ?? null,
        departmentName: first?.departmentName ?? null,
      }));
    }
  }

  function handleDeptChange(deptId: string) {
    const dept = departments.find((d) => d.departmentId === deptId);
    if (dept) setForm((f) => ({ ...f, departmentId: dept.departmentId, departmentName: dept.departmentName }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.displayName) return;
    setIsSubmitting(true);
    try {
      const newUser = await createUser(form);
      setUsers((prev) => [...prev, newUser]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      showMessage(`${newUser.displayName} (${newUser.username}) 계정이 생성되었습니다. 임시 비밀번호가 이메일로 발송됩니다.`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, "계정 생성에 실패했습니다."), true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(user: UserItem) {
    if (!confirm(`${user.displayName} (${user.username}) 계정을 삭제하시겠습니까?`)) return;
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showMessage(`${user.displayName} 계정이 삭제되었습니다.`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, "계정 삭제에 실패했습니다."), true);
    }
  }

  async function handleResetPassword(user: UserItem) {
    if (!confirm(`${user.displayName} (${user.username}) 비밀번호를 초기화하시겠습니까?`)) return;
    try {
      const result = await resetUserPassword(user.id);
      showMessage(`비밀번호가 초기화되었습니다. 임시 비밀번호: ${result.temporaryPassword} (이메일 발송 완료)`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, "비밀번호 초기화에 실패했습니다."), true);
    }
  }

  return (
    <AppLayout role="ADMIN" title="사업부/계정 관리" description="사업부와 사용자 계정을 관리합니다.">

      {/* 사업부 관리 */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2>사업부 관리</h2>
            <p>특허 등록 및 메일 발송 시 선택 가능한 사업부를 관리합니다.</p>
          </div>
        </div>
        {deptMessage ? <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>{deptMessage}</p> : null}
        <div className="table-wrap" style={{ marginBottom: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>사업부 ID</th>
                <th>사업부명</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.departmentId}>
                  <td><code>{dept.departmentId}</code></td>
                  <td>{dept.departmentName}</td>
                  <td className="table-cell-actions">
                    <Button
                      onClick={async () => {
                        if (!confirm(`"${dept.departmentName}" 사업부를 삭제하시겠습니까?`)) return;
                        try {
                          await deleteDepartment(dept.departmentId);
                          setDepartments((prev) => prev.filter((d) => d.departmentId !== dept.departmentId));
                          setDeptMessage(`"${dept.departmentName}" 삭제되었습니다.`);
                        } catch {
                          setDeptMessage("삭제에 실패했습니다.");
                        }
                      }}
                      type="button"
                      variant="secondary"
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 ? (
                <tr><td colSpan={3} className="empty-table-cell">등록된 사업부가 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!deptForm.departmentId.trim() || !deptForm.departmentName.trim()) return;
            setIsSavingDept(true);
            setDeptMessage("");
            try {
              const created = await createDepartment(deptForm.departmentId.trim(), deptForm.departmentName.trim());
              setDepartments((prev) => [...prev, created]);
              setDeptForm({ departmentId: "", departmentName: "" });
              setDeptMessage(`"${created.departmentName}" 사업부가 추가되었습니다.`);
            } catch {
              setDeptMessage("추가에 실패했습니다. ID가 중복되었을 수 있습니다.");
            } finally {
              setIsSavingDept(false);
            }
          }}
          className="table-cell-actions"
          style={{ alignItems: "flex-end" }}
        >
          <label className="form-field">
            <span className="form-label-text">사업부 ID</span>
            <input
              onChange={(e) => setDeptForm((f) => ({ ...f, departmentId: e.target.value }))}
              placeholder="DEPT-NEW"
              required
              type="text"
              value={deptForm.departmentId}
            />
          </label>
          <label className="form-field">
            <span className="form-label-text">사업부명</span>
            <input
              onChange={(e) => setDeptForm((f) => ({ ...f, departmentName: e.target.value }))}
              placeholder="신규사업부"
              required
              type="text"
              value={deptForm.departmentName}
            />
          </label>
          <Button disabled={isSavingDept} type="submit">
            {isSavingDept ? "추가 중…" : "사업부 추가"}
          </Button>
        </form>
      </section>

      {/* 계정 관리 */}
      <section className="section">
        <div className="section-header">
          <div>
            <h2>계정 목록</h2>
            <p>
              {isLoading
                ? "계정 목록을 불러오는 중입니다."
                : `총 ${users.length}개 계정`}
            </p>
          </div>
          <Button onClick={() => { setShowForm((v) => !v); setMessage(""); }} type="button">
            {showForm ? "취소" : "새 계정 생성"}
          </Button>
        </div>

        {message ? (
          <p className={`notice notice-compact ${isError ? "notice-error" : ""}`} style={{ marginBottom: "1rem" }}>
            {message}
          </p>
        ) : null}

        {showForm ? (
          <form className="settings-card settings-form" onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0 }}>새 계정 생성</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label className="form-field">
                <span className="form-label-text">이메일 (로그인 ID)</span>
                <input
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="user@company.com"
                  required
                  type="email"
                  value={form.username}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">이름</span>
                <input
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="홍길동"
                  required
                  type="text"
                  value={form.displayName}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">역할</span>
                <select
                  onChange={(e) => handleRoleChange(e.target.value as "ADMIN" | "BUSINESS")}
                  value={form.role}
                >
                  <option value="BUSINESS">사업부</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </label>
              {form.role === "BUSINESS" ? (
                <label className="form-field">
                  <span className="form-label-text">사업부명</span>
                  <select
                    onChange={(e) => handleDeptChange(e.target.value)}
                    value={form.departmentId ?? ""}
                  >
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}
            </div>
            <div className="table-cell-actions">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "생성 중…" : "계정 생성"}
              </Button>
              <Button onClick={() => setShowForm(false)} type="button" variant="secondary">
                취소
              </Button>
            </div>
          </form>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일 (ID)</th>
                <th>역할</th>
                <th>사업부명</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`badge ${user.role === "ADMIN" ? "badge-info" : "badge-neutral"}`}>
                      {user.role === "ADMIN" ? "관리자" : "사업부"}
                    </span>
                  </td>
                  <td>{user.departmentName ?? "-"}</td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}</td>
                  <td className="table-cell-actions">
                    <Button
                      onClick={() => handleResetPassword(user)}
                      type="button"
                      variant="secondary"
                    >
                      비밀번호 초기화
                    </Button>
                    {user.id !== "USER-admin" ? (
                      <Button
                        onClick={() => handleDelete(user)}
                        type="button"
                        variant="secondary"
                      >
                        삭제
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!isLoading && users.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={6}>
                    계정이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
