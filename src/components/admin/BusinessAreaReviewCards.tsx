import { useEffect, useState } from "react";
import { PaginationControls } from "../common/PaginationControls";
import type { AreaDistribution, AreaGroup } from "../../api/dashboard";

interface BusinessAreaReviewCardsProps {
  distribution: AreaDistribution;
  isLoading?: boolean;
  onSelectContext: (context: PatentContextSelection) => void;
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
  selectGroups: (distribution: AreaDistribution) => AreaGroup[];
}

interface PatentContextSummary {
  color: string;
  relatedLabels: string[];
  share: number;
  totalCount: number;
  value: string;
}

type PatentContextDimensionKey = "BUSINESS_AREA" | "TECHNOLOGY_AREA" | "PRODUCT" | "COUNTRY";
type PatentContextQueryParam = "businessArea" | "technologyArea" | "productName" | "country";

const businessAreaChartColors = ["#EA002C", "#009A93", "#F47725", "#5B5F97", "#2F80ED", "#8A5CF6", "#5A6B2F"];
const contextCardPageSize = 8;

// DASH-F3: 분포 데이터(value/count/relatedLabels)는 서버(또는 mock 집계)에서 받고, 여기서는 차원 선택만 한다.
const patentContextDimensions: PatentContextDimension[] = [
  {
    description: "사업 기준으로 특허를 봅니다.",
    key: "BUSINESS_AREA",
    label: "관련 사업",
    queryParam: "businessArea",
    selectGroups: (distribution) => distribution.businessArea,
  },
  {
    description: "기술 기준으로 특허를 봅니다.",
    key: "TECHNOLOGY_AREA",
    label: "관련 기술",
    queryParam: "technologyArea",
    selectGroups: (distribution) => distribution.technologyArea,
  },
  {
    description: "제품 기준으로 특허를 봅니다.",
    key: "PRODUCT",
    label: "관련 제품",
    queryParam: "productName",
    selectGroups: (distribution) => distribution.product,
  },
  // DASH-F4(항목2): TW·UAE 등 국가별 특허 묶음을 바로 조회할 수 있게 한다.
  {
    description: "출원 국가 기준으로 특허 묶음을 확인합니다.",
    key: "COUNTRY",
    label: "출원 국가",
    queryParam: "country",
    selectGroups: (distribution) => distribution.country,
  },
];

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01
 * @description 관리자 대시보드에서 관련 사업/기술/제품별 특허 검토 현황을 탭 카드로 요약한다.
 */
export function BusinessAreaReviewCards({
  distribution,
  isLoading = false,
  onSelectContext,
}: BusinessAreaReviewCardsProps) {
  const [activeDimensionKey, setActiveDimensionKey] = useState<PatentContextDimensionKey>("BUSINESS_AREA");
  const [currentPage, setCurrentPage] = useState(1);
  const activeDimension =
    patentContextDimensions.find((dimension) => dimension.key === activeDimensionKey) ?? patentContextDimensions[0];
  const summaries = toContextSummaries(activeDimension.selectGroups(distribution), distribution.totalCount);
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
      <div aria-busy={isLoading} className="business-area-overview">
        <div className="context-summary-panel business-area-summary-panel">
          <div>
            {isLoading ? <span className="dashboard-loading-number" /> : <strong>{distribution.totalCount}</strong>}
            <span>전체 특허</span>
          </div>
          <div>
            {isLoading ? <span className="dashboard-loading-number" /> : <strong>{summaries.length}</strong>}
            <span>{activeDimension.label} 분류</span>
          </div>
          <p>항목을 누르면 해당 특허 목록으로 이동합니다.</p>
        </div>
        <div className="business-area-list-panel">
          <div className="business-area-list">
            {isLoading ? Array.from({ length: 4 }).map((_, index) => (
              <div aria-hidden="true" className="business-area-card business-area-loading-card" key={index}>
                <span className="business-area-dot" />
                <div>
                  <span className="dashboard-loading-line dashboard-loading-line-main" />
                  <span className="dashboard-loading-line dashboard-loading-line-sub" />
                </div>
                <span className="dashboard-loading-count" />
              </div>
            )) : pagedSummaries.map((summary) => (
              <button
                className="business-area-card"
                key={summary.value}
                onClick={() => onSelectContext(toPatentContextSelection(activeDimension, summary.value))}
                type="button"
              >
                <span className="business-area-dot" style={{ background: summary.color }} />
                <div>
                  <strong>{summary.value}</strong>
                  {activeDimension.key !== "COUNTRY" && summary.relatedLabels.length > 0 ? (
                    <span>{summary.relatedLabels[0]}</span>
                  ) : null}
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
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
 * @relatedUI UI-LEGAL-01
 * @description 서버 집계 분포 그룹에 표시용 색상·비율을 입히고 건수·이름 기준으로 정렬한다.
 */
function toContextSummaries(groups: AreaGroup[], totalCount: number): PatentContextSummary[] {
  const denominator = totalCount || 1;

  return groups
    .map((group, index) => ({
      color: businessAreaChartColors[index % businessAreaChartColors.length],
      relatedLabels: group.relatedLabels,
      share: Number(((group.count / denominator) * 100).toFixed(2)),
      totalCount: group.count,
      value: group.value,
    }))
    .sort(compareBusinessAreaSummaries);
}

/**
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
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
 * @relatedFR FR-LEGAL-01, FR-LEGAL-02
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
