import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { PaginationControls } from "../../components/common/PaginationControls";
import { Section } from "../../components/common/Section";
import { TableLoadingRows } from "../../components/common/TableLoadingRows";
import { getBusinessSubmissionVersions, getLatestBusinessSubmission } from "../../api/businessSubmissions";
import { useClientPagination } from "../../hooks/useClientPagination";
import { usePatentList } from "../../hooks/usePatentList";
import { businessOpinionLabels, getBusinessOpinionTone, reviewWorkflowStatusLabels } from "../../constants/status";
import type { BusinessSubmissionVersion } from "../../types/businessSubmission";

/**
 * @relatedFR FR-BUS-01, FR-LEGAL-11
 * @relatedUI UI-BUS-04
 * @description 사업부 사용자가 제출한 의견 이력을 확인하는 화면
 */
export function BusinessSubmissionHistoryPage() {
  const navigate = useNavigate();
  const { errorMessage, isLoading, patents } = usePatentList();
  const [submissionData, setSubmissionData] = useState<Record<string, { versions: BusinessSubmissionVersion[], latest: BusinessSubmissionVersion | null }>>({});
  const submittedPatents = patents.filter((patent) => patent.businessOpinionDecision);
  const {
    currentPage,
    pageSize,
    pagedItems: displayedPatents,
    setCurrentPage,
    totalItems,
    totalPages,
  } = useClientPagination(submittedPatents, [submittedPatents.length]);

  useEffect(() => {
    async function loadSubmissions() {
      const data: Record<string, { versions: BusinessSubmissionVersion[], latest: BusinessSubmissionVersion | null }> = {};

      for (const patent of submittedPatents) {
        const versions = await getBusinessSubmissionVersions(patent);
        const latest = await getLatestBusinessSubmission(patent);
        data[patent.patentId] = { versions, latest };
      }

      setSubmissionData(data);
    }

    if (submittedPatents.length > 0) {
      loadSubmissions();
    }
  }, [submittedPatents]);

  return (
    <AppLayout
      role="BUSINESS"
      title="특허별 제출 이력"
      description="내 사업부에서 의견을 제출한 특허별 기록과 이후 처리 상태를 확인합니다."
    >
      <Section
        title="특허별 의견 제출 이력"
        description={errorMessage || (isLoading ? "특허 목록을 불러오는 중입니다." : "행을 선택하면 특허 상세에서 제출 의견, 당시 AI 레포트, 평가 이력을 확인합니다.")}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>특허명</th>
                <th>최근 의견</th>
                <th>제출 횟수</th>
                <th>최근 제출일</th>
                <th>다음 결정 분기</th>
                <th>현재 처리 상태</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableLoadingRows columns={6} />
              ) : displayedPatents.map((patent) => {
                const data = submissionData[patent.patentId];
                const latestSubmission = data?.latest;
                const submissionCount = data?.versions.length ?? 0;

                return (
                  <tr
                    className="clickable-row"
                    key={patent.patentId}
                    onClick={() => navigate(`/business/patents/${patent.patentId}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/business/patents/${patent.patentId}`);
                      }
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    <td>
                      <strong className="table-title-link" title={patent.title}>
                        {truncateTitle(patent.title)}
                      </strong>
                      <span className="table-subtext">{patent.applicationNumber}</span>
                    </td>
                    <td>
                      {latestSubmission ? (
                        <Badge tone={getBusinessOpinionTone(latestSubmission.opinion)}>
                          {businessOpinionLabels[latestSubmission.opinion]}
                        </Badge>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>{submissionCount}회</td>
                    <td>{latestSubmission ? formatDate(latestSubmission.submittedAt) : "N/A"}</td>
                    <td>{getNextDecisionQuarter(patent.feeDueDate)}</td>
                    <td>{reviewWorkflowStatusLabels[patent.reviewWorkflowStatus]}</td>
                  </tr>
                );
              })}
              {!isLoading && submittedPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={6}>
                    제출된 사업부 의견이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </Section>
    </AppLayout>
  );
}

/**
 * @relatedFR FR-BUS-01, FR-LEGAL-11
 * @relatedUI UI-BUS-04
 * @description 다음 연차료 납부 기한 기준으로 사업부가 다시 판단해야 할 분기를 표시한다.
 */
function getNextDecisionQuarter(feeDueDate: string) {
  const [year, month] = feeDueDate.split("-").map(Number);
  return `${year}년 ${Math.ceil(month / 3)}분기`;
}

function formatDate(dateText: string) {
  return dateText.slice(0, 10);
}

/**
 * @relatedFR FR-LEGAL-11
 * @relatedUI UI-BUS-04
 * @description 제출 이력 목록에서 긴 특허명을 안정적으로 축약해 표시한다.
 */
function truncateTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 29)}…` : title;
}
