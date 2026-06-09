import { Badge } from "../../../components/common/Badge";
import { Section } from "../../../components/common/Section";
import {
  evaluationCategoryLabels,
  getRecommendationTone,
  recommendationLabels,
} from "../../../constants/status";
import type { PatentDetail } from "../../../types/patent";
import { formatDate, formatReportDisplayScore } from "./PatentDetailHooks";

export function AiReportStructuredContent({ report }: { report: PatentDetail["aiEvaluationReport"] }) {
  return (
    <div className="score-list">
      {report.scores.map((score) => (
        <div className="score-row" key={score.category}>
          <div>
            <strong>{evaluationCategoryLabels[score.category]}</strong>
            <span>{score.evidenceSummary}</span>
            {score.evidenceDetails?.length ? (
              <ul className="score-detail-list">
                {score.evidenceDetails.map((detail) => (
                  <li key={detail.text}>
                    {detail.text}
                    {detail.source ? (
                      <>
                        {" "}
                        {detail.source.url ? (
                          <a className="inline-source-link" href={detail.source.url} rel="noreferrer" target="_blank">
                            출처 {detail.source.title}
                          </a>
                        ) : (
                          <span className="inline-source">출처 {detail.source.title}</span>
                        )}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="score-result">
            <b>{score.score ?? "N/A"}</b>
            {score.grade ? <Badge tone={getGradeTone(score.grade)}>{score.grade}</Badge> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RawMarkdownBlock({ content, title }: { content: string; title: string }) {
  return (
    <details className="raw-markdown-block" open>
      <summary>{title}</summary>
      <pre>{content}</pre>
    </details>
  );
}

/**
 * @relatedFR FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description AI 특허 평가 레포트(종합 점수, 권고, 핵심 근거, 판단 근거, 항목별 평가)를 표시하는 섹션.
 */
export function AiReportSection({ report }: { report: PatentDetail["aiEvaluationReport"] }) {
  return (
    <Section
      title="AI 특허 평가 레포트"
      description="특허 유지 검토에 참고할 수 있는 AI 생성 평가 레포트입니다."
    >
      <div className="evaluation-header">
        <div>
          <span>종합 점수</span>
          <strong>{formatReportDisplayScore(report)}</strong>
          {report.totalScoreText ? <small>원문 점수 {report.totalScoreText}</small> : null}
          {report.finalGrade ? <small>종합 등급 {report.finalGrade}</small> : null}
          {report.finalIndicator ? <small>{report.finalIndicator}</small> : null}
          <small>작성일 {formatDate(report.createdAt)}</small>
        </div>
        <div className="evaluation-badge-stack">
          <Badge tone={getRecommendationTone(report.recommendation)}>
            {recommendationLabels[report.recommendation]}
          </Badge>
          {report.degraded ? <Badge tone="warning">제한 생성</Badge> : null}
        </div>
      </div>
      {report.degraded && report.failureReason ? <p className="notice notice-warning">{report.failureReason}</p> : null}
      <p className="notice">{report.recommendationText}</p>
      {report.keyEvidence ? (
        <div className="report-callout">
          <strong>핵심 근거</strong>
          <p>{report.keyEvidence}</p>
        </div>
      ) : null}
      {report.judgementGrounds?.length ? (
        <div className="report-block">
          <h3>판단 근거</h3>
          <ul className="clean-list">
            {report.judgementGrounds.map((ground) => (
              <li key={ground}>{ground}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <AiReportStructuredContent report={report} />
      {report.businessCheckRequests?.length ? (
        <div className="report-block">
          <h3>사업부 확인 요청 사항</h3>
          <ul className="clean-list">
            {report.businessCheckRequests.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}

function getGradeTone(grade: string) {
  if (grade.startsWith("A")) return "success";
  if (grade.startsWith("B")) return "primary";
  if (grade.startsWith("C")) return "warning";
  return "danger";
}
