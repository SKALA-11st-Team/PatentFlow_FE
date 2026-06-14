import { useState } from "react";
import { getApiErrorMessage } from "../../api/client";
import type { Department } from "../../api/departments";
import { assignPatentDepartment } from "../../api/patents";
import { useToast } from "../common/toastContext";

interface DepartmentAssignerProps {
  patentId: string;
  currentDepartmentId: string | null;
  currentDepartmentName: string | null;
  departments: Department[];
  onAssignSuccess: (deptId: string, deptName: string) => void;
  variant?: "border" | "no-border";
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02, FR-LEGAL-12
 * @relatedUI UI-LEGAL-01, UI-LEGAL-02, UI-LEGAL-03
 * @description 특허 목록에서 사업부를 즉시 배정하거나 수정하는 컴포넌트
 */
export function DepartmentAssigner({
  patentId,
  currentDepartmentId,
  currentDepartmentName,
  departments,
  onAssignSuccess,
  variant = "no-border",
}: DepartmentAssignerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [assigningDeptId, setAssigningDeptId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const { showToast } = useToast();

  async function handleAssign() {
    if (!assigningDeptId) return;
    setIsAssigning(true);
    try {
      await assignPatentDepartment(patentId, assigningDeptId);
      const assigned = departments.find((d) => d.departmentId === assigningDeptId);
      onAssignSuccess(assigningDeptId, assigned?.departmentName ?? assigningDeptId);
      setIsEditing(false);
      setAssigningDeptId("");
    } catch (error) {
      // 배정 실패 시 편집 모드를 유지하고 사용자에게 실패를 알린다.
      showToast(getApiErrorMessage(error, "사업부 배정에 실패했습니다."), "error");
    } finally {
      setIsAssigning(false);
    }
  }

  function startEditing() {
    setIsEditing(true);
    setAssigningDeptId(currentDepartmentId ?? "");
  }

  if (isEditing) {
    return (
      <div className="department-assigner" onClick={(e) => e.stopPropagation()}>
        <select
          className="department-assigner-select"
          onChange={(e) => setAssigningDeptId(e.target.value)}
          value={assigningDeptId}
        >
          <option value="">선택</option>
          {departments.map((d) => (
            <option key={d.departmentId} value={d.departmentId}>
              {d.departmentName}
            </option>
          ))}
        </select>
        <button
          className="department-assigner-btn"
          disabled={!assigningDeptId || isAssigning}
          onClick={handleAssign}
          type="button"
        >
          {isAssigning ? "저장 중" : "확인"}
        </button>
        <button
          className="department-assigner-cancel"
          onClick={() => setIsEditing(false)}
          type="button"
        >
          ✕
        </button>
      </div>
    );
  }

  const triggerClassName = `department-assigner-trigger ${
    variant === "no-border" ? "department-assigner-trigger-no-border" : ""
  }`;

  return (
    <button
      className={triggerClassName}
      onClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
      type="button"
    >
      <span className="table-subtext">{currentDepartmentName || "미지정"}</span>
    </button>
  );
}
