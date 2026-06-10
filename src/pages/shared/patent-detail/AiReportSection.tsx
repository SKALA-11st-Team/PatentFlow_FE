import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { MarkdownView } from "../../../components/common/MarkdownView";
import { Section } from "../../../components/common/Section";
import {
  evaluationCategoryLabels,
  getGradeTone,
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
      <MarkdownView content={content} />
    </details>
  );
}

interface AiReportEditControls {
  // 최종 판단 기록 후에는 편집이 차단된다(원본 보기는 계속 가능).
  canEdit: boolean;
  isShowingOriginal: boolean;
  isSavingEdit: boolean;
  editMessage: string;
  onOpenEditModal: () => void;
  onToggleOriginal: () => void;
  onRevertEdit: () => void;
}

/**
 * @relatedFR FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description AI 특허 평가 레포트(종합 점수, 권고, 핵심 근거, 판단 근거, 항목별 평가)를 표시하는 섹션.
 *     관리자(법무팀)에게는 레포트 수정/AI 원본 보기/되돌리기 컨트롤이 노출된다(FR-LEGAL-09).
 */
export function AiReportSection({
  report,
  editControls,
}: {
  report: PatentDetail["aiEvaluationReport"];
  editControls?: AiReportEditControls;
}) {
  return (
    <Section
      title="AI 특허 평가 레포트"
      description="특허 유지 검토에 참고할 수 있는 AI 생성 평가 레포트입니다."
    >
      {editControls ? (
        <div className="ai-report-edit-toolbar">
          {editControls.editMessage ? <span className="ai-report-edit-message">{editControls.editMessage}</span> : null}
          {report.edited || editControls.isShowingOriginal ? (
            <Button onClick={editControls.onToggleOriginal} type="button" variant="secondary">
              {editControls.isShowingOriginal ? "수정본 보기" : "AI 원본 보기"}
            </Button>
          ) : null}
          {report.edited && !editControls.isShowingOriginal && editControls.canEdit ? (
            <Button
              disabled={editControls.isSavingEdit}
              onClick={editControls.onRevertEdit}
              type="button"
              variant="secondary"
            >
              수정 되돌리기
            </Button>
          ) : null}
          {!editControls.isShowingOriginal && editControls.canEdit ? (
            <Button disabled={editControls.isSavingEdit} onClick={editControls.onOpenEditModal} type="button">
              레포트 수정
            </Button>
          ) : null}
        </div>
      ) : null}
      {editControls?.isShowingOriginal ? (
        <p className="notice">AI가 생성한 원본 레포트를 보고 있습니다. 수정 내용은 반영되어 있지 않습니다.</p>
      ) : null}
      <div className="evaluation-header">
        <div>
          <span>종합 점수</span>
          <strong>{formatReportDisplayScore(report)}</strong>
          {report.totalScoreText ? <small>원문 점수 {report.totalScoreText}</small> : null}
          {report.finalGrade ? <small>종합 등급 {report.finalGrade}</small> : null}
          {report.finalIndicator ? <small>{report.finalIndicator}</small> : null}
          <small>작성일 {formatDate(report.createdAt)}</small>
          {report.edited && report.editedAt ? (
            <small>
              법무 수정 {formatDate(report.editedAt)}
              {report.editedBy ? ` · ${report.editedBy}` : ""}
            </small>
          ) : null}
        </div>
        <div className="evaluation-badge-stack">
          <Badge tone={getRecommendationTone(report.recommendation)}>
            {recommendationLabels[report.recommendation]}
          </Badge>
          {report.degraded ? <Badge tone="warning">제한 생성</Badge> : null}
          {report.edited ? <Badge tone="primary">법무 수정</Badge> : null}
        </div>
      </div>
      {report.editStale ? (
        <p className="notice notice-warning">
          이 수정 내용은 이전 버전 레포트를 기준으로 작성되었습니다. 레포트가 다시 생성되었으니 수정 내용을
          검토한 뒤 유지하거나 되돌려주세요.
        </p>
      ) : null}
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
      {report.rawMarkdown ? (
        <RawMarkdownBlock content={report.rawMarkdown} title="AI 특허 평가 레포트 전문" />
      ) : null}
    </Section>
  );
}
