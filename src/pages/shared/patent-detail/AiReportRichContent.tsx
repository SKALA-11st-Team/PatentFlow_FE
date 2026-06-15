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
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../../../components/common/Badge";
import { evaluationCategoryLabels, getGradeLabel, getGradeTone } from "../../../constants/status";
import type { AiSummaryBrief, EvaluationScore, ReportSectionKey } from "../../../types/patent";

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
  if (grade.startsWith("A")) return "var(--color-success)";
  if (grade.startsWith("B")) return "#3b82f6";
  if (grade.startsWith("C")) return "var(--color-accent)";
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
const SECTION_META: Array<{ key: ReportSectionKey; label: string; Icon: LucideIcon }> = [
  { key: "evaluationScope", label: "평가 대상 및 범위", Icon: Eye },
  { key: "judgmentBasis", label: "판단 근거", Icon: MessageSquareText },
  { key: "axisDetails", label: "평가축별 상세 근거", Icon: BarChart3 },
  { key: "roleChecklist", label: "역할별 확인 사항", Icon: ClipboardCheck },
  { key: "finalOpinion", label: "최종 검토 의견", Icon: ShieldCheck },
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
