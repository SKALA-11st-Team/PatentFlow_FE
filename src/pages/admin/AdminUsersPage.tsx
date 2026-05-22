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
import { createDepartment, deleteDepartment, getDepartments, updateDepartment, type Department } from "../../api/departments";
import { getApiErrorMessage } from "../../api/client";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { AppLayout } from "../../components/layout/AppLayout";

/**
 * @relatedFR FR-COM-01, FR-LEGAL-12, FR-LEGAL-16
 * @relatedUI UI-LEGAL-08
 * @description 사업부와 사용자 계정을 모달 기반으로 추가/수정/삭제하는 관리자 설정 화면
 */
export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<CreateUserRequest>(EMPTY_USER_FORM);
  const [isSavingUser, setIsSavingUser] = useState(false);

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
      .catch(() => showMessage("데이터를 불러오지 못했습니다.", true))
      .finally(() => setIsLoading(false));
  }, []);

  function showMessage(msg: string, error = false) {
    setMessage(msg);
    setIsError(error);
  }

  function openCreateUserModal() {
    const firstDepartment = departments[0];
    setEditingUserId(null);
    setUserForm({
      username: "",
      role: "BUSINESS",
      departmentId: firstDepartment?.departmentId ?? null,
      departmentName: firstDepartment?.departmentName ?? null,
      displayName: "",
    });
    setIsUserModalOpen(true);
    setIsError(false);
    setMessage("");
  }

  function openEditUserModal(user: UserItem) {
    setEditingUserId(user.id);
    setUserForm({
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      displayName: user.displayName,
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
    if (!userForm.username || !userForm.displayName) return;

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
      showMessage(
        editingUserId
          ? `${nextUser.displayName} (${nextUser.username}) 계정이 수정되었습니다.`
          : `${nextUser.displayName} (${nextUser.username}) 계정이 생성되었습니다. 임시 비밀번호가 이메일로 발송됩니다.`,
      );
    } catch (error) {
      showMessage(getApiErrorMessage(error, editingUserId ? "계정 수정에 실패했습니다." : "계정 생성에 실패했습니다."), true);
    } finally {
      setIsSavingUser(false);
    }
  }

  async function handleDeleteUser(user: UserItem) {
    if (!confirm(`${user.displayName} (${user.username}) 계정을 삭제하시겠습니까?`)) return;
    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      showMessage(`${user.displayName} 계정이 삭제되었습니다.`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, "계정 삭제에 실패했습니다."), true);
    }
  }

  async function handleResetPassword(user: UserItem) {
    if (!confirm(`${user.displayName} (${user.username})의 임시 비밀번호를 새로 발급해 이메일로 보내시겠습니까?`)) return;
    try {
      const result = await resetUserPassword(user.id);
      showMessage(`임시 비밀번호를 발급했습니다. ${result.username}로 이메일이 발송되었습니다.`);
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
      showMessage(editingDepartmentId ? `"${nextDepartment.departmentName}" 사업부가 수정되었습니다.` : `"${nextDepartment.departmentName}" 사업부가 추가되었습니다.`);
    } catch (error) {
      showMessage(getApiErrorMessage(error, editingDepartmentId ? "사업부 수정에 실패했습니다." : "사업부 추가에 실패했습니다."), true);
    } finally {
      setIsSavingDepartment(false);
    }
  }

  async function handleDeleteDepartment(department: Department) {
    if (!confirm(`"${department.departmentName}" 사업부를 삭제하시겠습니까?`)) return;
    try {
      await deleteDepartment(department.departmentId);
      setDepartments((current) => current.filter((item) => item.departmentId !== department.departmentId));
      showMessage(`"${department.departmentName}" 사업부가 삭제되었습니다.`);
    } catch {
      showMessage("사업부 삭제에 실패했습니다.", true);
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

        {message ? (
          <p className={`notice notice-compact ${isError ? "notice-error" : ""}`} style={{ marginBottom: "1rem" }}>
            {message}
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
            <h2>계정 목록</h2>
            <p>{isLoading ? "계정 목록을 불러오는 중입니다." : `총 ${users.length}개 계정`}</p>
          </div>
          <Button onClick={openCreateUserModal} type="button">
            새 계정 추가
          </Button>
        </div>

        <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>
          <strong>비밀번호 초기화</strong>는 해당 계정의 로그인 비밀번호를 새 임시 비밀번호로 재발급해 이메일로 전송하는 기능입니다.
        </p>

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
                    <Button onClick={() => openEditUserModal(user)} type="button" variant="secondary">
                      수정
                    </Button>
                    <Button onClick={() => handleResetPassword(user)} type="button" variant="secondary">
                      임시 비밀번호 발급
                    </Button>
                    {user.id !== "USER-admin" ? (
                      <Button onClick={() => handleDeleteUser(user)} type="button" variant="secondary">
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
                  disabled={Boolean(editingUserId)}
                  onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="user@company.com"
                  required
                  type="email"
                  value={userForm.username}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">이름</span>
                <input
                  onChange={(event) => setUserForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="홍길동"
                  required
                  type="text"
                  value={userForm.displayName}
                />
              </label>
              <label className="form-field">
                <span className="form-label-text">역할</span>
                <select
                  onChange={(event) => handleUserRoleChange(event.target.value as "ADMIN" | "BUSINESS")}
                  value={userForm.role}
                >
                  <option value="BUSINESS">사업부</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </label>
              {userForm.role === "BUSINESS" ? (
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
              ) : (
                <div />
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
    </AppLayout>
  );
}

const EMPTY_USER_FORM: CreateUserRequest = {
  username: "",
  role: "BUSINESS",
  departmentId: null,
  departmentName: null,
  displayName: "",
};
