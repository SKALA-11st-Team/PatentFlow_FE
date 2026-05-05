import { businessChecklistItems } from "./businessChecklist.mock";
import type { BusinessOpinionDecision, PatentDetail, PatentListItem, Recommendation } from "../types/patent";

export interface BusinessSubmissionChecklistScore {
  itemId: string;
  score: number;
  memo: string;
}

export interface BusinessSubmissionVersion {
  submissionId: string;
  version: number;
  opinion: BusinessOpinionDecision;
  reason: string;
  submittedBy: string;
  submittedAt: string;
  aiReportCreatedAt: string;
  aiRecommendation: Recommendation;
  aiTotalScore: number;
  checklistTotal: number;
  checklistScores: BusinessSubmissionChecklistScore[];
  qualitativeScore: number;
}

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-009
 * @description 특허별 사업부 제출 이력 n건을 데모 데이터로 생성한다.
 */
export function getBusinessSubmissionVersions(patent: PatentDetail | PatentListItem): BusinessSubmissionVersion[] {
  if (!patent.businessOpinionDecision) {
    return [];
  }

  const submissionCount = getSubmissionCount(patent.patentId);
  const latestOpinion = patent.businessOpinionDecision;

  return Array.from({ length: submissionCount }, (_, index) => {
    const version = index + 1;
    const isLatest = version === submissionCount;
    const opinion = isLatest ? latestOpinion : getPreviousOpinion(latestOpinion, version);
    const submittedAt = getSubmittedAt(version);
    const qualitativeScore = opinion === "MAINTAIN" ? 3 : -3;
    const checklistScores = getChecklistScores(opinion, version);

    return {
      submissionId: `${patent.patentId}-SUB-${String(version).padStart(2, "0")}`,
      version,
      opinion,
      reason: getSubmissionReason(opinion, version, isLatest),
      submittedBy: `${patent.departmentName} 담당자`,
      submittedAt,
      aiReportCreatedAt: getAiReportCreatedAt(version),
      aiRecommendation: patent.currentRecommendation,
      aiTotalScore: getSubmissionScore(patent.currentRecommendation, version),
      checklistTotal: getChecklistTotal(checklistScores, qualitativeScore),
      checklistScores,
      qualitativeScore,
    };
  });
}

/**
 * @relatedFR FR-009, FR-013
 * @relatedUI UI-009
 * @description 특허별 제출 이력 목록에서 최신 제출 요약을 조회한다.
 */
export function getLatestBusinessSubmission(patent: PatentDetail | PatentListItem) {
  const versions = getBusinessSubmissionVersions(patent);

  return versions.length > 0 ? versions[versions.length - 1] : null;
}

function getSubmissionCount(patentId: string) {
  const digits = patentId.match(/\d/g);
  const lastDigit = Number(digits ? digits[digits.length - 1] : 1);

  return (lastDigit % 3) + 1;
}

function getPreviousOpinion(latestOpinion: BusinessOpinionDecision, version: number): BusinessOpinionDecision {
  if (version % 2 === 0) {
    return latestOpinion;
  }

  return latestOpinion === "MAINTAIN" ? "ABANDON" : "MAINTAIN";
}

function getSubmittedAt(version: number) {
  const day = 1 + version * 2;

  return `2026-05-${String(day).padStart(2, "0")}T14:20:00+09:00`;
}

function getAiReportCreatedAt(version: number) {
  const day = Math.max(1, version * 2);

  return `2026-05-${String(day).padStart(2, "0")}T09:00:00+09:00`;
}

function getSubmissionReason(opinion: BusinessOpinionDecision, version: number, isLatest: boolean) {
  if (isLatest) {
    return opinion === "MAINTAIN"
      ? "사업부 검토 결과 현재 제품 또는 향후 로드맵과의 연결성이 확인되어 유지 의견을 제출했습니다."
      : "현재 사업 적용 계획과 활용 근거가 부족해 포기 의견을 제출했습니다.";
  }

  return `${version}차 검토 당시 확인 가능한 내부 자료를 기준으로 임시 ${opinion === "MAINTAIN" ? "유지" : "포기"} 의견을 제출했습니다.`;
}

function getSubmissionScore(recommendation: Recommendation, version: number) {
  const baseScore: Record<Recommendation, number> = {
    MAINTAIN: 80,
    REVIEW_AGAIN: 64,
    ABANDON: 48,
    SALES_CANDIDATE: 52,
    HOLD: 60,
  };

  return Math.min(95, baseScore[recommendation] + version * 2);
}

function getChecklistScores(
  opinion: BusinessOpinionDecision,
  version: number,
): BusinessSubmissionChecklistScore[] {
  return businessChecklistItems.map((item, index) => {
    const baseScore = opinion === "MAINTAIN" ? 3 : 2;
    const versionBonus = version > 1 && opinion === "MAINTAIN" && index % 2 === 0 ? 1 : 0;
    const abandonPenalty = opinion === "ABANDON" && index % 2 === 1 ? 1 : 0;
    const score = Math.max(1, Math.min(4, baseScore + versionBonus - abandonPenalty));

    return {
      itemId: item.id,
      score,
      memo: `${item.title} 기준 ${score}점으로 제출했습니다.`,
    };
  });
}

function getChecklistTotal(scores: BusinessSubmissionChecklistScore[], qualitativeScore: number) {
  return scores.reduce((sum, score) => sum + score.score, 0) + qualitativeScore;
}
