import { useState } from "react";
import { Button } from "../../../components/common/Button";
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
  const title = group.type === "BUSINESS" ? "사업 분류" : "기술 분류";

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
      <div className="classification-list">
        {group.values.map((value) => (
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
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      setEditingValue(value);
                      setEditingNextValue(value);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    수정
                  </Button>
                  <Button disabled={isSaving} onClick={() => run(() => onDelete(value))} type="button" variant="secondary">
                    삭제
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
