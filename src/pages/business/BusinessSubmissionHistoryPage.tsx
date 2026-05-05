import { useNavigate } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { Section } from "../../components/common/Section";
import { getBusinessSubmissionVersions, getLatestBusinessSubmission } from "../../mocks/businessSubmissions.mock";
import { patents } from "../../mocks/patents.mock";
import { businessOpinionLabels, reviewWorkflowStatusLabels } from "../../constants/status";

/**
 * @relatedFR FR-009, FR-010, FR-013
 * @relatedUI UI-009
 * @description 사업부 사용자가 제출한 의견과 재평가 요청 이력을 확인하는 화면
 */
export function BusinessSubmissionHistoryPage() {
  const navigate = useNavigate();
  const submittedPatents = patents.filter((patent) => patent.businessOpinionDecision);

  return (
    <AppLayout
      role="BUSINESS"
      title="특허별 제출 이력"
      description="내 부서에서 의견을 제출한 특허별 기록과 이후 처리 상태를 확인합니다."
    >
      <Section
        title="특허별 의견 제출 이력"
        description="행을 선택하면 해당 특허의 제출 의견, 당시 AI 레포트, 평가 이력을 확인합니다."
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
              {submittedPatents.map((patent) => {
                const latestSubmission = getLatestBusinessSubmission(patent);
                const submissionCount = getBusinessSubmissionVersions(patent).length;

                return (
                  <tr
                    className="clickable-row"
                    key={patent.patentId}
                    onClick={() => navigate(`/business/submissions/${patent.patentId}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/business/submissions/${patent.patentId}`);
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
                        <Badge tone="primary">{businessOpinionLabels[latestSubmission.opinion]}</Badge>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td>{submissionCount}회</td>
                    <td>{latestSubmission ? formatDate(latestSubmission.submittedAt) : "N/A"}</td>
                    <td>{getNextDecisionQuarter(patent.annualFeeDueDate)}</td>
                    <td>{reviewWorkflowStatusLabels[patent.reviewWorkflowStatus]}</td>
                  </tr>
                );
              })}
              {submittedPatents.length === 0 ? (
                <tr>
                  <td className="empty-table-cell" colSpan={6}>
                    제출된 사업부 의견이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-009
 * @description 다음 연차료 납부 기한 기준으로 사업부가 다시 판단해야 할 분기를 표시한다.
 */
function getNextDecisionQuarter(annualFeeDueDate: string) {
  const [year, month] = annualFeeDueDate.split("-").map(Number);
  return `${year}년 ${Math.ceil(month / 3)}분기`;
}

function formatDate(dateText: string) {
  return dateText.slice(0, 10);
}

/**
 * @relatedFR FR-013
 * @relatedUI UI-009
 * @description 제출 이력 목록에서 긴 특허명을 안정적으로 축약해 표시한다.
 */
function truncateTitle(title: string) {
  return title.length > 30 ? `${title.slice(0, 29)}…` : title;
}
