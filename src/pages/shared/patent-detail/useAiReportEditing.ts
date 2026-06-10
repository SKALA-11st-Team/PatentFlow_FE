import { useCallback, useState } from "react";
import {
  getPatentAiReportOriginal,
  revertPatentAiReport,
  updatePatentAiReport,
} from "../../../api/patents";
import type { AiEvaluationReport, AiReportOverridesPayload } from "../../../types/patent";

/**
 * @relatedFR FR-LEGAL-09
 * @relatedUI UI-LEGAL-04
 * @description AI 레포트 법무 편집 상태(편집 모달/원본 보기/되돌리기)를 관리한다.
 *     usePatentDetail 메가훅을 키우지 않기 위해 별도 훅으로 분리되어 있다.
 */
export function useAiReportEditing(
  patentId: string | undefined,
  report: AiEvaluationReport | null,
  onReportUpdated: (report: AiEvaluationReport) => void,
) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [originalReport, setOriginalReport] = useState<AiEvaluationReport | null>(null);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);

  const handleSaveEdit = useCallback(
    async (overrides: AiReportOverridesPayload) => {
      if (!patentId || !report) return false;
      setIsSavingEdit(true);
      setEditMessage("");
      try {
        const updated = await updatePatentAiReport(patentId, {
          baseReportId: report.evaluationId,
          expectedEditVersion: report.editVersion ?? 0,
          overrides,
        });
        if (updated) {
          onReportUpdated(updated);
          setIsEditModalOpen(false);
          setIsShowingOriginal(false);
          setOriginalReport(null);
          setEditMessage("레포트 수정 내용이 저장되었습니다.");
          return true;
        }
        setEditMessage("레포트 수정에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return false;
      } catch (error) {
        // 409: 레포트 재생성 또는 동시 편집 충돌 — BE 메시지를 그대로 노출한다.
        setEditMessage(error instanceof Error ? error.message : "레포트 수정에 실패했습니다.");
        return false;
      } finally {
        setIsSavingEdit(false);
      }
    },
    [patentId, report, onReportUpdated],
  );

  const handleRevertEdit = useCallback(async () => {
    if (!patentId) return;
    setIsSavingEdit(true);
    setEditMessage("");
    try {
      const reverted = await revertPatentAiReport(patentId);
      if (reverted) {
        onReportUpdated(reverted);
        setIsShowingOriginal(false);
        setOriginalReport(null);
        setEditMessage("AI 원본 레포트로 되돌렸습니다.");
      }
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "되돌리기에 실패했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  }, [patentId, onReportUpdated]);

  const handleToggleOriginal = useCallback(async () => {
    if (isShowingOriginal) {
      setIsShowingOriginal(false);
      return;
    }
    if (!patentId) return;
    setEditMessage("");
    try {
      const original = await getPatentAiReportOriginal(patentId);
      if (original) {
        setOriginalReport(original);
        setIsShowingOriginal(true);
      }
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "AI 원본을 불러오지 못했습니다.");
    }
  }, [patentId, isShowingOriginal]);

  return {
    isEditModalOpen,
    setIsEditModalOpen,
    isSavingEdit,
    editMessage,
    originalReport,
    isShowingOriginal,
    handleSaveEdit,
    handleRevertEdit,
    handleToggleOriginal,
  };
}
