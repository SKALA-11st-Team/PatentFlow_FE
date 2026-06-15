import type { AiEvaluationReport } from "../types/patent";
import { evaluationCategoryLabels, recommendationLabels } from "../constants/status";

// D3: AI 레포트를 PDF로 "다운로드". 별도 PDF 라이브러리 없이, 새 창에 인쇄 전용 마크업을 써서
// window.print()를 호출 → 사용자가 브라우저 인쇄 대화상자에서 "PDF로 저장"한다.
// 구조화 필드(점수·근거·섹션 본문)로 직접 조판하므로 마크다운 파서가 필요 없다.

const SECTION_LABELS: Array<{ key: string; label: string }> = [
  { key: "evaluationScope", label: "평가 대상 및 범위" },
  { key: "judgmentBasis", label: "판단 근거" },
  { key: "axisDetails", label: "평가축별 상세 근거" },
  { key: "roleChecklist", label: "역할별 확인 사항" },
  { key: "finalOpinion", label: "최종 검토 의견" },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function list(items: string[] | undefined): string {
  if (!items?.length) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function downloadAiReportPdf(patentTitle: string, report: AiEvaluationReport): void {
  const win = window.open("", "_blank", "noopener,nowidth");
  if (!win) return;

  const scoresRows = report.scores
    .map(
      (score) =>
        `<tr><td>${escapeHtml(evaluationCategoryLabels[score.category] ?? score.category)}</td>` +
        `<td style="text-align:right">${score.score ?? "-"}</td>` +
        `<td style="text-align:center">${escapeHtml(score.grade ?? "-")}</td></tr>`,
    )
    .join("");

  const sectionsHtml = SECTION_LABELS.map(({ key, label }) => {
    const body = report.reportSections?.[key as keyof typeof report.reportSections];
    return body?.trim() ? `<h2>${label}</h2><p>${escapeHtml(body)}</p>` : "";
  }).join("");

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>AI 특허 평가 레포트 - ${escapeHtml(patentTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Pretendard", -apple-system, sans-serif; color: #171a23; line-height: 1.7; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 20px 0 6px; border-bottom: 1px solid #e5e8ef; padding-bottom: 4px; }
  .meta { color: #5c6472; font-size: 13px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
  th, td { border: 1px solid #e5e8ef; padding: 6px 10px; }
  th { background: #f6f7fb; text-align: left; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin: 2px 0; }
  p { margin: 4px 0; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>AI 특허 평가 레포트</h1>
  <div class="meta">${escapeHtml(patentTitle)} · 권고: ${escapeHtml(recommendationLabels[report.recommendation] ?? report.recommendation)}` +
    `${report.totalScore != null ? ` · 종합 ${report.totalScore}점` : ""}` +
    `${report.evidenceConfidence ? ` · 근거 신뢰도 ${escapeHtml(report.evidenceConfidence)}` : ""}</div>
  ${report.recommendationText ? `<p>${escapeHtml(report.recommendationText)}</p>` : ""}
  ${report.keyEvidence ? `<h2>핵심 근거</h2><p>${escapeHtml(report.keyEvidence)}</p>` : ""}
  <h2>평가 점수</h2>
  <table><thead><tr><th>평가축</th><th style="text-align:right">점수</th><th style="text-align:center">등급</th></tr></thead>
  <tbody>${scoresRows}</tbody></table>
  ${report.judgementGrounds?.length ? `<h2>판단 근거</h2>${list(report.judgementGrounds)}` : ""}
  ${report.businessCheckRequests?.length ? `<h2>사업부 확인 요청</h2>${list(report.businessCheckRequests)}` : ""}
  ${sectionsHtml}
  ${report.rawMarkdown ? `<h2>전문</h2><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px">${escapeHtml(report.rawMarkdown)}</pre>` : ""}
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  // 렌더 후 인쇄 대화상자. onload가 안 잡히는 환경 대비 setTimeout 폴백.
  win.onload = () => win.print();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* 이미 인쇄됐거나 닫힘 */
    }
  }, 400);
}
