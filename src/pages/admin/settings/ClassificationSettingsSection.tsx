/**
 * @author 유건욱
 * @date 2026-06-04
 */
import { useEffect, useState } from "react";
import { Button } from "../../../components/common/Button";
import { IconButton } from "../../../components/common/IconButton";
import { PaginationControls } from "../../../components/common/PaginationControls";
import {
  addClassification,
  deleteClassification,
  renameClassification,
  type ClassificationGroup,
  type ClassificationType,
} from "../../../api/settings";

interface ClassificationSettingsSectionProps {
  classifications: ClassificationGroup[];
  classificationMessage: string;
  onClassificationUpdate: (type: ClassificationType, updater: () => Promise<ClassificationGroup>) => Promise<void>;
}

/**
 * @relatedFR FR-LEGAL-25
 * @relatedUI UI-LEGAL-07
 * @description 사업/기술 분류 기준값을 추가·삭제·이름변경하는 관리자 설정 섹션.
 */
export function ClassificationSettingsSection({
  classifications,
  classificationMessage,
  onClassificationUpdate,
}: ClassificationSettingsSectionProps) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>사업/기술 분류 관리</h2>
          <p>기존 사업은 종료된 사업을 의미합니다. 특허 등록, 필터, AI 레포트에서 같은 기준값을 사용합니다.</p>
        </div>
      </div>
      {classificationMessage ? <p className="notice notice-compact" style={{ marginBottom: "1rem" }}>{classificationMessage}</p> : null}
      <div className="settings-grid">
        {classifications.map((group) => (
          <ClassificationEditor
            group={group}
            key={group.type}
            onAdd={(value) => onClassificationUpdate(group.type, () => addClassification(group.type, value))}
            onDelete={(value) => onClassificationUpdate(group.type, () => deleteClassification(group.type, value))}
            onRename={(currentValue, nextValue) =>
              onClassificationUpdate(group.type, () => renameClassification(group.type, currentValue, nextValue))
            }
          />
        ))}
      </div>
    </section>
  );
}

// 항목13: 리스트가 길어져도 카드 높이가 틀어지지 않도록 페이지 크기를 고정한다.
const CLASSIFICATION_PAGE_SIZE = 8;

function ClassificationEditor({
  group,
  onAdd,
  onDelete,
  onRename,
}: {
  group: ClassificationGroup;
  onAdd: (value: string) => Promise<void>;
  onDelete: (value: string) => Promise<void>;
  onRename: (currentValue: string, nextValue: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [editingNextValue, setEditingNextValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const title = group.type === "BUSINESS" ? "사업 분류" : "기술 분류";
  const totalPages = Math.max(1, Math.ceil(group.values.length / CLASSIFICATION_PAGE_SIZE));
  const pagedValues = group.values.slice(
    (currentPage - 1) * CLASSIFICATION_PAGE_SIZE,
    currentPage * CLASSIFICATION_PAGE_SIZE,
  );

  // 삭제 등으로 페이지 수가 줄면 마지막 페이지로 보정한다.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  async function run(action: () => Promise<void>) {
    setIsSaving(true);
    await action().finally(() => setIsSaving(false));
  }

  return (
    <div className="settings-card">
      <div className="section-header section-header-compact">
        <div>
          <h3>{title}</h3>
          <p>{group.values.length}개 기준값</p>
        </div>
      </div>
      <div className="inline-form-row">
        <input
          onChange={(event) => setNewValue(event.target.value)}
          placeholder={`${title} 추가`}
          value={newValue}
        />
        <Button
          disabled={isSaving || !newValue.trim()}
          onClick={() => run(async () => {
            await onAdd(newValue);
            setNewValue("");
          })}
          type="button"
          variant="secondary"
        >
          추가
        </Button>
      </div>
      <div className="classification-list classification-list-fixed">
        {pagedValues.map((value) => (
          <div className="classification-row" key={value}>
            {editingValue === value ? (
              <input
                autoFocus
                onChange={(event) => setEditingNextValue(event.target.value)}
                value={editingNextValue}
              />
            ) : (
              <span>{value}</span>
            )}
            <div className="table-cell-actions">
              {editingValue === value ? (
                <>
                  <Button
                    disabled={isSaving || !editingNextValue.trim()}
                    onClick={() => run(async () => {
                      await onRename(value, editingNextValue);
                      setEditingValue("");
                      setEditingNextValue("");
                    })}
                    type="button"
                    variant="secondary"
                  >
                    저장
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      setEditingValue("");
                      setEditingNextValue("");
                    }}
                    type="button"
                    variant="secondary"
                  >
                    취소
                  </Button>
                </>
              ) : (
                <>
                  {/* 항목14: 행 단위 동작은 아이콘 버튼으로 대체한다. */}
                  <IconButton
                    disabled={isSaving}
                    icon="edit"
                    label={`${value} 수정`}
                    onClick={() => {
                      setEditingValue(value);
                      setEditingNextValue(value);
                    }}
                  />
                  <IconButton
                    disabled={isSaving}
                    icon="delete"
                    label={`${value} 삭제`}
                    onClick={() => run(() => onDelete(value))}
                    tone="danger"
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <PaginationControls
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={CLASSIFICATION_PAGE_SIZE}
        totalItems={group.values.length}
        totalPages={totalPages}
      />
    </div>
  );
}
