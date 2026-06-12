import { useEffect, useMemo, useState } from "react";
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
 * @description F4/AUDIT-02: 변경 이력(감사 로그) — 누가 언제 AI 레포트를 고치고, 납부일을 조정하고,
 * 최종 결정을 내렸는지 추적한다. 특허 ID를 몰라도 전체 이력이 바로 보이고, 특허명·관리번호·작업자
 * 키워드로 좁힐 수 있다.
 */
export function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("변경 이력을 불러오는 중입니다.");

  useEffect(() => {
    let isMounted = true;
    getAuditLogs({ type: typeFilter === "ALL" ? undefined : typeFilter })
      .then((nextEntries) => {
        if (!isMounted) return;
        setEntries(nextEntries);
        setMessage(nextEntries.length === 0 ? "아직 기록된 변경 이력이 없습니다." : "");
      })
      .catch(() => {
        if (isMounted) setMessage("변경 이력을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
      });
    return () => {
      isMounted = false;
    };
  }, [typeFilter]);

  // 항목7: 특허 ID를 정확히 입력해야 했던 필터를 키워드 검색으로 대체 — 특허명/관리번호/작업자/내용 전체 대상.
  const visibleEntries = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter((entry) =>
      [entry.patentTitle, entry.managementNumber, entry.patentId, entry.actor, entry.summary].some(
        (value) => value?.toLowerCase().includes(normalized),
      ),
    );
  }, [entries, keyword]);

  return (
    <AppLayout
      role="ADMIN"
      title="변경 이력"
      description="AI 레포트 편집, 연차료 납부일 조정, 최종 결정이 언제 누구에 의해 이루어졌는지 추적합니다."
    >
      <Breadcrumbs items={[{ label: "변경 이력" }]} />
      <Section
        title="이력 조회"
        description="중요 변경(AI 레포트 편집 · 연차료 조정 · 최종 결정)은 자동으로 기록됩니다. 특허명이나 작업자로 검색해 보세요."
      >
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
            <span>검색</span>
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="특허명, 관리번호, 작업자, 내용"
              type="search"
              value={keyword}
            />
          </label>
        </div>
        {message ? <p className="empty-state">{message}</p> : null}
        {!message && visibleEntries.length === 0 ? (
          <p className="empty-state">검색 조건에 해당하는 변경 이력이 없습니다.</p>
        ) : null}
        {visibleEntries.length > 0 ? (
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
                {visibleEntries.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`}>
                    <td>{entry.occurredAt ? entry.occurredAt.replace("T", " ").slice(0, 16) : "—"}</td>
                    <td>
                      <Badge tone={TYPE_TONES[entry.type]}>{TYPE_LABELS[entry.type]}</Badge>
                    </td>
                    <td>
                      <Link to={`/admin/patents/${entry.patentId}`}>
                        <strong>{entry.patentTitle ?? entry.patentId}</strong>
                      </Link>
                      <span className="table-subtext">{entry.managementNumber ?? entry.patentId}</span>
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
