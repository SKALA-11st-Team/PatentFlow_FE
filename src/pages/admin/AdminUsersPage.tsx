import { useEffect, useState, type FormEvent } from "react";
import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  updateUser,
  type CreateUserRequest,
  type UserItem,
} from "../../api/adminUsers";
import { changePassword, logout } from "../../api/auth";
import { getStoredAuthUser } from "../../api/authStorage";
import { createDepartment, deleteDepartment, getDepartments, updateDepartment, type Department } from "../../api/departments";
import { getApiErrorMessage } from "../../api/client";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { PaginationControls } from "../../components/common/PaginationControls";
import { AppLayout } from "../../components/layout/AppLayout";
import { useClientPagination } from "../../hooks/useClientPagination";

/**
 * @relatedFR FR-COM-01, FR-LEGAL-12, FR-LEGAL-16
 * @relatedUI UI-LEGAL-08
 * @description 사업부와 사용자 계정을 모달 기반으로 추가/수정/삭제하는 관리자 설정 화면
 */
export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountTab, setAccountTab] = useState<"admin" | "business">("business");
  const businessUsers = users.filter(u => u.role === "BUSINESS");
  const { currentPage, pageSize, pagedItems: pagedBusinessUsers, setCurrentPage, totalItems: businessTotalItems, totalPages: businessTotalPages } = useClientPagination(businessUsers, [accountTab], 10);
  // 사업부 섹션과 계정 섹션의 메시지를 분리해 서로 다른 위치에 표시한다.
  const [deptMessage, setDeptMessage] = useState("");
  const [isDeptError, setIsDeptError] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<CreateUserRequest>(EMPTY_USER_FORM);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  // 비밀번호 모달 전용 메시지 — 전역 message와 분리해 모달 닫아도 메인 페이지에 잔류하지 않게 한다.
  const [pwModalMessage, setPwModalMessage] = useState("");
  const [isPwModalError, setIsPwModalError] = useState(false);

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ departmentId: "", departmentName: "" });
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);

  useEffect(() => {
    Promise.all([getUsers(), getDepartments()])
      .then(([nextUsers, nextDepts]) => {
        setUsers(nextUsers);
        setDepartments(nextDepts);
      })
      .catch((error) => showMessage(getApiErrorMessage(error, "데이터를 불러오지 못했습니다."), true))
      .finally(() => setIsLoading(false));
  }, []);

  function showMessage(msg: string, error = false) {
    setMessage(msg);
    setIsError(error);
  }

  function showDeptMessage(msg: string, error = false) {
    setDeptMessage(msg);
    setIsDeptError(error);
  }

  function openCreateUserModal() {
    const firstDepartment = departments[0];
    setEditingUserId(null);
    setUserForm({
      email: "",
      role: "BUSINESS",
      departmentId: firstDepartment?.departmentId ?? null,
      departmentName: firstDepartment?.departmentName ?? null,
      username: "",
    });
    setIsUserModalOpen(true);
    setIsError(false);
    setMessage("");
  }

  function openEditUserModal(user: UserItem) {
    setEditingUserId(user.id);
    setUserForm({
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      username: user.username,
    });
    setIsUserModalOpen(true);
    setIsError(false);
    setMessage("");
  }

  function closeUserModal() {
    setIsUserModalOpen(false);
    setEditingUserId(null);
    setUserForm(EMPTY_USER_FORM);
  }

  function openCreateDepartmentModal() {
    setEditingDepartmentId(null);
    setDepartmentForm({ departmentId: "", departmentName: "" });
    setIsDepartmentModalOpen(true);
    setIsError(false);
    setMessage("");
  }

  function openEditDepartmentModal(department: Department) {
    setEditingDepartmentId(department.departmentId);
    setDepartmentForm({ departmentId: department.departmentId, departmentName: department.departmentName });
    setIsDepartmentModalOpen(true);
    setIsError(false);
    setMessage("");
  }

  function closeDepartmentModal() {
    setIsDepartmentModalOpen(false);
    setEditingDepartmentId(null);
    setDepartmentForm({ departmentId: "", departmentName: "" });
  }

  function handleUserRoleChange(role: "ADMIN" | "BUSINESS") {
    if (role === "ADMIN") {
      setUserForm((current) => ({ ...current, role, departmentId: null, departmentName: null }));
      return;
    }

    const firstDepartment = departments[0];
    setUserForm((current) => ({
      ...current,
      role,
      departmentId: firstDepartment?.departmentId ?? null,
      departmentName: firstDepartment?.departmentName ?? null,
    }));
  }

  function handleUserDepartmentChange(departmentId: string) {
    const department = departments.find((item) => item.departmentId === departmentId);
    if (!department) return;
    setUserForm((current) => ({
      ...current,
      departmentId: department.departmentId,
      departmentName: department.departmentName,
    }));
  }

  async function handleSaveUser(event: FormEvent) {
    event.preventDefault();
    if (!userForm.email || !userForm.username) return;

    const currentUser = getStoredAuthUser();
    // 자기 자신의 계정을 수정하는 경우에만 로그아웃 여부를 판단한다
    const isSelf = editingUserId === currentUser?.userId;
    const originalEmail = users.find(u => u.id === editingUserId)?.email;
    // 로그인 ID(email)가 바뀐 경우에만 기존 토큰이 무효가 되므로 강제 로그아웃 처리
    const emailChanged = isSelf && originalEmail !== userForm.email;

    setIsSavingUser(true);
    try {
      const nextUser = editingUserId
        ? await updateUser(editingUserId, userForm)
        : await createUser(userForm);

      setUsers((current) =>
        editingUserId
          ? current.map((user) => (user.id === editingUserId ? nextUser : user))
          : [...current, nextUser],
      );
      closeUserModal();

      if (emailChanged) {
        // 로그인 ID가 바뀌었으므로 기존 토큰 무효 → 재로그인 필요
        showMessage("로그인 ID가 변경되었습니다. 새 이메일로 다시 로그인하세요.");
        setTimeout(() => { logout(); window.location.href = "/"; }, 2000);
      } else {
        showMessage(
          editingUserId
            ? `${nextUser.username} (${nextUser.email}) 계정이 수정되었습니다.`
            : `${nextUser.username} (${nextUser.email}) 계정이 생성되었습니다. 임시 비밀번호가 이메일로 발송됩니다.`,
        );
      }
    } catch (error) {
      showMessage(getApiErrorMessage(error, editingUserId ? "계정 수정에 실패했습니다." : "계정 생성에 실패했습니다."), true);
    } finally {
      setIsSavingUser(false);
    }
  }

  function openPasswordModal() {
    setIsPasswordModalOpen(true);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPwModalMessage("");
    setIsPwModalError(false);
    setIsError(false);
    setMessage("");
  }

  function closePasswordModal() {
    setIsPasswordModalOpen(false);
    setPwModalMessage("");
    setIsPwModalError(false);
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwModalMessage("새 비밀번호가 일치하지 않습니다.");
      setIsPwModalError(true);
      return;
    }
    setIsSavingPassword(true);
    setPwModalMessage("");
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      closePasswordModal();
      showMessage("비밀번호가 변경되었습니다. 다시 로그인하세요.");
      setTimeout(() => { logout(); window.location.href = "/"; }, 2000);
    } catch (error) {
      setPwModalMessage(getApiErrorMessage(error, "비밀번호 변경에 실패했습니다."));
      setIsPwModalError(true);
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDeleteUser(user: UserItem) {
    if (!confirm(`${user.username} (${user.email}) 계정을 삭제하시겠습니까?`)) return;
    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      showMessage(`${user.username} 계정이 삭제되었습니다.`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, "계정 삭제에 실패했습니다."), true);
    }
  }

  async function handleResetPassword(user: UserItem) {
    if (!confirm(`${user.username} (${user.email})의 임시 비밀번호를 새로 발급해 이메일로 보내시겠습니까?`)) return;
    try {
      const result = await resetUserPassword(user.id);
      showMessage(`임시 비밀번호를 발급했습니다. ${result.email}로 이메일이 발송되었습니다.`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, "임시 비밀번호 발급에 실패했습니다."), true);
    }
  }

  async function handleSaveDepartment(event: FormEvent) {
    event.preventDefault();
    if (!departmentForm.departmentId.trim() || !departmentForm.departmentName.trim()) return;

    setIsSavingDepartment(true);
    try {
      const nextDepartment = editingDepartmentId
        ? await updateDepartment(editingDepartmentId, departmentForm.departmentName.trim())
        : await createDepartment(departmentForm.departmentId.trim(), departmentForm.departmentName.trim());

      setDepartments((current) =>
        editingDepartmentId
          ? current.map((department) => (department.departmentId === editingDepartmentId ? nextDepartment : department))
          : [...current, nextDepartment],
      );
      closeDepartmentModal();
      showDeptMessage(editingDepartmentId ? `"${nextDepartment.departmentName}" 사업부가 수정되었습니다.` : `"${nextDepartment.departmentName}" 사업부가 추가되었습니다.`);
    } catch (error) {
      showDeptMessage(getApiErrorMessage(error, editingDepartmentId ? "사업부 수정에 실패했습니다." : "사업부 추가에 실패했습니다."), true);
    } finally {
      setIsSavingDepartment(false);
    }
  }

  async function handleDeleteDepartment(department: Department) {
    if (!confirm(`"${department.departmentName}" 사업부를 삭제하시겠습니까?`)) return;
    try {
      await deleteDepartment(department.departmentId);
      setDepartments((current) => current.filter((item) => item.departmentId !== department.departmentId));
      showDeptMessage(`"${department.departmentName}" 사업부가 삭제되었습니다.`);
    } catch {
      showDeptMessage("사업부 삭제에 실패했습니다.", true);
    }
  }

  return (
    <AppLayout role="ADMIN" title="사업부/계정 관리" description="사업부와 사용자 계정을 관리합니다.">
      <section className="section">
        <div className="section-header">
          <div>
            <h2>사업부 관리</h2>
            <p>특허 등록 및 메일 발송 시 선택 가능한 사업부를 관리합니다.</p>
          </div>
          <Button onClick={openCreateDepartmentModal} type="button">
            사업부 추가
          </Button>
        </div>

        {deptMessage ? (
          <p className={`notice notice-compact ${isDeptError ? "notice-error" : ""}`} style={{ marginBottom: "1rem" }}>
            {deptMessage}
          </p>
        ) : null}

        <div className="table-wrap" style={{ marginBottom: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>사업부 ID</th>
                <th>사업부명</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.departmentId}>
                  <td><code>{department.departmentId}</code></td>
                  <td>{department.departmentName}</td>
                  <td className="table-cell-actions">
                    <Button onClick={() => openEditDepartmentModal(department)} type="button" variant="secondary">
                      수정
                    </Button>
                    <Button onClick={() => handleDeleteDepartment(department)} type="button" variant="secondary">
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={3}>
                    등록된 사업부가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2>계정 관리</h2>
          </div>
          {accountTab === "business" && (
            <Button onClick={openCreateUserModal} type="button">
              새 계정 추가
            </Button>
          )}
        </div>

        {/* 탭 */}
        <div className="role-tabs" style={{ marginBottom: "1rem" }} aria-label="계정 탭">
          <button
            type="button"
            className={accountTab === "business" ? "selected" : ""}
            onClick={() => setAccountTab("business")}
          >
            사업부 계정
          </button>
          <button
            type="button"
            className={accountTab === "admin" ? "selected" : ""}
            onClick={() => setAccountTab("admin")}
          >
            관리자 정보
          </button>
        </div>

        {message ? (
          <p className={`notice notice-compact ${isError ? "notice-error" : ""}`} style={{ marginBottom: "1rem" }}>
            {message}
          </p>
        ) : null}

        {/* 사업부 계정 탭 */}
        {accountTab === "business" && (
          <div style={{ minHeight: "420px" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>이메일 (ID)</th>
                    <th>사업부명</th>
                    <th>생성일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBusinessUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.departmentName ?? "-"}</td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}</td>
                      <td className="table-cell-actions">
                        <Button onClick={() => openEditUserModal(user)} type="button" variant="secondary">수정</Button>
                        <Button onClick={() => handleResetPassword(user)} type="button" variant="secondary">임시 비밀번호 발급</Button>
                        <Button onClick={() => handleDeleteUser(user)} type="button" variant="secondary">삭제</Button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && businessUsers.length === 0 ? (
                    <tr><td className="empty-table-cell" colSpan={5}>사업부 계정이 없습니다.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              totalItems={businessTotalItems}
              totalPages={businessTotalPages}
            />
          </div>
        )}

        {/* 관리자 정보 탭 */}
        {accountTab === "admin" && (() => {
          // 관리자 계정은 단수 운영을 전제 — 복수인 경우 첫 번째만 표시
          const adminUser = users.find(u => u.role === "ADMIN");
          if (!adminUser) return <p className="form-helper-text">관리자 계정 정보를 불러오는 중입니다.</p>;
          return (
            <div className="settings-card" style={{ maxWidth: 480 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="form-field">
                  <span className="form-label-text">이름</span>
                  <p style={{ margin: 0 }}>{adminUser.username}</p>
                </div>
                <div className="form-field">
                  <span className="form-label-text">이메일 (로그인 ID)</span>
                  <p style={{ margin: 0 }}>{adminUser.email}</p>
                </div>
                <div className="form-field">
                  <span className="form-label-text">생성일</span>
                  <p style={{ margin: 0 }}>{adminUser.createdAt ? new Date(adminUser.createdAt).toLocaleDateString("ko-KR") : "-"}</p>
                </div>
              </div>
              <div className="table-cell-actions" style={{ marginTop: "1rem" }}>
                <Button onClick={() => openEditUserModal(adminUser)} type="button" variant="secondary">
                  정보 수정
                </Button>
                <Button onClick={openPasswordModal} type="button" variant="secondary">
                  비밀번호 변경
                </Button>
              </div>
            </div>
          );
        })()}
      </section>

      {isDepartmentModalOpen ? (
        <Modal ariaLabel={editingDepartmentId ? "사업부 수정" : "사업부 추가"} className="settings-modal" onClose={closeDepartmentModal}>
          <form className="settings-modal-form" onSubmit={handleSaveDepartment}>
            <div className="modal-header">
              <div>
                <h2>{editingDepartmentId ? "사업부 수정" : "사업부 추가"}</h2>
                <p className="form-helper-text">사업부명은 목록과 메일 수신자 매핑에 공통으로 사용됩니다.</p>
              </div>
              <button
                aria-label={editingDepartmentId ? "사업부 수정 닫기" : "사업부 추가 닫기"}
                className="modal-close-button"
                onClick={closeDepartmentModal}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-grid">
              <label className="form-field">
                <span className="form-label-text">사업부 ID</span>
                <input
                  disabled={Boolean(editingDepartmentId)}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, departmentId: event.target.value }))}
                  placeholder="DEPT-NEW"
                  required
                  type="text"
                  value={departmentForm.departmentId}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">사업부명</span>
                <input
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, departmentName: event.target.value }))}
                  placeholder="신규사업부"
                  required
                  type="text"
                  value={departmentForm.departmentName}
                />
              </label>
            </div>
            <div className="modal-actions">
              <Button disabled={isSavingDepartment} type="submit">
                {isSavingDepartment ? "저장 중…" : editingDepartmentId ? "수정" : "추가"}
              </Button>
              <Button onClick={closeDepartmentModal} type="button" variant="secondary">
                취소
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isUserModalOpen ? (
        <Modal ariaLabel={editingUserId ? "계정 수정" : "계정 추가"} className="settings-modal" onClose={closeUserModal}>
          <form className="settings-modal-form" onSubmit={handleSaveUser}>
            <div className="modal-header">
              <div>
                <h2>{editingUserId ? "계정 수정" : "계정 추가"}</h2>
                <p className="form-helper-text">계정 정보 수정은 모달에서 한 번에 처리합니다.</p>
              </div>
              <button
                aria-label={editingUserId ? "계정 수정 닫기" : "계정 추가 닫기"}
                className="modal-close-button"
                onClick={closeUserModal}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="settings-modal-grid settings-modal-grid-two-column">
              <label className="form-field">
                <span className="form-label-text">이메일 (로그인 ID)</span>
                <input
                  // 입력 시 커스텀 유효성 메시지를 초기화해야 다음 submit에서 브라우저 기본 메시지가 재출력되지 않는다
                  onChange={(e) => { e.currentTarget.setCustomValidity(""); setUserForm((current) => ({ ...current, email: e.target.value })); }}
                  // 브라우저 기본 영문 메시지 대신 한국어로 표시
                  onInvalid={(e) => e.currentTarget.setCustomValidity("유효한 이메일 주소를 입력해 주세요.")}
                  placeholder="user@company.com"
                  required
                  type="email"
                  value={userForm.email}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">이름</span>
                <input
                  onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="홍길동"
                  required
                  type="text"
                  value={userForm.username}
                />
              </label>
              {/* 관리자 계정 수정 시 역할·사업부 필드를 숨긴다 — ADMIN은 사업부가 없고 역할 변경도 허용하지 않음 */}
              {userForm.role !== "ADMIN" && (
                <>
                  <label className="form-field">
                    <span className="form-label-text">역할</span>
                    <select
                      onChange={(event) => handleUserRoleChange(event.target.value as "ADMIN" | "BUSINESS")}
                      value={userForm.role}
                    >
                      <option value="BUSINESS">사업부</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span className="form-label-text">사업부명</span>
                    <select onChange={(event) => handleUserDepartmentChange(event.target.value)} value={userForm.departmentId ?? ""}>
                      {departments.map((department) => (
                        <option key={department.departmentId} value={department.departmentId}>
                          {department.departmentName}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
            <div className="modal-actions">
              <Button disabled={isSavingUser} type="submit">
                {isSavingUser ? "저장 중…" : editingUserId ? "수정" : "계정 생성"}
              </Button>
              <Button onClick={closeUserModal} type="button" variant="secondary">
                취소
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isPasswordModalOpen ? (
        <Modal ariaLabel="비밀번호 변경" className="settings-modal" onClose={closePasswordModal}>
          <form className="settings-modal-form" onSubmit={handleChangePassword}>
            <div className="modal-header">
              <div>
                <h2>내 비밀번호 변경</h2>
                <p className="form-helper-text">변경 후 자동으로 로그아웃되며 새 비밀번호로 재로그인합니다.</p>
              </div>
              <button aria-label="닫기" className="modal-close-button" onClick={closePasswordModal} type="button">×</button>
            </div>
            <div className="settings-modal-grid">
              <label className="form-field">
                <span className="form-label-text">현재 비밀번호</span>
                <input
                  autoComplete="current-password"
                  onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  required
                  type="password"
                  value={passwordForm.currentPassword}
                />
              </label>
              <div />
              <label className="form-field">
                <span className="form-label-text">새 비밀번호</span>
                <input
                  autoComplete="new-password"
                  onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                  required
                  type="password"
                  value={passwordForm.newPassword}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">새 비밀번호 확인</span>
                <input
                  autoComplete="new-password"
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  type="password"
                  value={passwordForm.confirmPassword}
                />
              </label>
            </div>
            {pwModalMessage ? <p className={`notice notice-compact ${isPwModalError ? "notice-error" : ""}`}>{pwModalMessage}</p> : null}
            <div className="modal-actions">
              <Button disabled={isSavingPassword} type="submit">
                {isSavingPassword ? "변경 중…" : "비밀번호 변경"}
              </Button>
              <Button onClick={closePasswordModal} type="button" variant="secondary">취소</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </AppLayout>
  );
}

const EMPTY_USER_FORM: CreateUserRequest = {
  email: "",
  role: "BUSINESS",
  departmentId: null,
  departmentName: null,
  username: "",
};
