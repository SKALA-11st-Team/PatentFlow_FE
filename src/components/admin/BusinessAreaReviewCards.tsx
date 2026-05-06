import type { CSSProperties } from "react";
import type { PatentListItem } from "../../types/patent";

interface BusinessAreaReviewCardsProps {
  onSelectBusinessArea: (businessArea: string) => void;
  patents: PatentListItem[];
}

interface BusinessAreaSummary {
  businessArea: string;
  color: string;
  departmentNames: string[];
  share: number;
  totalCount: number;
}

type BusinessAreaSummaryDraft = Omit<BusinessAreaSummary, "color">;

const businessAreaChartColors = ["#EA002C", "#009A93", "#F47725", "#5B5F97", "#2F80ED", "#8A5CF6", "#5A6B2F"];

/**
 * @relatedFR FR-001, FR-002, FR-009, FR-012
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드에서 관련사업 분야별 특허 검토 현황을 카드로 요약한다.
 */
export function BusinessAreaReviewCards({
  onSelectBusinessArea,
  patents,
}: BusinessAreaReviewCardsProps) {
  const summaries = getBusinessAreaSummaries(patents);

  return (
    <section className="section business-area-review-section">
      <div className="section-header">
        <div>
          <h2>관련 사업별 특허 현황</h2>
          <p>관련사업 분야 기준으로 보유 특허 수를 확인하고, 선택한 사업의 특허 목록을 조회합니다.</p>
        </div>
      </div>
      <div className="business-area-overview">
        <div className="business-area-chart-panel">
          <div aria-label="관련 사업별 특허 수 비중" className="business-area-distribution-chart">
            {summaries.map((summary, index) => (
              <button
                aria-label={`${summary.businessArea} ${summary.totalCount}건, ${summary.share}%`}
                className="business-area-chart-segment"
                key={summary.businessArea}
                onClick={() => onSelectBusinessArea(summary.businessArea)}
                style={getSegmentStyle(summary, summaries.slice(0, index))}
                title={`${summary.businessArea} ${summary.totalCount}건`}
                type="button"
              />
            ))}
          </div>
          <div className="business-area-chart-total">
            <strong>{patents.length}</strong>
            <span>전체 특허</span>
          </div>
        </div>
        <div className="business-area-list">
          {summaries.map((summary) => (
            <button
              className="business-area-card"
              key={summary.businessArea}
              onClick={() => onSelectBusinessArea(summary.businessArea)}
              type="button"
            >
              <span className="business-area-dot" style={{ background: summary.color }} />
              <div>
                <strong>{summary.businessArea}</strong>
                <span>{formatDepartmentNames(summary.departmentNames)}</span>
              </div>
              <b>{summary.totalCount}</b>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * @relatedFR FR-001, FR-002, FR-009, FR-012
 * @relatedUI UI-LEGAL-01
 * @description 관련사업 분야별 특허 수와 주요 workflow 대기 건수를 집계한다.
 */
function getBusinessAreaSummaries(patentList: PatentListItem[]) {
  const summaryMap = new Map<string, BusinessAreaSummaryDraft>();
  const totalPatentCount = patentList.length || 1;

  patentList.forEach((patent) => {
    const businessArea = patent.businessArea || "미분류";
    const currentSummary =
      summaryMap.get(businessArea) ??
      {
        businessArea,
        departmentNames: [] as string[],
        share: 0,
        totalCount: 0,
      };

    currentSummary.totalCount += 1;

    if (!currentSummary.departmentNames.includes(patent.departmentName)) {
      currentSummary.departmentNames.push(patent.departmentName);
    }

    summaryMap.set(businessArea, currentSummary);
  });

  return Array.from(summaryMap.values())
    .map((summary, index) => ({
      ...summary,
      color: businessAreaChartColors[index % businessAreaChartColors.length],
      share: Number(((summary.totalCount / totalPatentCount) * 100).toFixed(2)),
    }))
    .sort(compareBusinessAreaSummaries);
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01
 * @description 단일 사업별 분포 그래프의 각 조각 위치와 색상을 계산한다.
 */
function getSegmentStyle(summary: BusinessAreaSummary, previousSummaries: BusinessAreaSummary[]) {
  const start = previousSummaries.reduce((total, item) => total + item.share, 0);

  return {
    "--business-area-color": summary.color,
    "--business-area-start": `${start}%`,
    "--business-area-end": `${start + summary.share}%`,
  } as CSSProperties;
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01
 * @description 관련사업 분야 카드의 표시 순서를 이번 분기 검토 건수와 이름 기준으로 정렬한다.
 */
function compareBusinessAreaSummaries(firstSummary: BusinessAreaSummary, secondSummary: BusinessAreaSummary) {
  if (firstSummary.totalCount !== secondSummary.totalCount) {
    return secondSummary.totalCount - firstSummary.totalCount;
  }

  return firstSummary.businessArea.localeCompare(secondSummary.businessArea, "ko");
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-01
 * @description 관련사업 분야에 연결된 담당 부서명을 카드 보조 문구로 표시한다.
 */
function formatDepartmentNames(departmentNames: string[]) {
  return departmentNames.length > 2
    ? `${departmentNames.slice(0, 2).join(", ")} 외 ${departmentNames.length - 2}`
    : departmentNames.join(", ");
}
