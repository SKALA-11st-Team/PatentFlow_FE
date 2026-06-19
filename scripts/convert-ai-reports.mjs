#!/usr/bin/env node
/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-BUS-01, FR-LEGAL-09
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03, UI-BUS-05
 * @description private report/summary markdown을 PatentFlow FE mock 데이터로 변환한다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const reportDir = path.join(repoRoot, "private", "valuation_reports", "raw");
const summaryDir = path.join(repoRoot, "private", "patent_summary", "raw");
const outputPath = path.join(repoRoot, "src", "mocks", "aiReports.mock.ts");

const categoryConfigs = [
  { heading: "권리성", key: "RIGHTS" },
  { heading: "기술성", key: "TECHNOLOGY" },
  { heading: "시장성", key: "MARKET" },
  { heading: "사업 연계성", key: "BUSINESS_ALIGNMENT" },
];

function main() {
  const reports = readMarkdownEntries(reportDir, /^(?<order>\d+)_(?<managementNumber>[^_]+)_(?<registrationNumber>KR\d+-\d+)_final_report\.md$/);
  const summaries = readMarkdownEntries(summaryDir, /^(?<order>\d+)_(?<managementNumber>[^_]+)_(?<registrationNumber>KR\d+-\d+)_summary\.md$/);
  const summariesByKey = new Map(summaries.map((entry) => [entry.key, entry]));
  const aiReports = {};
  const patentSummaries = {};
  const managementNumbers = [];

  for (const report of reports) {
    const summary = summariesByKey.get(report.key);

    if (!summary) {
      throw new Error(`Missing summary for ${report.fileName}`);
    }

    managementNumbers.push(report.managementNumber);
    aiReports[report.managementNumber] = parseAiReport(report);
    patentSummaries[report.managementNumber] = parsePatentSummary(summary);
  }

  fs.writeFileSync(outputPath, createOutputSource(aiReports, patentSummaries, managementNumbers));
  console.log(`Generated ${path.relative(repoRoot, outputPath)} from ${reports.length} report/summary pairs.`);
}

function readMarkdownEntries(directory, filePattern) {
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort()
    .map((fileName) => {
      const match = fileName.match(filePattern);

      if (!match?.groups) {
        throw new Error(`Unexpected markdown file name: ${fileName}`);
      }

      const filePath = path.join(directory, fileName);

      return {
        content: fs.readFileSync(filePath, "utf8"),
        fileName,
        filePath,
        key: `${match.groups.order}_${match.groups.managementNumber}_${match.groups.registrationNumber}`,
        managementNumber: match.groups.managementNumber,
        order: match.groups.order,
        registrationNumber: match.groups.registrationNumber,
      };
    });
}

function parseAiReport(entry) {
  const recommendationText = getBoldBulletValue(entry.content, "AI 검토 의견");
  const keyEvidence = getBoldBulletValue(entry.content, "핵심 근거");
  const judgementGrounds = parseBullets(getSection(entry.content, "## 2. 판단 근거", "## 3. 평가축별 근거")).map(
    (item) => item.text,
  );
  const businessCheckRequests = parseBullets(getSection(entry.content, "## 4. 사업부 확인 요청 사항")).map(
    (item) => item.text,
  );
  const scores = categoryConfigs.map((category, index) => {
    const section = getCategorySection(entry.content, category.heading, categoryConfigs[index + 1]?.heading);
    const score = parseCategoryScore(section);
    const evidenceDetails = parseBullets(getSectionAfterLine(section, "주요 판단 근거"));

    return {
      category: category.key,
      evidenceDetails,
      evidenceSummary: createEvidenceSummary(score, evidenceDetails),
      score: score.value,
    };
  });
  // Agent 권위: 종합 점수는 핵심 3축(권리성·기술성·시장성) 합(max 300), 평균은 그 3축 평균이다.
  // 사업 연계성(BUSINESS_ALIGNMENT)은 축 점수로 표시하되 종합 합산에서 제외한다.
  const coreScoreValues = scores
    .filter((score) => score.category !== "BUSINESS_ALIGNMENT")
    .map((score) => score.score)
    .filter((score) => typeof score === "number");
  const categoryTotal = coreScoreValues.reduce((sum, score) => sum + score, 0);
  const averageScore = coreScoreValues.length ? roundToOneDecimal(categoryTotal / coreScoreValues.length) : undefined;
  const externalSources = collectExternalSources(scores.flatMap((score) => score.evidenceDetails));

  return {
    averageScore,
    businessCheckRequests,
    createdAt: "2026-05-08T09:00:00+09:00",
    evaluationId: `EVAL-${entry.managementNumber}`,
    externalSources,
    judgementGrounds,
    keyEvidence,
    missingInformation: extractMissingInformation(entry.content),
    recommendation: getRecommendation(recommendationText),
    recommendationText,
    scores,
    totalScore: categoryTotal,
    totalScoreText: `${categoryTotal}/${coreScoreValues.length * 100}점, 평균 ${averageScore}점`,
  };
}

function parsePatentSummary(entry) {
  const problemSolved = parseBullets(getSection(entry.content, "### 해결하려는 문제", "### 핵심 아이디어"))
    .map((item) => item.text)
    .join(" ");
  const coreIdeas = parseBullets(getSection(entry.content, "### 핵심 아이디어", "### 주요 기능/구성")).map(
    (item) => item.text,
  );
  const featureBullets = parseBullets(getSection(entry.content, "### 주요 기능/구성", "### 기대 효과")).map(
    (item) => item.text,
  );

  return {
    claimsSummary: featureBullets.slice(0, 2).join(" ") || "주요 기능/구성 기준으로 권리 구성 확인이 필요합니다.",
    coreTechnicalPoints: [...coreIdeas, ...featureBullets].slice(0, 5),
    missingFields: [],
    problemSolved: problemSolved || "요약 파일에서 해결 과제 정보를 확인해야 합니다.",
    rawMarkdown: entry.content,
    summaryText: parseBullets(getSection(entry.content, "## 1. 한 줄 요약", "## 2. 핵심 내용"))[0]?.text ?? "요약 정보 확인 필요",
  };
}

function getBoldBulletValue(content, label) {
  const match = content.match(new RegExp(`- \\*\\*${escapeRegExp(label)}\\*\\*:\\s*([^\\n]+)`));

  return cleanInlineMarkdown(match?.[1] ?? "");
}

function getCategorySection(content, heading, nextHeading) {
  const start = content.search(new RegExp(`^###\\s+3\\.\\d+\\s+${escapeRegExp(heading)}`, "m"));

  if (start < 0) {
    return "";
  }

  const rest = content.slice(start);

  if (!nextHeading) {
    const nextMajor = rest.search(/\n##\s+\d+\./);
    return nextMajor >= 0 ? rest.slice(0, nextMajor) : rest;
  }

  const next = rest.search(new RegExp(`\\n###\\s+3\\.\\d+\\s+${escapeRegExp(nextHeading)}`, "m"));

  return next >= 0 ? rest.slice(0, next) : rest;
}

function getSection(content, startHeading, endHeading) {
  const start = content.indexOf(startHeading);

  if (start < 0) {
    return "";
  }

  const rest = content.slice(start + startHeading.length);

  if (!endHeading) {
    return rest;
  }

  const end = rest.indexOf(endHeading);

  return end >= 0 ? rest.slice(0, end) : rest;
}

function getSectionAfterLine(content, lineText) {
  const index = content.indexOf(lineText);

  return index >= 0 ? content.slice(index + lineText.length) : content;
}

function parseCategoryScore(section) {
  const match = section.match(/점수\/등급\*\*:\s*(\d+)\s*(?:점)?\s*\/\s*([^\n]+)/);

  return {
    grade: cleanInlineMarkdown(match?.[2] ?? ""),
    value: match ? Number(match[1]) : null,
  };
}

function parseBullets(section) {
  return section
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => parseBullet(line.trim().replace(/^-+\s*/, "")))
    .filter((item) => item.text.length > 0);
}

function parseBullet(rawText) {
  const sources = [];
  let text = rawText.replace(/\[자료:\s*(.+)\]\((https?:\/\/[^)]+)\)/g, (_, title, url) => {
    sources.push({ title: `자료: ${cleanInlineMarkdown(title)}`, url });
    return "";
  });

  text = text.replace(/\[(?!자료:)([^\]]+)\]\(([^)]+)\)/g, (_, title, url) => {
    sources.push({ title: cleanInlineMarkdown(title), url });
    return cleanInlineMarkdown(title);
  });

  return {
    source: sources[0],
    text: cleanInlineMarkdown(text),
  };
}

function createEvidenceSummary(score, evidenceDetails) {
  const firstEvidence = evidenceDetails[0]?.text ?? "평가 근거 확인 필요";
  const prefix = score.value ? `${score.value}${score.grade ? ` / ${score.grade}` : ""}` : "N/A";

  return `${prefix}: ${firstEvidence}`;
}

function collectExternalSources(details) {
  const sourceMap = new Map();

  for (const detail of details) {
    if (detail.source && !sourceMap.has(detail.source.url)) {
      sourceMap.set(detail.source.url, detail.source);
    }
  }

  return [...sourceMap.values()];
}

function extractMissingInformation(content) {
  const candidates = [
    ["파일랩퍼", "파일랩퍼/심사이력"],
    ["심사이력", "파일랩퍼/심사이력"],
    ["청구항", "청구항 전문/실시예 대응표"],
    ["실시예", "청구항 전문/실시예 대응표"],
    ["성능지표", "성능지표/필드 테스트"],
    ["필드 테스트", "성능지표/필드 테스트"],
    ["백테스트", "백테스트/실증 데이터"],
    ["실증", "백테스트/실증 데이터"],
    ["내부 제품", "내부 제품 적용 사례"],
    ["내부 적용", "내부 제품 적용 사례"],
    ["사업 적용", "내부 제품 적용 사례"],
    ["연차료", "연차료/유지비"],
    ["유지비", "연차료/유지비"],
    ["ROI", "ROI/매출 연계 자료"],
    ["매출", "ROI/매출 연계 자료"],
    ["유사·보완 특허", "포트폴리오 내 유사·보완 특허"],
    ["포트폴리오", "포트폴리오 내 유사·보완 특허"],
  ];
  const missing = [];

  for (const [needle, label] of candidates) {
    if (content.includes(needle) && !missing.includes(label)) {
      missing.push(label);
    }
  }

  return missing.length ? missing : ["추가 확인 필요"];
}

function getRecommendation(text) {
  if (/매각/.test(text)) {
    return "SALES_CANDIDATE";
  }

  if (/포기/.test(text) && !/조건부\s*유지|유지/.test(text)) {
    return "ABANDON";
  }

  if (/추가|조건부|재검토|확인/.test(text)) {
    return "REVIEW_AGAIN";
  }

  return "MAINTAIN";
}

function cleanInlineMarkdown(value) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[。]/g, ".")
    .trim();
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createOutputSource(aiReports, patentSummaries, managementNumbers) {
  return `/**
 * @relatedFR FR-LEGAL-05, FR-LEGAL-06, FR-LEGAL-07, FR-LEGAL-08, FR-BUS-01, FR-LEGAL-09
 * @relatedUI UI-LEGAL-04, UI-BUS-02, UI-BUS-03, UI-BUS-05
 * @description private report/summary markdown에서 생성한 발표용 AI 평가 레포트와 특허 이해 요약 mock 데이터
 *
 * Generated by scripts/convert-ai-reports.mjs.
 * Do not edit manually; update private markdown files and regenerate.
 */
import type { AiEvaluationReport, PatentSummary } from "../types/patent";

export const AI_REPORT_MANAGEMENT_NUMBERS = ${JSON.stringify(managementNumbers, null, 2)} as const;

export const aiReportsByManagementNumber: Record<string, AiEvaluationReport> = ${JSON.stringify(aiReports, null, 2)};

export const patentSummariesByManagementNumber: Record<string, PatentSummary> = ${JSON.stringify(patentSummaries, null, 2)};
`;
}

main();
