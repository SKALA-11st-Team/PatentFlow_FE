import { useState } from "react";
import { ExternalLink, GitBranch } from "lucide-react";
import { Badge } from "../../../components/common/Badge";
import { Modal } from "../../../components/common/Modal";
import { evaluationCategoryLabels, getGradeLabel, getGradeTone } from "../../../constants/status";
import type { EvaluationScore, PatentDetail } from "../../../types/patent";

// 외부 근거 URL은 http(s)만 링크로 허용한다.
function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function AxisDetailPanel({ score, steps }: { score: EvaluationScore; steps?: string[] }) {
  return (
    <div className="axis-detail-panel">
      <div className="axis-detail-head">
        <span className="axis-detail-score">
          {score.score ?? "–"}
          <small> / 100</small>
        </span>
        {score.grade ? (
          <Badge tone={getGradeTone(score.grade)}>{`등급 ${score.grade} · ${getGradeLabel(score.grade)}`}</Badge>
        ) : null}
        {typeof score.confidence === "number" ? (
          <span className="axis-detail-confidence">근거 신뢰도 {Math.round(score.confidence * 100)}%</span>
        ) : null}
      </div>

      <div className="axis-detail-block">
        <h4>핵심 근거 요약</h4>
        <p>{score.evidenceSummary}</p>
      </div>

      {score.riskFactors?.length ? (
        <div className="axis-detail-block">
          <h4>위험 요인</h4>
          <ul className="clean-list">
            {score.riskFactors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {score.missingInformation?.length ? (
        <div className="axis-detail-block">
          <h4>부족 정보 · 추가 확인 필요</h4>
          <ul className="clean-list">
            {score.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {score.evidenceDetails?.length ? (
        <div className="axis-detail-block">
          <h4>근거 출처</h4>
          <ul className="score-detail-list">
            {score.evidenceDetails.map((detail) => {
              const url = safeUrl(detail.source?.url);
              return (
                <li key={detail.text}>
                  {detail.text}
                  {detail.source ? (
                    <>
                      {" "}
                      {url ? (
                        <a className="inline-source-link" href={url} rel="noreferrer" target="_blank">
                          출처 {detail.source.title}
                          <ExternalLink aria-hidden size={12} />
                        </a>
                      ) : (
                        <span className="inline-source">출처 {detail.source.title}</span>
                      )}
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {steps?.length ? (
        <div className="axis-detail-block">
          <h4>
            <GitBranch aria-hidden size={14} />
            권리범위 참고도 (작동 흐름)
          </h4>
          <div className="claim-flow">
            {steps.map((step, index) => (
              <div className="claim-flow-step" key={step}>
                <span className="claim-flow-no">{`S${(index + 1) * 100}`}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @relatedUI UI-LEGAL-05
 * @description 평가축별 상세 근거 모달 — 축 탭(권리성/기술성/시장성/사업연계성)별로
 *     점수·등급·신뢰도, 핵심 근거 요약, 위험 요인, 부족 정보, 근거 출처를 보여준다.
 *     권리성 탭에는 작동 흐름(summaryBrief.operation_steps)을 권리범위 참고도로 함께 표시한다.
 */
export function AxisDetailModal({
  report,
  onClose,
}: {
  report: PatentDetail["aiEvaluationReport"];
  onClose: () => void;
}) {
  const scores = report.scores;
  const [active, setActive] = useState(scores[0]?.category);
  const score = scores.find((s) => s.category === active) ?? scores[0];
  const steps = report.summaryBrief?.operation_steps ?? [];
  if (!score) return null;
  return (
    <Modal ariaLabel="평가축별 상세 근거" className="ai-report-modal axis-detail-modal" onClose={onClose}>
      <div className="modal-header">
        <h3>평가축별 상세 근거</h3>
      </div>
      <div className="axis-detail-tabs" role="tablist">
        {scores.map((s) => (
          <button
            className={active === s.category ? "selected" : ""}
            key={s.category}
            onClick={() => setActive(s.category)}
            role="tab"
            type="button"
          >
            {evaluationCategoryLabels[s.category]}
          </button>
        ))}
      </div>
      <AxisDetailPanel score={score} steps={active === "RIGHTS" ? steps : undefined} />
    </Modal>
  );
}
