import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuditLogs, type AuditLogEntry, type AuditLogType } from "../../api/auditLogs";
import { Badge } from "../../components/common/Badge";
import { AppLayout } from "../../components/layout/AppLayout";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Section } from "../../components/common/Section";

const TYPE_LABELS: Record<AuditLogType, string> = {
  AI_REPORT_EDIT: "AI 레포트 편집",
  FEE_ADJUSTMENT: "연차료 조정",
  FINAL_DECISION: "최종 결정",
};

const TYPE_TONES: Record<AuditLogType, "primary" | "warning" | "success"> = {
  AI_REPORT_EDIT: "primary",
  FEE_ADJUSTMENT: "warning",
  FINAL_DECISION: "success",
};

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-24
 * @relatedUI UI-LEGAL-04
 * @description F4: 통합 감사 로그 — AI 레포트 편집/연차료 조정/최종 결정 이력을 한 화면에서 추적한다.
 */
export function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [patentIdFilter, setPatentIdFilter] = useState("");
  const [message, setMessage] = useState("감사 로그를 불러오는 중입니다.");

  useEffect(() => {
    let isMounted = true;
    getAuditLogs({ type: typeFilter === "ALL" ? undefined : typeFilter, patentId: patentIdFilter || undefined })
      .then((nextEntries) => {
        if (!isMounted) return;
        setEntries(nextEntries);
        setMessage(nextEntries.length === 0 ? "조건에 해당하는 감사 로그가 없습니다." : "");
      })
      .catch(() => {
        if (isMounted) setMessage("감사 로그를 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
      });
    return () => {
      isMounted = false;
    };
  }, [typeFilter, patentIdFilter]);

  return (
    <AppLayout role="ADMIN" title="감사 로그" description="AI 레포트 편집, 연차료 조정, 최종 결정 이력을 추적합니다.">
      <Breadcrumbs items={[{ label: "감사 로그" }]} />
      <Section title="이력 조회" description="유형과 특허 ID로 필터링할 수 있습니다.">
        <div className="filter-bar">
          <label>
            <span>유형</span>
            <select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
              <option value="ALL">전체</option>
              <option value="AI_REPORT_EDIT">AI 레포트 편집</option>
              <option value="FEE_ADJUSTMENT">연차료 조정</option>
              <option value="FINAL_DECISION">최종 결정</option>
            </select>
          </label>
          <label>
            <span>특허 ID</span>
            <input
              onChange={(event) => setPatentIdFilter(event.target.value.trim())}
              placeholder="PAT-2026-0001"
              value={patentIdFilter}
            />
          </label>
        </div>
        {message ? <p className="empty-state">{message}</p> : null}
        {entries.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>시각</th>
                  <th>유형</th>
                  <th>특허</th>
                  <th>작업자</th>
                  <th>내용</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`}>
                    <td>{entry.occurredAt ? entry.occurredAt.replace("T", " ").slice(0, 16) : "—"}</td>
                    <td>
                      <Badge tone={TYPE_TONES[entry.type]}>{TYPE_LABELS[entry.type]}</Badge>
                    </td>
                    <td>
                      <Link to={`/admin/patents/${entry.patentId}`}>{entry.patentId}</Link>
                    </td>
                    <td>{entry.actor ?? "—"}</td>
                    <td>{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>
    </AppLayout>
  );
}
