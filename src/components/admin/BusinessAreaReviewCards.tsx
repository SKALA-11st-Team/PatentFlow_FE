import { useEffect, useState } from "react";
import { PaginationControls } from "../common/PaginationControls";
import type { PatentListItem } from "../../types/patent";

interface BusinessAreaReviewCardsProps {
  onSelectContext: (context: PatentContextSelection) => void;
  patents: PatentListItem[];
}

interface PatentContextSelection {
  dimension: PatentContextDimensionKey;
  queryParam: PatentContextQueryParam;
  value: string;
}

interface PatentContextDimension {
  description: string;
  key: PatentContextDimensionKey;
  label: string;
  queryParam: PatentContextQueryParam;
  getPrimaryValue: (patent: PatentListItem) => string;
  getSecondaryValue: (patent: PatentListItem) => string;
}

interface PatentContextSummary {
  color: string;
  relatedLabels: string[];
  share: number;
  totalCount: number;
  value: string;
}

type PatentContextSummaryDraft = Omit<PatentContextSummary, "color">;
type PatentContextDimensionKey = "BUSINESS_AREA" | "TECHNOLOGY_AREA" | "PRODUCT";
type PatentContextQueryParam = "businessArea" | "technologyArea" | "productName";

const businessAreaChartColors = ["#EA002C", "#009A93", "#F47725", "#5B5F97", "#2F80ED", "#8A5CF6", "#5A6B2F"];
const contextCardPageSize = 8;

const patentContextDimensions: PatentContextDimension[] = [
  {
    description: "사업 기준으로 특허를 봅니다.",
    getPrimaryValue: (patent) => patent.businessArea,
    getSecondaryValue: (patent) => patent.departmentName,
    key: "BUSINESS_AREA",
    label: "관련 사업",
    queryParam: "businessArea",
  },
  {
    description: "기술 기준으로 특허를 봅니다.",
    getPrimaryValue: (patent) => patent.technologyArea,
    getSecondaryValue: (patent) => patent.businessArea,
    key: "TECHNOLOGY_AREA",
    label: "관련 기술",
    queryParam: "technologyArea",

  },
  {
    description: "제품 기준으로 특허를 봅니다.",
    getPrimaryValue: (patent) => patent.productName,
    getSecondaryValue: (patent) => patent.technologyArea,
    key: "PRODUCT",
    label: "관련 제품",
    queryParam: "productName",
  },
];

/**
 * @relatedFR FR-001, FR-002, FR-009, FR-012
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드에서 관련 사업/기술/제품별 특허 검토 현황을 탭 카드로 요약한다.
 */
export function BusinessAreaReviewCards({
  onSelectContext,
  patents,
}: BusinessAreaReviewCardsProps) {
  const [activeDimensionKey, setActiveDimensionKey] = useState<PatentContextDimensionKey>("BUSINESS_AREA");
  const [currentPage, setCurrentPage] = useState(1);
  const activeDimension =
    patentContextDimensions.find((dimension) => dimension.key === activeDimensionKey) ?? patentContextDimensions[0];
  const summaries = getPatentContextSummaries(patents, activeDimension);
  const shouldPaginateCards = summaries.length > contextCardPageSize;
  const totalPages = Math.max(1, Math.ceil(summaries.length / contextCardPageSize));
  const pagedSummaries = shouldPaginateCards
    ? summaries.slice((currentPage - 1) * contextCardPageSize, currentPage * contextCardPageSize)
    : summaries;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeDimensionKey]);

  return (
    <section className="section business-area-review-section">
      <div className="section-header">
        <div>
          <h2>{activeDimension.label}별 특허 현황</h2>
          <p>{activeDimension.description}</p>
        </div>
        <div aria-label="특허 현황 분류 기준" className="context-tabs" role="tablist">
          {patentContextDimensions.map((dimension) => (
            <button
              aria-selected={dimension.key === activeDimension.key}
              className={dimension.key === activeDimension.key ? "selected" : ""}
              key={dimension.key}
              onClick={() => setActiveDimensionKey(dimension.key)}
              role="tab"
              type="button"
            >
              {dimension.label}
            </button>
          ))}
        </div>
      </div>
      <div className="business-area-overview">
        <div className="context-summary-panel business-area-summary-panel">
          <div>
            <strong>{patents.length}</strong>
            <span>전체 특허</span>
          </div>
          <div>
            <strong>{summaries.length}</strong>
            <span>{activeDimension.label} 분류</span>
          </div>
          <p>항목을 누르면 해당 특허 목록으로 이동합니다.</p>
        </div>
        <div className="business-area-list-panel">
          <div className="business-area-list">
            {pagedSummaries.map((summary) => (
              <button
                className="business-area-card"
                key={summary.value}
                onClick={() => onSelectContext(toPatentContextSelection(activeDimension, summary.value))}
                type="button"
              >
                <span className="business-area-dot" style={{ background: summary.color }} />
                <div>
                  <strong>{summary.value}</strong>
                  {summary.relatedLabels.length > 0 ? <span>{summary.relatedLabels[0]}</span> : null}
                </div>
                <b>{summary.totalCount}</b>
              </button>
            ))}
          </div>
          {shouldPaginateCards && summaries.length > contextCardPageSize ? (
            <PaginationControls
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={contextCardPageSize}
              totalItems={summaries.length}
              totalPages={totalPages}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * @relatedFR FR-001, FR-002, FR-009, FR-012
 * @relatedUI UI-LEGAL-01
 * @description 선택된 특허 컨텍스트 기준별 특허 수와 연관 라벨을 집계한다.
 */
function getPatentContextSummaries(patentList: PatentListItem[], dimension: PatentContextDimension) {
  const summaryMap = new Map<string, PatentContextSummaryDraft>();
  const totalPatentCount = patentList.length || 1;

  patentList.forEach((patent) => {
    const value = getDisplayValue(dimension.getPrimaryValue(patent));
    const relatedLabel = getDisplayValue(dimension.getSecondaryValue(patent));
    const currentSummary =
      summaryMap.get(value) ??
      {
        relatedLabels: [] as string[],
        share: 0,
        totalCount: 0,
        value,
      };

    currentSummary.totalCount += 1;

    if (!currentSummary.relatedLabels.includes(relatedLabel)) {
      currentSummary.relatedLabels.push(relatedLabel);
    }

    summaryMap.set(value, currentSummary);
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
 * @description 컨텍스트별 카드의 표시 순서를 특허 건수와 이름 기준으로 정렬한다.
 */
function compareBusinessAreaSummaries(firstSummary: PatentContextSummary, secondSummary: PatentContextSummary) {
  if (firstSummary.totalCount !== secondSummary.totalCount) {
    return secondSummary.totalCount - firstSummary.totalCount;
  }

  return firstSummary.value.localeCompare(secondSummary.value, "ko");
}

/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-LEGAL-01
 * @description 대시보드 컨텍스트 카드 선택값을 검토 대상 드릴다운 query 정보로 변환한다.
 */
function toPatentContextSelection(dimension: PatentContextDimension, value: string): PatentContextSelection {
  return {
    dimension: dimension.key,
    queryParam: dimension.queryParam,
    value,
  };
}

/**
 * @relatedFR FR-001
 * @relatedUI UI-LEGAL-01
 * @description 특허 컨텍스트 분류값이 비어 있을 때 대시보드 표시용 문구를 반환한다.
 */
function getDisplayValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue && normalizedValue !== "N/A" ? normalizedValue : "미분류";
}
