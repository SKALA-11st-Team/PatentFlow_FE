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

// AIREPORT-FIGURE: 권리성 도면 등은 별도 구조 필드가 없어, 에이전트가
// inline_local_report_images()로 본문 텍스트 안에 base64 data URI(맨몸 또는
// 마크다운 ![alt](data:...) 형태)로 박아 보낼 수 있다. 이를 분리해 <img>로 렌더링한다.
const FIGURE_PATTERN =
  /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9.+-]+;base64,[^\s)]+)\)|(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/g;

interface ReportFigure {
  src: string;
  alt: string;
}

// 텍스트에서 base64 도면을 떼어내고, 남은 본문과 도면 목록을 함께 돌려준다.
function stripFigures(value: string): { text: string; figures: ReportFigure[] } {
  const figures: ReportFigure[] = [];
  const text = value
    .replace(FIGURE_PATTERN, (_match, mdAlt: string, mdSrc: string, bareSrc: string) => {
      figures.push({ src: mdSrc ?? bareSrc, alt: (mdAlt ?? "").trim() });
      return "";
    })
    .trim();
  return { text, figures };
}

// 도면은 흑백 선화가 많아 테마와 무관하게 흰 캔버스 위에 렌더링한다(다크모드에서도 보이도록).
function FigureList({ figures }: { figures: ReportFigure[] }) {
  if (!figures.length) return null;
  return (
    <div className="axis-figure-list">
      {figures.map((figure, index) => (
        <figure className="axis-figure" key={`${index}-${figure.src.slice(0, 32)}`}>
          <img alt={figure.alt || "권리성 도면"} loading="lazy" src={figure.src} />
          {figure.alt ? <figcaption>{figure.alt}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function AxisDetailPanel({ score, steps }: { score: EvaluationScore; steps?: string[] }) {
  const summary = stripFigures(score.evidenceSummary);
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
        {summary.text ? <p>{summary.text}</p> : null}
        <FigureList figures={summary.figures} />
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
            {score.evidenceDetails.map((detail, index) => {
              const url = safeUrl(detail.source?.url);
              const detailContent = stripFigures(detail.text);
              return (
                <li key={`${index}-${detailContent.text.slice(0, 40)}`}>
                  {detailContent.text}
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
                  <FigureList figures={detailContent.figures} />
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
            {steps.map((step, index) => {
              const stepContent = stripFigures(step);
              return (
                <div className="claim-flow-step" key={`${index}-${stepContent.text.slice(0, 40)}`}>
                  <span className="claim-flow-no">{`S${(index + 1) * 100}`}</span>
                  <div className="claim-flow-body">
                    {stepContent.text ? <span>{stepContent.text}</span> : null}
                    <FigureList figures={stepContent.figures} />
                  </div>
                </div>
              );
            })}
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
 *     본문 텍스트에 base64 data URI 도면이 섞여 오면(주로 권리성) <img>로 분리 렌더링한다.
 */
export function AxisDetailModal({
  report,
  onClose,
}: {
  report: NonNullable<PatentDetail["aiEvaluationReport"]>;
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
