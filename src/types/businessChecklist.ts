import type { BusinessOpinionDecision } from "./patent";

export interface BusinessChecklistScoreOption {
  score: number;
  label: string;
}

export interface BusinessChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  options: BusinessChecklistScoreOption[];
}

export interface BusinessChecklistResponse {
  itemId: string;
  score: number | null;
  aiSuggestedScore: number;
  memo: string;
}

export interface BusinessChecklistSubmission {
  patentId: string;
  evaluatorName: string;
  evaluatedAt: string;
  responses: BusinessChecklistResponse[];
  qualitativeScore: number;
  qualitativeMemo: string;
  finalOpinion: BusinessOpinionDecision;
  finalReason: string;
  additionalNeeds: string;
}
