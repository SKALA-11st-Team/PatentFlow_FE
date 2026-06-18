/**
 * @author 유건욱
 * @date 2026-06-12
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuditLogs, type AuditLogEntry, type AuditLogType } from "../../api/auditLogs";
import { Badge } from "../../components/common/Badge";
import { PaginationControls } from "../../components/common/PaginationControls";
import { AppLayout } from "../../components/layout/AppLayout";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Section } from "../../components/common/Section";
import { useClientPagination } from "../../hooks/useClientPagination";

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

const AUDIT_SUMMARY_TYPES: AuditLogType[] = ["AI_REPORT_EDIT", "FEE_ADJUSTMENT", "FINAL_DECISION"];

/**
 * @relatedFR FR-LEGAL-09, FR-LEGAL-10, FR-LEGAL-24
 * @relatedUI UI-LEGAL-09
 * @description F4/AUDIT-02: 변경 추적(감사 로그) — 누가 언제 AI 레포트를 고치고, 납부일을 조정하고,
 * 최종 결정을 내렸는지 추적한다. 특허 ID를 몰라도 전체 이력이 바로 보이고, 특허명·관리번호·작업자
 * 키워드로 좁힐 수 있다.
 */
export function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("변경 추적 기록을 불러오는 중입니다.");

  // 전체 로드 후 타입·키워드 필터는 클라이언트에서 처리 — 요약 카드 숫자가 필터에 영향받지 않음.
  useEffect(() => {
    let isMounted = true;
    getAuditLogs()
      .then((nextEntries) => {
        if (!isMounted) return;
        setEntries(nextEntries);
        setMessage(nextEntries.length === 0 ? "아직 기록된 변경 추적 항목이 없습니다." : "");
      })
      .catch(() => {
        if (isMounted) setMessage("변경 추적 기록을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const summaryCounts = useMemo(
    () =>
      entries.reduce<Record<AuditLogType, number>>(
        (counts, entry) => ({ ...counts, [entry.type]: counts[entry.type] + 1 }),
        { AI_REPORT_EDIT: 0, FEE_ADJUSTMENT: 0, FINAL_DECISION: 0 },
      ),
    [entries],
  );

  const latestEntry = entries.length > 0 ? entries[0] : null;

  const filteredEntries = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesType = typeFilter === "ALL" || entry.type === (typeFilter as AuditLogType);
      const matchesKeyword =
        !normalized ||
        [entry.patentTitle, entry.managementNumber, entry.patentId, entry.actor, entry.summary].some(
          (value) => value?.toLowerCase().includes(normalized),
        );
      return matchesType && matchesKeyword;
    });
  }, [entries, typeFilter, keyword]);

  const {
    currentPage,
    pageSize,
    pagedItems: pagedEntries,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(filteredEntries, [typeFilter, keyword]);

  return (
    <AppLayout
      role="ADMIN"
      title="변경 이력"
      description="AI 레포트 편집 · 연차료 조정 · 최종 결정의 관리자 액션 이력을 확인합니다."
    >
      <Breadcrumbs items={[{ label: "변경 이력" }]} />
      <div className="audit-summary-grid" aria-label="변경 유형별 요약">
        {AUDIT_SUMMARY_TYPES.map((type) => (
          <div className="audit-summary-card" key={type}>
            <span>{TYPE_LABELS[type]}</span>
            <strong>{summaryCounts[type]}</strong>
            <small>기록된 변경</small>
          </div>
        ))}
        <div className="audit-summary-card">
          <span>전체 기록</span>
          <strong>{entries.length}</strong>
          <small>
            {latestEntry
              ? `최근: ${latestEntry.occurredAt?.slice(0, 10) ?? "—"} · ${latestEntry.actor ?? "—"}`
              : "기록 없음"}
          </small>
        </div>
      </div>
      <Section
        title="이력 조회"
        description="중요 변경(AI 레포트 편집 · 연차료 조정 · 최종 결정)은 자동으로 기록됩니다. 특허명이나 작업자로 검색해 보세요."
      >
        <div className="filter-bar">
          <label>
            <span>변경 유형</span>
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
        {!message && filteredEntries.length === 0 ? (
          <p className="empty-state">검색 조건에 해당하는 변경 추적 항목이 없습니다.</p>
        ) : null}
        {pagedEntries.length > 0 ? (
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
                {pagedEntries.map((entry) => (
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
        {totalPages > 1 ? (
          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        ) : null}
      </Section>
    </AppLayout>
  );
}
