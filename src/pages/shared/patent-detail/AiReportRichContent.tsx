import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileText,
  GitBranch,
  Lightbulb,
  type LucideIcon,
  MessageSquareText,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../../../components/common/Badge";
import {
  evaluationCategoryLabels,
  getGradeLabel,
  getGradeTone,
  getRecommendationTone,
  recommendationLabels,
} from "../../../constants/status";
import type { AiEvaluationReport, AiSummaryBrief, EvaluationScore, ReportSectionKey } from "../../../types/patent";

// ③ 특허 이해 요약 — summaryBrief 6카드. 아이콘은 카드 헤더에만(본문 리스트엔 금지).
const BRIEF_CARDS: Array<{
  key: keyof AiSummaryBrief;
  label: string;
  Icon: LucideIcon;
  list?: boolean;
  steps?: boolean;
}> = [
  { key: "one_line_summary", label: "한 줄 요약", Icon: FileText },
  { key: "problem", label: "해결하려는 문제", Icon: Target },
  { key: "core_idea", label: "핵심 아이디어", Icon: Lightbulb },
  { key: "key_components", label: "주요 기술·구성", Icon: Settings, list: true },
  { key: "operation_steps", label: "작동 방식", Icon: GitBranch, list: true, steps: true },
  { key: "expected_effect", label: "기대 효과", Icon: TrendingUp },
];

export function SummaryBriefCards({ brief }: { brief: AiSummaryBrief }) {
  const cards = BRIEF_CARDS.filter((card) => {
    const value = brief[card.key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
  if (!cards.length) return null;
  return (
    <div className="summary-brief-grid">
      {cards.map(({ key, label, Icon, list, steps }) => {
        const value = brief[key];
        return (
          <div className={`summary-brief-card${steps ? " summary-brief-card--steps" : ""}`} key={key}>
            <h4 className="rich-card-header">
              <Icon aria-hidden size={16} />
              {label}
            </h4>
            {list && Array.isArray(value) ? (
              <ul>
                {value.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{String(value)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ④ 평가축 요약 — 원형 progress(점수=채움, 등급=색/정성라벨). 원형바엔 아이콘 X(점수가 주인공).
const RADIAL_RADIUS = 34;
const RADIAL_CIRCUMFERENCE = 2 * Math.PI * RADIAL_RADIUS;

function gradeColor(grade?: string | null): string {
  if (!grade) return "var(--color-text-light)";
  if (grade.startsWith("A")) return "var(--color-success)"; // 청록
  if (grade.startsWith("B")) return "#16a34a"; // 초록(목업 톤)
  if (grade.startsWith("C")) return "var(--color-accent)"; // 주황
  return "var(--color-error)";
}

export function AxisRadialGrid({ scores }: { scores: EvaluationScore[] }) {
  if (!scores.length) return null;
  return (
    <div className="axis-radial-grid">
      {scores.map((score) => {
        const ratio = Math.max(0, Math.min(100, score.score ?? 0)) / 100;
        const color = gradeColor(score.grade);
        return (
          <div className="axis-radial" key={score.category}>
            <span className="axis-radial-title">{evaluationCategoryLabels[score.category]}</span>
            <div className="axis-radial-figure">
              <svg height={84} viewBox="0 0 84 84" width={84}>
                <circle className="axis-radial-track" cx={42} cy={42} r={RADIAL_RADIUS} />
                <circle
                  className="axis-radial-fill"
                  cx={42}
                  cy={42}
                  r={RADIAL_RADIUS}
                  style={{
                    stroke: color,
                    strokeDasharray: RADIAL_CIRCUMFERENCE,
                    strokeDashoffset: RADIAL_CIRCUMFERENCE * (1 - ratio),
                  }}
                />
              </svg>
              <span className="axis-radial-score">{score.score ?? "–"}</span>
            </div>
            <div className="axis-radial-meta">
              {score.grade ? <Badge tone={getGradeTone(score.grade)}>{score.grade}</Badge> : null}
              <span className="axis-radial-label" style={{ color }}>
                {getGradeLabel(score.grade)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ④/⑤ 보고서 섹션별 본문 — reportSections 펼침 패널.
// finalOpinion(최종 검토 의견)은 AiReportSection 상단 콜아웃으로 승격되므로 패널에서는 제외(중복 방지).
const SECTION_META: Array<{ key: ReportSectionKey; label: string; Icon: LucideIcon }> = [
  { key: "evaluationScope", label: "평가 대상 및 범위", Icon: Eye },
  { key: "judgmentBasis", label: "판단 근거", Icon: MessageSquareText },
  { key: "axisDetails", label: "평가축별 상세 근거", Icon: BarChart3 },
  { key: "roleChecklist", label: "역할별 확인 사항", Icon: ClipboardCheck },
];

export function ReportSectionPanels({ sections }: { sections: Partial<Record<ReportSectionKey, string>> }) {
  const items = SECTION_META.filter((meta) => sections[meta.key]?.trim());
  if (!items.length) return null;
  return (
    <div className="report-section-panels">
      {items.map(({ key, label, Icon }) => (
        <details className="report-section-panel" key={key}>
          <summary>
            <Icon aria-hidden size={16} />
            {label}
            <ChevronDown aria-hidden className="report-section-chevron" size={16} />
          </summary>
          <div className="report-section-panel-body">{sections[key]}</div>
        </details>
      ))}
    </div>
  );
}

// ① 한눈에 보는 판단 요약 — 판단·종합점수·강/약 평가축·핵심 확인·한 줄 요약을 상단에 압축.
function AxisStat({ label, score }: { label: string; score: EvaluationScore }) {
  return (
    <div className="judgment-stat">
      <span>{label}</span>
      <strong>
        {evaluationCategoryLabels[score.category]} {score.score ?? "–"}점
      </strong>
      {score.grade ? <Badge tone={getGradeTone(score.grade)}>{`등급 ${score.grade} · ${getGradeLabel(score.grade)}`}</Badge> : null}
    </div>
  );
}

export function JudgmentSummaryBand({ report }: { report: AiEvaluationReport }) {
  const scored = report.scores.filter((s) => typeof s.score === "number");
  const strongest = scored.length ? scored.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)) : null;
  const weakest = scored.length ? scored.reduce((a, b) => ((b.score ?? 0) < (a.score ?? 0) ? b : a)) : null;
  // averageScore 미제공 시 축 점수 평균으로 폴백(소수 1자리).
  const avgScore =
    report.averageScore ??
    (scored.length ? Math.round((scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 10) / 10 : null);
  const oneLiner = report.summaryBrief?.one_line_summary ?? report.keyEvidence;
  const action = report.businessCheckRequests?.find((item) => item.trim());
  return (
    <div className="judgment-band">
      <div className="judgment-grid">
        <div className="judgment-verdict">
          <span className="judgment-label">
            <Sparkles aria-hidden size={15} />
            AI 제안 판단
          </span>
          <Badge tone={getRecommendationTone(report.recommendation)}>{recommendationLabels[report.recommendation]}</Badge>
        </div>
        <div className="judgment-stat">
          <span>AI 종합 점수</span>
          <strong>
            {avgScore ?? "–"}
            <small> / 100</small>
          </strong>
          {report.totalScore != null ? <small className="judgment-sub">{report.totalScore} / 300</small> : null}
        </div>
        {strongest ? <AxisStat label="가장 강한 평가축" score={strongest} /> : null}
        {weakest && weakest !== strongest ? <AxisStat label="가장 약한 평가축" score={weakest} /> : null}
        {action ? (
          <div className="judgment-stat">
            <span>핵심 확인 사항</span>
            <strong className="judgment-action">{action}</strong>
          </div>
        ) : null}
      </div>
      {oneLiner ? <p className="judgment-oneliner">{oneLiner}</p> : null}
    </div>
  );
}
