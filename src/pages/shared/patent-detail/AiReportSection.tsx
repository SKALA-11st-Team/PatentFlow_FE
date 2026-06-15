import { useRef, useState } from "react";
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { MarkdownView } from "../../../components/common/MarkdownView";
import { Section } from "../../../components/common/Section";
import {
  evaluationCategoryLabels,
  getEvidenceConfidenceMeta,
  getGradeTone,
  getRecommendationTone,
  recommendationLabels,
} from "../../../constants/status";
import type { PatentDetail } from "../../../types/patent";
import { AxisRadarChart, AxisRadialGrid, ReportSectionPanels } from "./AiReportRichContent";
import { formatDate, formatReportDisplayScore } from "./PatentDetailHooks";

// 외부 근거 URL은 http(s)만 링크로 허용한다(javascript:/data: 등 위험 프로토콜 차단).
function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

// 근거 요약 앞에 박힌 "NN / X:" 점수·등급 프리픽스 제거 — 점수·등급은 별도 표시되므로 중복을 없앤다.
function stripScorePrefix(text: string): string {
  return text.replace(/^\s*\d{1,3}\s*\/\s*[A-Da-d]\s*[:·-]?\s*/, "").trim();
}

export function AiReportStructuredContent({ report }: { report: PatentDetail["aiEvaluationReport"] }) {
  return (
    <div className="score-list">
      {report.scores.map((score) => (
        <div className="score-row" key={score.category}>
          <div>
            <strong>{evaluationCategoryLabels[score.category]}</strong>
            <span>{stripScorePrefix(score.evidenceSummary)}</span>
            {score.evidenceDetails?.length ? (
              <ul className="score-detail-list">
                {score.evidenceDetails.map((detail) => (
                  <li key={detail.text}>
                    {detail.text}
                    {detail.source ? (
                      <>
                        {" "}
                        {safeExternalUrl(detail.source.url) ? (
                          <a
                            className="inline-source-link"
                            href={safeExternalUrl(detail.source.url) ?? undefined}
                            rel="noreferrer"
                            target="_blank"
                          >
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
  const containerRef = useRef<HTMLDivElement>(null);
  // D2: 마크다운 제목(#/##)을 추출해 목차를 만든다 — 클릭 시 본문 내 해당 제목으로 스크롤.
  const tocItems = content
    .split("\n")
    .filter((line) => /^#{1,2}\s+/.test(line))
    .map((line) => line.replace(/^#{1,2}\s+/, "").trim())
    .filter((heading, index, all) => heading && all.indexOf(heading) === index);

  function scrollToHeading(heading: string) {
    const container = containerRef.current;
    if (!container) return;
    const target = Array.from(container.querySelectorAll<HTMLElement>("h1, h2, h3"))
      .find((element) => element.textContent?.trim() === heading);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <details className="raw-markdown-block" open>
      <summary>{title}</summary>
      {tocItems.length >= 3 ? (
        <nav aria-label="레포트 목차" className="markdown-toc">
          <strong>목차</strong>
          {tocItems.map((heading) => (
            <button key={heading} onClick={() => scrollToHeading(heading)} type="button">
              {heading}
            </button>
          ))}
        </nav>
      ) : null}
      <div ref={containerRef}>
        <MarkdownView content={content} />
      </div>
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

interface AiReportRegenerateControls {
  isRegenerating: boolean;
  regenerateMessage: string;
  onRegenerate: () => void;
}

const REGEN_STAGES: string[] = ["특허 이해", "근거 수집", "근거 압축", "4축 평가", "레포트 작성", "검증"];

function extractCurrentStage(message: string): string | null {
  const parts = message.split(" · ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : null;
}

function RegenProgressSteps({ message }: { message: string }) {
  const currentStage = extractCurrentStage(message);
  const currentIdx = currentStage ? REGEN_STAGES.indexOf(currentStage) : -1;
  return (
    <div className="regen-progress">
      {REGEN_STAGES.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <div
            key={stage}
            className={`regen-stage${isDone ? " regen-stage--done" : ""}${isActive ? " regen-stage--active" : ""}`}
          >
            <div className="regen-stage-dot" />
            <span className="regen-stage-label">{stage}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @relatedFR FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-LEGAL-09, FR-LEGAL-18
 * @relatedUI UI-LEGAL-04, UI-BUS-03
 * @description AI 특허 평가 레포트(종합 점수, 권고, 핵심 근거, 판단 근거, 항목별 평가)를 표시하는 섹션.
 *     관리자(법무팀)에게는 레포트 수정/AI 원본 보기/되돌리기/재생성 컨트롤이 노출된다(FR-LEGAL-09, FR-LEGAL-18).
 */
export function AiReportSection({
  report,
  editControls,
  regenerateControls,
}: {
  report: PatentDetail["aiEvaluationReport"];
  editControls?: AiReportEditControls;
  regenerateControls?: AiReportRegenerateControls;
}) {
  const [pendingRegenConfirm, setPendingRegenConfirm] = useState(false);
  const confidence = getEvidenceConfidenceMeta(report.evidenceConfidence);

  function handleRegenerateClick() {
    if (report.edited) {
      setPendingRegenConfirm(true);
    } else {
      regenerateControls?.onRegenerate();
    }
  }

  function handleConfirmRegenerate() {
    setPendingRegenConfirm(false);
    regenerateControls?.onRegenerate();
  }

  return (
    <Section
      title="AI 특허 평가 레포트"
      description="특허 유지 검토에 참고할 수 있는 AI 생성 평가 레포트입니다."
    >
      {editControls || regenerateControls ? (
        <>
        {regenerateControls?.isRegenerating ? (
          <RegenProgressSteps message={regenerateControls.regenerateMessage} />
        ) : null}
        <div className="ai-report-edit-toolbar">
          {editControls?.editMessage ? <span className="ai-report-edit-message">{editControls.editMessage}</span> : null}
          {regenerateControls?.regenerateMessage && !regenerateControls.isRegenerating ? (
            <span className="ai-report-edit-message">{regenerateControls.regenerateMessage}</span>
          ) : null}
          {editControls && (report.edited || editControls.isShowingOriginal) ? (
            <Button onClick={editControls.onToggleOriginal} type="button" variant="secondary">
              {editControls.isShowingOriginal ? "수정본 보기" : "AI 원본 보기"}
            </Button>
          ) : null}
          {editControls && report.edited && !editControls.isShowingOriginal && editControls.canEdit ? (
            <Button
              disabled={editControls.isSavingEdit}
              onClick={editControls.onRevertEdit}
              type="button"
              variant="secondary"
            >
              수정 되돌리기
            </Button>
          ) : null}
          {editControls && !editControls.isShowingOriginal && editControls.canEdit ? (
            <Button disabled={editControls.isSavingEdit} onClick={editControls.onOpenEditModal} type="button">
              레포트 수정
            </Button>
          ) : null}
          {regenerateControls && !pendingRegenConfirm ? (
            <Button
              disabled={regenerateControls.isRegenerating}
              onClick={handleRegenerateClick}
              type="button"
              variant="secondary"
            >
              {regenerateControls.isRegenerating ? (
                <><span className="btn-spinner" />재생성 중...</>
              ) : "AI 레포트 재생성"}
            </Button>
          ) : null}
          {pendingRegenConfirm ? (
            <span className="regen-confirm-inline">
              <span className="ai-report-edit-message">법무 수정 내용의 기준 원본이 교체됩니다. 계속하시겠습니까?</span>
              <Button onClick={handleConfirmRegenerate} type="button" variant="secondary">확인</Button>
              <Button onClick={() => setPendingRegenConfirm(false)} type="button" variant="secondary">취소</Button>
            </span>
          ) : null}
        </div>
        </>
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
      {report.warnings?.length ? (
        <div className="report-block">
          <h3>생성 경고</h3>
          <ul className="clean-list">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {confidence ? (
        <p className="ai-report-signal-row">
          <Badge tone={confidence.tone}>{confidence.label}</Badge>
        </p>
      ) : report.evidenceConfidence ? (
        <p className="notice">근거 신뢰도: {report.evidenceConfidence}</p>
      ) : null}
      <p className="notice">{report.recommendationText}</p>
      {report.reportSections?.finalOpinion ? (
        <div className="report-callout report-callout--final">
          <strong>최종 검토 의견</strong>
          <p>{report.reportSections.finalOpinion}</p>
        </div>
      ) : null}
      {report.keyEvidence ? (
        <div className="report-callout">
          <strong>핵심 근거</strong>
          <p>{report.keyEvidence}</p>
        </div>
      ) : null}
      {report.scores.length ? (
        <div className="report-block">
          <h3>평가축 요약</h3>
          <div className="axis-summary-layout">
            <AxisRadialGrid scores={report.scores} />
            <AxisRadarChart scores={report.scores} />
          </div>
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
      {report.reportSections ? <ReportSectionPanels sections={report.reportSections} /> : null}
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
      {report.missingInformation?.length ? (
        <div className="report-block">
          <h3>정보 부족 · 추가 확인 필요</h3>
          <ul className="clean-list">
            {report.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.externalSources?.length ? (
        <div className="report-block">
          <h3>외부 근거</h3>
          <ul className="clean-list">
            {report.externalSources.map((source) =>
              safeExternalUrl(source.url) ? (
                <li key={`${source.title}-${source.url ?? ""}`}>
                  <a
                    className="inline-source-link"
                    href={safeExternalUrl(source.url) ?? undefined}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.title}
                  </a>
                </li>
              ) : (
                <li key={`${source.title}-${source.url ?? ""}`}>{source.title}</li>
              ),
            )}
          </ul>
        </div>
      ) : null}
      {report.rawMarkdown ? (
        <RawMarkdownBlock content={report.rawMarkdown} title="AI 특허 평가 레포트 전문" />
      ) : null}
    </Section>
  );
}
