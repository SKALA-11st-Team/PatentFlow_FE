import { useEffect, useState } from "react";
import { getBusinessSubmissionVersions, getLatestBusinessSubmission } from "../../api/businessSubmissions";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { Section } from "../common/Section";
import { useBusinessChecklistItems } from "../../hooks/useBusinessChecklistItems";
import type { BusinessSubmissionVersion } from "../../types/businessSubmission";
import type { BusinessChecklistItem } from "../../types/businessChecklist";
import type { PatentDetail } from "../../types/patent";
import {
  businessOpinionLabels,
  evaluationCategoryLabels,
  getBusinessOpinionTone,
  getRecommendationTone,
  legalActionResultLabels,
  recommendationLabels,
} from "../../constants/status";

interface SubmissionLogItem {
  id: string;
  title: string;
  description: string;
  actorName: string;
  createdAt: string;
  status: "completed" | "pending";
}

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-LEGAL-05, UI-BUS-03, UI-BUS-05
 * @description 특허 상세 화면 안에서 사업부 제출 버전, 당시 AI 레포트, 체크리스트 이력, 처리 로그를 상세 표시한다.
 */
export function BusinessSubmissionHistoryDetail({ patent }: { patent: PatentDetail }) {
  const [submissionVersions, setSubmissionVersions] = useState<BusinessSubmissionVersion[]>([]);
  const [latestSubmission, setLatestSubmission] = useState<BusinessSubmissionVersion | null>(null);
  const [loadMessage, setLoadMessage] = useState("사업부 제출 이력을 불러오는 중입니다.");
  const [aiReportSubmission, setAiReportSubmission] = useState<BusinessSubmissionVersion | null>(null);
  const [evaluationHistorySubmission, setEvaluationHistorySubmission] = useState<BusinessSubmissionVersion | null>(null);
  const { items: businessChecklistItems } = useBusinessChecklistItems();
  const submissionLogs = getSubmissionLogs(patent, submissionVersions);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions() {
      setLoadMessage("사업부 제출 이력을 불러오는 중입니다.");

      try {
        const [versions, latest] = await Promise.all([
          getBusinessSubmissionVersions(patent),
          getLatestBusinessSubmission(patent),
        ]);

        if (isMounted) {
          setSubmissionVersions(versions);
          setLatestSubmission(latest);
          setLoadMessage("");
        }
      } catch {
        if (isMounted) {
          setLoadMessage("사업부 제출 이력을 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
        }
      }
    }

    loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [patent]);

  return (
    <>
      <Section
        title="사업부 제출 이력 및 처리 로그"
        description="과거 제출 의견의 선택 이유, 당시 AI 특허 평가 레포트, 체크리스트 평가 이력, 이후 처리 흐름을 함께 확인합니다."
      >
        <div className="submission-summary-strip">
          <Meta label="제출 횟수" value={`${submissionVersions.length}회`} />
          <Meta label="최근 제출일" value={formatDate(latestSubmission?.submittedAt ?? null)} />
          <Meta label="다음 결정 분기" value={getNextDecisionQuarter(patent.annualFeeDueDate)} />
          <Meta
            label="최근 AI 권고"
            value={latestSubmission ? recommendationLabels[latestSubmission.aiRecommendation] : "의견 대기"}
          />
        </div>

        {loadMessage ? <p className="empty-state">{loadMessage}</p> : null}

        <div className="submission-detail-grid">
          <div className="submission-version-list">
            {submissionVersions.map((submission) => (
              <article className="submission-version-card" key={submission.submissionId}>
                <div>
                  <span>{submission.version}차 제출</span>
                  <strong>{businessOpinionLabels[submission.opinion]} 의견</strong>
                  <p>{submission.reason}</p>
                  <small>
                    {submission.submittedBy} · {formatDate(submission.submittedAt)}
                  </small>
                  <div className="submission-inline-insights">
                    <article>
                      <span>AI 레포트</span>
                      <strong>{submission.aiTotalScore}점</strong>
                      <small>
                        작성일 {formatDate(submission.aiReportCreatedAt)} ·{" "}
                        {recommendationLabels[submission.aiRecommendation]}
                      </small>
                    </article>
                    <article>
                      <span>체크리스트</span>
                      <strong>{submission.checklistTotal}점</strong>
                      <small>정성 평가 {submission.qualitativeScore}점 포함</small>
                    </article>
                  </div>
                  <div className="submission-report-preview">
                    {patent.aiEvaluationReport.scores.map((score) => (
                        <span key={score.category}>
                          {evaluationCategoryLabels[score.category]} <b>{score.score ?? "N/A"}</b>
                        </span>
                      ))}
                  </div>
                  <div className="submission-checklist-preview">
                    {submission.checklistScores.slice(0, 5).map((score) => {
                      const checklistItem = businessChecklistItems.find((item) => item.id === score.itemId);

                      return (
                        <span key={score.itemId}>
                          {checklistItem?.title ?? score.itemId} <b>{score.score}점</b>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="submission-version-side">
                  <Badge tone={getBusinessOpinionTone(submission.opinion)}>
                    체크리스트 {submission.checklistTotal}점
                  </Badge>
                  <div className="inline-action-group">
                    <Button className="btn-sk-orange btn-small" type="button" onClick={() => setAiReportSubmission(submission)}>
                      AI 상세
                    </Button>
                    <Button
                      className="btn-sk-orange btn-small"
                      type="button"
                      onClick={() => setEvaluationHistorySubmission(submission)}
                    >
                      체크리스트 상세
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {submissionVersions.length === 0 && !loadMessage ? (
              <p className="empty-state">제출된 사업부 의견 이력이 없습니다.</p>
            ) : null}
          </div>

          <aside className="submission-log-panel">
            <h3>처리 로그</h3>
            <ol className="branch-timeline submission-log-list">
              {submissionLogs.map((log) => (
                <li className={`branch-node ${log.status}`} key={log.id}>
                  <span className="branch-dot" />
                  <div>
                    <strong>{log.title}</strong>
                    <p>{log.description}</p>
                    <small>
                      {log.actorName} · {formatDate(log.createdAt)}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </Section>

      {aiReportSubmission ? (
        <AiReportModal patent={patent} submission={aiReportSubmission} onClose={() => setAiReportSubmission(null)} />
      ) : null}
      {evaluationHistorySubmission ? (
        <EvaluationHistoryModal
          businessChecklistItems={businessChecklistItems}
          patent={patent}
          submission={evaluationHistorySubmission}
          onClose={() => setEvaluationHistorySubmission(null)}
        />
      ) : null}
    </>
  );
}

function AiReportModal({
  patent,
  submission,
  onClose,
}: {
  patent: PatentDetail;
  submission: BusinessSubmissionVersion;
  onClose: () => void;
}) {
  return (
    <Modal ariaLabel="당시 AI 레포트" className="ai-report-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">AI 특허 평가 레포트</p>
          <h2>{submission.version}차 제출 당시 AI 레포트</h2>
          <p>작성일 {formatDate(submission.aiReportCreatedAt)}</p>
        </div>
        <button aria-label="AI 레포트 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <div className="evaluation-header">
        <div>
          <span>당시 종합 점수</span>
          <strong>{submission.aiTotalScore}</strong>
          <small>작성일 {formatDate(submission.aiReportCreatedAt)}</small>
        </div>
        <Badge tone={getRecommendationTone(submission.aiRecommendation)}>
          {recommendationLabels[submission.aiRecommendation]}
        </Badge>
      </div>
      <p className="notice">{patent.aiEvaluationReport.recommendationText}</p>
      <div className="score-list">
        {patent.aiEvaluationReport.scores.map((score) => (
            <div className="score-row" key={score.category}>
              <div>
                <strong>{evaluationCategoryLabels[score.category]}</strong>
                <span>{score.evidenceSummary}</span>
              </div>
              <b>{score.score ?? "N/A"}</b>
            </div>
          ))}
      </div>
    </Modal>
  );
}

function EvaluationHistoryModal({
  businessChecklistItems,
  patent,
  submission,
  onClose,
}: {
  businessChecklistItems: BusinessChecklistItem[];
  patent: PatentDetail;
  submission: BusinessSubmissionVersion;
  onClose: () => void;
}) {
  return (
    <Modal ariaLabel="평가 이력" className="ai-report-modal" onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="eyebrow">평가 이력</p>
          <h2>{submission.version}차 체크리스트 평가 내역</h2>
          <p>{patent.title}</p>
        </div>
        <button aria-label="평가 이력 닫기" className="modal-close-button" onClick={onClose} type="button">
          ×
        </button>
      </div>
      <div className="checklist-total-row">
        <span>당시 총점</span>
        <strong>{submission.checklistTotal}점</strong>
        <small>정성 평가 {submission.qualitativeScore}점을 포함한 사업부 제출 기준 점수입니다.</small>
      </div>
      <div className="evaluation-history-list">
        {submission.checklistScores.map((score) => {
          const checklistItem = businessChecklistItems.find((item) => item.id === score.itemId);

          return (
            <article className="evaluation-history-item" key={score.itemId}>
              <div>
                <span>{checklistItem?.category ?? "체크리스트"}</span>
                <strong>{getEvaluationJudgement(score.score)}</strong>
                <p>
                  {checklistItem?.title ?? score.itemId} · {score.memo}
                </p>
              </div>
              <b>{score.score}</b>
            </article>
          );
        })}
      </div>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getEvaluationJudgement(score: number) {
  if (score >= 4) {
    return "우수";
  }

  if (score >= 3) {
    return "검토 가능";
  }

  if (score >= 2) {
    return "보완 필요";
  }

  return "낮음";
}

function getSubmissionLogs(
  patent: PatentDetail,
  submissionVersions: BusinessSubmissionVersion[],
): SubmissionLogItem[] {
  const logs: SubmissionLogItem[] = [
    {
      id: "REQUESTED",
      title: "관리자 검토 요청",
      description: "관리자가 사업부에 특허 유지 여부 검토를 요청했습니다.",
      actorName: "관리자",
      createdAt: "2026-05-01T10:00:00+09:00",
      status: "completed",
    },
  ];

  submissionVersions.forEach((submission) => {
    logs.push({
      id: `OPINION-${submission.version}`,
      title: `${submission.version}차 사업부 의견 제출`,
      description: `${businessOpinionLabels[submission.opinion]} 의견, 체크리스트 ${submission.checklistTotal}점, 정성 평가 ${submission.qualitativeScore}점을 제출했습니다.`,
      actorName: submission.submittedBy,
      createdAt: submission.submittedAt,
      status: "completed",
    });
  });

  logs.push({
    id: "LEGAL_ACTION",
    title: patent.legalActionResult ? "법적 액션 반영" : "법적 액션 대기",
    description: patent.legalActionResult
      ? `${legalActionResultLabels[patent.legalActionResult]} 결과가 기록되었습니다.`
      : "유지, 포기, 매각 등 법적 액션 결과가 입력됩니다.",
    actorName: "관리자",
    createdAt: "2026-05-01T17:30:00+09:00",
    status: patent.legalActionResult ? "completed" : "pending",
  });

  return logs;
}

function getNextDecisionQuarter(annualFeeDueDate: string) {
  const [year, month] = annualFeeDueDate.split("-").map(Number);
  return `${year}년 ${Math.ceil(month / 3)}분기`;
}

function formatDate(dateText: string | null) {
  return dateText ? dateText.slice(0, 10) : "N/A";
}
