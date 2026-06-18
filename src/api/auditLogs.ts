/**
 * @author 유건욱
 * @date 2026-06-12
 */
import { isBackendApiEnabled, requestJson, toQueryString, type ApiEnvelope } from "./client";

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-24
 * @description F4: 통합 감사 로그 — AI 레포트 편집/연차료 조정/최종 결정 이력 조회.
 */
export type AuditLogType = "AI_REPORT_EDIT" | "FEE_ADJUSTMENT" | "FINAL_DECISION";

export interface AuditLogEntry {
  id: string;
  type: AuditLogType;
  patentId: string;
  // AUDIT-02(항목7): 특허 ID만으로는 식별이 어려워 BE가 관리번호·특허명을 함께 내려준다.
  managementNumber: string | null;
  patentTitle: string | null;
  actor: string | null;
  summary: string;
  occurredAt: string | null;
}

export async function getAuditLogs(
  query: { type?: string; patentId?: string; limit?: number } = {},
): Promise<AuditLogEntry[]> {
  if (!isBackendApiEnabled()) {
    return [];
  }
  const response = await requestJson<ApiEnvelope<AuditLogEntry[]>>(`/legal/audit-logs${toQueryString(query)}`);
  return response.data ?? [];
}
