import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import {
  createChecklistItem,
  deleteChecklistItem,
  getAdminChecklistItems,
  updateChecklistItem,
  type BusinessChecklistItemPayload,
} from "../../../api/settings";
import { Button } from "../../../components/common/Button";
import { useToast } from "../../../components/common/ToastProvider";
import type { BusinessChecklistItem } from "../../../types/businessChecklist";

const EMPTY_PAYLOAD: BusinessChecklistItemPayload = {
  category: "",
  title: "",
  description: "",
  score4Label: "",
  score3Label: "",
  score2Label: "",
  score1Label: "",
};

function toPayload(item: BusinessChecklistItem): BusinessChecklistItemPayload {
  const labelOf = (score: number) => item.options.find((option) => option.score === score)?.label ?? "";
  return {
    category: item.category,
    title: item.title,
    description: item.description ?? "",
    score4Label: labelOf(4),
    score3Label: labelOf(3),
    score2Label: labelOf(2),
    score1Label: labelOf(1),
  };
}

function isPayloadComplete(payload: BusinessChecklistItemPayload) {
  return Boolean(
    payload.category.trim() &&
      payload.title.trim() &&
      payload.score4Label.trim() &&
      payload.score3Label.trim() &&
      payload.score2Label.trim() &&
      payload.score1Label.trim(),
  );
}

/**
 * @relatedFR FR-BUS-01
 * @relatedUI UI-LEGAL-07
 * @description 리걸팀이 사업부 평가 체크리스트 항목(제목/설명/점수 라벨)을 편집하는 설정 섹션.
 *     변경은 이후 제출부터 적용되며 과거 제출 이력은 스냅샷으로 보존된다.
 */
export function ChecklistSettingsSection() {
  const { showToast } = useToast();
  const [items, setItems] = useState<BusinessChecklistItem[]>([]);
  const [loadMessage, setLoadMessage] = useState("체크리스트 항목을 불러오는 중입니다.");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessChecklistItemPayload>(EMPTY_PAYLOAD);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getAdminChecklistItems()
      .then((nextItems) => {
        if (!isMounted) return;
        setItems(nextItems);
        setLoadMessage("");
      })
      .catch((error) => {
        if (isMounted) setLoadMessage(getApiErrorMessage(error, "체크리스트 항목을 불러오지 못했습니다."));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const startEdit = (item: BusinessChecklistItem) => {
    setIsAdding(false);
    setEditingItemId(item.id);
    setDraft(toPayload(item));
  };

  const startAdd = () => {
    setEditingItemId(null);
    setIsAdding(true);
    setDraft(EMPTY_PAYLOAD);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setIsAdding(false);
    setDraft(EMPTY_PAYLOAD);
  };

  const handleSave = async () => {
    if (!isPayloadComplete(draft)) return;
    setIsSaving(true);
    try {
      if (isAdding) {
        const created = await createChecklistItem(draft);
        setItems((current) => [...current, created]);
        showToast(`체크리스트 항목 '${created.title}'이 추가되었습니다.`, "success");
      } else if (editingItemId) {
        const updated = await updateChecklistItem(editingItemId, draft);
        setItems((current) => current.map((item) => (item.id === editingItemId ? updated : item)));
        showToast(`체크리스트 항목 '${updated.title}'이 수정되었습니다.`, "success");
      }
      cancelEdit();
    } catch (error) {
      showToast(getApiErrorMessage(error, "체크리스트 항목 저장에 실패했습니다."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: BusinessChecklistItem) => {
    if (!window.confirm(`'${item.title}' 항목을 삭제할까요?\n이후 제출부터 적용되며 과거 제출 이력은 보존됩니다.`)) {
      return;
    }
    try {
      await deleteChecklistItem(item.id);
      setItems((current) => current.filter((current2) => current2.id !== item.id));
      if (editingItemId === item.id) cancelEdit();
      showToast(`체크리스트 항목 '${item.title}'이 삭제되었습니다.`, "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "체크리스트 항목 삭제에 실패했습니다."), "error");
    }
  };

  const renderDraftForm = () => (
    <div className="checklist-item-form">
      <div className="checklist-item-form-row">
        <label className="field-label">
          분류
          <input
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            placeholder="기술적 가치 / 경제적 가치"
            value={draft.category}
          />
        </label>
        <label className="field-label">
          항목명
          <input
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="기술완성도"
            value={draft.title}
          />
        </label>
      </div>
      <label className="field-label">
        설명
        <input
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          placeholder="평가 기준에 대한 설명"
          value={draft.description}
        />
      </label>
      {([
        ["score4Label", "4점(최고) 라벨"],
        ["score3Label", "3점 라벨"],
        ["score2Label", "2점 라벨"],
        ["score1Label", "1점(최저) 라벨"],
      ] as const).map(([key, label]) => (
        <label className="field-label" key={key}>
          {label}
          <input
            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
            value={draft[key]}
          />
        </label>
      ))}
      <div className="inline-action-group">
        <Button onClick={cancelEdit} type="button" variant="secondary">
          취소
        </Button>
        <Button disabled={!isPayloadComplete(draft) || isSaving} onClick={handleSave} type="button">
          {isSaving ? "저장 중..." : isAdding ? "항목 추가" : "항목 저장"}
        </Button>
      </div>
    </div>
  );

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>사업부 체크리스트 관리</h2>
          <p>
            사업부가 의견 제출 시 작성하는 평가 항목과 점수 라벨을 편집합니다. 변경은 이후 제출부터
            적용되며 과거 제출 이력은 제출 시점 스냅샷으로 보존됩니다.
          </p>
        </div>
        <Button onClick={startAdd} type="button" variant="secondary">
          항목 추가
        </Button>
      </div>

      {loadMessage ? <p className="notice notice-compact">{loadMessage}</p> : null}
      {isAdding ? renderDraftForm() : null}

      <div className="checklist-item-list">
        {items.map((item) => (
          <div className="checklist-item-card" key={item.id}>
            <div className="checklist-item-head">
              <div>
                <small>{item.category}</small>
                <strong>{item.title}</strong>
                {item.description ? <p>{item.description}</p> : null}
              </div>
              <div className="inline-action-group">
                <Button onClick={() => startEdit(item)} type="button" variant="secondary">
                  수정
                </Button>
                <Button onClick={() => handleDelete(item)} type="button" variant="secondary">
                  삭제
                </Button>
              </div>
            </div>
            {editingItemId === item.id ? (
              renderDraftForm()
            ) : (
              <ol className="checklist-item-options">
                {item.options.map((option) => (
                  <li key={option.score}>
                    <b>{option.score}점</b> {option.label}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
