/**
 * @author 유건욱
 * @date 2026-06-12
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { deletePatentPdf, downloadPatentPdf, getPatentPdfMeta, uploadPatentPdf } from "../../api/patents";
import { getApiErrorMessage } from "../../api/client";
import { Button } from "../common/Button";
import type { PatentPdfMeta } from "../../types/patent";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

/**
 * @relatedFR FR-LEGAL-13
 * @relatedUI UI-LEGAL-03, UI-LEGAL-04
 * @description MAIL-13: 특허 PDF 첨부 관리 위젯 — TW·UAE 등 KIPRIS로 공개전문을 가져올 수 없는
 * 국가의 특허에 법무팀이 PDF를 직접 업로드/교체/삭제한다. 첨부본은 메일 PDF 안내와
 * 상세 화면 다운로드 버튼의 원본이 된다.
 */
export function PatentPdfManager({ patentId }: { patentId: string }) {
  const [meta, setMeta] = useState<PatentPdfMeta | null>(null);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    getPatentPdfMeta(patentId)
      .then((nextMeta) => {
        if (isMounted) {
          setMeta(nextMeta);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMeta(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [patentId]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("PDF 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setMessage("PDF 파일은 50MB를 넘을 수 없습니다.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const nextMeta = await uploadPatentPdf(patentId, file);
      setMeta(nextMeta);
      setMessage("특허 PDF가 업로드되었습니다. 메일 안내와 상세 화면 다운로드에 사용됩니다.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "특허 PDF 업로드에 실패했습니다."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    setIsBusy(true);
    setMessage("");
    try {
      await deletePatentPdf(patentId);
      setMeta((current) => (current ? { ...current, exists: false, docName: null, contentLength: null } : current));
      setMessage("업로드된 특허 PDF를 삭제했습니다.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "특허 PDF 삭제에 실패했습니다."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownload() {
    try {
      await downloadPatentPdf(patentId, meta?.docName ?? null);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "특허 PDF 다운로드에 실패했습니다."));
    }
  }

  const hasUpload = meta?.exists && meta.storageType === "UPLOADED";

  return (
    <div className="context-suggestion-row">
      <div>
        <strong>특허 PDF 첨부</strong>
        <span>
          {hasUpload
            ? `${meta?.docName ?? "특허 PDF"} (${formatBytes(meta?.contentLength)}) · 업로드: ${meta?.uploadedBy ?? "-"}`
            : "KIPRIS로 공개전문 PDF를 가져올 수 없는 국가(대만·UAE 등)는 여기에서 직접 업로드합니다."}
        </span>
        {message ? <span className="table-subtext">{message}</span> : null}
      </div>
      <div className="form-actions">
        <input
          accept=".pdf,application/pdf"
          aria-label="특허 PDF 파일 선택"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        {hasUpload ? (
          <>
            <Button disabled={isBusy} onClick={handleDownload} type="button" variant="secondary">
              다운로드
            </Button>
            <Button disabled={isBusy} onClick={handleDelete} type="button" variant="secondary">
              삭제
            </Button>
          </>
        ) : null}
        <Button disabled={isBusy} onClick={() => fileInputRef.current?.click()} type="button" variant="secondary">
          {isBusy ? "처리 중" : hasUpload ? "PDF 교체" : "PDF 업로드"}
        </Button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return "0KB";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
