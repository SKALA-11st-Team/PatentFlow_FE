import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatentDetail } from "../../api/patents";
import {
  getBusinessSubmissionVersions,
  getLatestBusinessSubmission,
} from "../../api/businessSubmissions";
import { AppLayout } from "../../components/layout/AppLayout";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Section } from "../../components/common/Section";
import { useBusinessChecklistItems } from "../../hooks/useBusinessChecklistItems";
import type { BusinessSubmissionVersion } from "../../mocks/businessSubmissions.mock";
import type { BusinessChecklistItem } from "../../types/businessChecklist";
import type { PatentDetail } from "../../types/patent";
import {
  businessOpinionLabels,
  evaluationCategoryLabels,
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
 * @relatedUI UI-BUS-05
 * @description 사업부 사용자가 과거 제출 의견의 판단 이유, 당시 AI 레포트, 처리 로그를 확인하는 상세 화면
 */
export function BusinessSubmissionDetailPage() {
  const { patentId } = useParams();
  const [patent, setPatent] = useState<PatentDetail | null>(null);
  const [submissionVersions, setSubmissionVersions] = useState<BusinessSubmissionVersion[]>([]);
  const [latestSubmission, setLatestSubmission] = useState<BusinessSubmissionVersion | null>(null);
  const [loadMessage, setLoadMessage] = useState("제출 이력 상세를 불러오는 중입니다.");
  const [aiReportSubmission, setAiReportSubmission] = useState<BusinessSubmissionVersion | null>(null);
  const [evaluationHistorySubmission, setEvaluationHistorySubmission] = useState<BusinessSubmissionVersion | null>(null);
  const { items: businessChecklistItems } = useBusinessChecklistItems();

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissionDetail() {
      if (!patentId) {
        setLoadMessage("특허 ID가 없습니다.");
        return;
      }

      try {
        const detail = await getPatentDetail(patentId);

        if (!detail) {
          if (isMounted) {
            setLoadMessage("특허 상세 정보를 찾지 못했습니다.");
          }
          return;
        }

        const [versions, latest] = await Promise.all([
          getBusinessSubmissionVersions(detail),
          getLatestBusinessSubmission(detail),
        ]);

        if (isMounted) {
          setPatent(detail);
          setSubmissionVersions(versions);
          setLatestSubmission(latest);
          setLoadMessage("");
        }
      } catch {
        if (isMounted) {
          setLoadMessage("제출 이력 상세를 불러오지 못했습니다. BE 실행 상태를 확인해 주세요.");
        }
      }
    }

    loadSubmissionDetail();

    return () => {
      isMounted = false;
    };
  }, [patentId]);

  if (!patent) {
    return (
      <AppLayout role="BUSINESS" title="제출 이력 상세" description="제출 이력 상세를 준비하고 있습니다.">
        <section className="section">
          <p className="empty-state">{loadMessage}</p>
        </section>
      </AppLayout>
    );
  }

  const submissionLogs = getSubmissionLogs(patent, submissionVersions);

  return (
    <AppLayout
      role="BUSINESS"
      title="제출 이력 상세"
      description="과거 제출 의견의 선택 이유, 당시 AI 특허 평가 레포트, 이후 처리 흐름을 확인합니다."
    >
      <section className="section submission-hero">
        <div>
          <div className="detail-title-row">
            <h2>{patent.title}</h2>
            {latestSubmission ? (
              <Badge tone="primary">최근 {businessOpinionLabels[latestSubmission.opinion]} 의견</Badge>
            ) : (
              <Badge>의견 없음</Badge>
            )}
          </div>
          <p>{latestSubmission?.reason ?? patent.businessOpinion.comment}</p>
        </div>
        <div className="meta-grid">
          <Meta label="제출 횟수" value={`${submissionVersions.length}회`} />
          <Meta label="최근 제출일" value={formatDate(latestSubmission?.submittedAt ?? null)} />
          <Meta label="다음 결정 분기" value={getNextDecisionQuarter(patent.annualFeeDueDate)} />
          <Meta
            label="최근 AI 권고"
            value={latestSubmission ? recommendationLabels[latestSubmission.aiRecommendation] : "N/A"}
          />
          <Meta label="최근 AI 레포트 작성일" value={formatDate(latestSubmission?.aiReportCreatedAt ?? null)} />
          <Meta label="최근 종합 점수" value={latestSubmission ? `${latestSubmission.aiTotalScore}점` : "N/A"} />
        </div>
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <Section
            title="제출 이력"
            description="같은 특허에 대해 여러 번 제출한 의견을 시간순으로 확인합니다."
          >
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
                          {recommendationLabels[submission.aiRecommendation]} 권고
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
                    <Badge tone={submission.opinion === "MAINTAIN" ? "success" : "warning"}>
                      체크리스트 {submission.checklistTotal}점
                    </Badge>
                    <div className="inline-action-group">
                      <Button
                        className="btn-sk-orange btn-small"
                        type="button"
                        onClick={() => setAiReportSubmission(submission)}
                      >
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
              {submissionVersions.length === 0 ? <p className="empty-state">제출된 이력이 없습니다.</p> : null}
            </div>
          </Section>

          <Section title="처리 로그" description="요청, 의견 제시, 법적 액션을 작은 타임라인으로 확인합니다.">
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
          </Section>
        </div>

        <aside className="detail-side">
          <Section title="현재 처리 결과">
            <div className="decision-box">
              {patent.legalActionResult ? (
                <>
                  <Badge tone="success">{legalActionResultLabels[patent.legalActionResult]}</Badge>
                  <p>최종 법적 액션까지 반영된 상태입니다.</p>
                </>
              ) : (
                <>
                  <Badge tone="warning">처리 대기</Badge>
                  <p>아직 최종 법적 액션은 입력되지 않았습니다.</p>
                </>
              )}
            </div>
          </Section>

          <Section title="다음 검토">
            <div className="decision-box">
              <strong>{getNextDecisionQuarter(patent.annualFeeDueDate)}</strong>
              <p>다음 연차료 납부 기한은 {formatDate(patent.annualFeeDueDate)}입니다.</p>
            </div>
          </Section>

          <Link className="back-link" to="/business/submissions">
            제출 이력으로 돌아가기
          </Link>
        </aside>
      </div>

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
    </AppLayout>
  );
}

/**
 * @relatedFR FR-006, FR-007, FR-008, FR-013
 * @relatedUI UI-BUS-05
 * @description 제출 당시 AI 특허 평가 레포트를 화면 위 모달로 표시한다.
 */
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
          <Badge tone={submission.aiRecommendation === "MAINTAIN" ? "success" : "warning"}>
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

/**
 * @relatedFR FR-007, FR-013
 * @relatedUI UI-BUS-05
 * @description 제출 이력 상세에서 사업부 체크리스트 총점과 항목별 점수를 같은 기준으로 표시한다.
 */
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
                <p>{checklistItem?.title ?? score.itemId} · {score.memo}</p>
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

/**
 * @relatedFR FR-007, FR-013
 * @relatedUI UI-BUS-05
 * @description 평가 이력 모달에서 점수를 간단한 판단 라벨로 변환한다.
 */
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

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-BUS-05
 * @description 사업부 제출 이후의 업무 로그를 제출 이력 상세용 타임라인 데이터로 변환한다.
 */
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

/**
 * @relatedFR FR-013
 * @relatedUI UI-BUS-05
 * @description 다음 연차료 납부 기한 기준으로 다음 결정 분기를 표시한다.
 */
function getNextDecisionQuarter(annualFeeDueDate: string) {
  const [year, month] = annualFeeDueDate.split("-").map(Number);
  return `${year}년 ${Math.ceil(month / 3)}분기`;
}

/**
 * @relatedFR FR-013
 * @relatedUI UI-BUS-05
 * @description 제출 이력 상세에서 날짜를 yyyy-mm-dd 형식으로 표시한다.
 */
function formatDate(dateText: string | null) {
  return dateText ? dateText.slice(0, 10) : "N/A";
}
