// CONTRACT-10(3단계): 생성 OpenAPI 스키마를 FE↔BE 계약 드리프트 가드로 묶는 단일 지점.
//
// 배경: springdoc는 Java record를 전부 optional·non-null 필드(`field?: T`)로 내보낸다 — 스펙에는
// nullability 정보가 없다. 그래서 생성 타입(`components["schemas"]`)을 그대로 alias하면 FE가 아는
// 정확한 nullability(예: `T | null`)와 required 여부를 잃는다. 따라서 수기 Backend* 타입은 그대로 두고,
// FE가 실제로 읽는 wire 필드명이 BE 스펙에 존재하는지를 '키 존재'로 컴파일 타임에 검증한다.
//
// 동작: BE가 어떤 응답 필드를 제거/개명하면 → `mvn -Dopenapi.update=true ...` 로 openapi.json 이 바뀌고
// → `npm run openapi:gen` 으로 이 디렉터리의 openapi.ts 가 갱신되며 → 사라진 키를 참조하는 아래 가드가
// `keyof` 제약을 위반해 `tsc -b`(=npm run build) 가 실패한다. 무음 계약 드리프트를 빌드에서 차단한다.
//
// 각 키 목록은 해당 mapBackend* 매핑 함수가 실제로 읽는 wire 필드와 일치한다(번호는 src/api/*.ts 위치).
import type { components } from "./openapi";

export type Schemas = components["schemas"];

/**
 * `Keys` 의 모든 멤버가 `TSchema` 의 키 집합에 포함될 때만 통과한다. 포함되지 않는 키가 하나라도 있으면
 * `Keys extends keyof NonNullable<TSchema>` 제약을 위반해 컴파일 에러(=드리프트 감지)가 발생한다.
 */
export type AssertSchemaKeys<TSchema, Keys extends keyof NonNullable<TSchema>> = Keys;

/**
 * FE 매핑 코드가 의존하는 wire 필드 ↔ BE OpenAPI 스키마 키의 정합을 한곳에 모은 컴파일 타임 계약.
 * 이 인터페이스가 컴파일되면 = 나열된 모든 필드가 현재 BE 스펙에 존재함이 보증된다.
 */
export interface ContractGuards {
  // src/api/patents.ts — mapBackendPatentListItem(546)
  patentListItem: AssertSchemaKeys<
    Schemas["PatentListItemResponse"],
    | "patentId" | "managementNumber" | "registrationNumber" | "title" | "draftTitle"
    | "departmentId" | "departmentName" | "lifecycleStatus" | "reviewWorkflowStatus" | "reviewReason"
    | "currentRecommendation" | "businessOpinionDecision" | "legalActionResult" | "applicationNumber"
    | "businessArea" | "technologyArea" | "productName" | "country" | "coApplicants"
    | "applicationDate" | "registrationDate" | "expectedExpirationDate" | "feeDueDate" | "originalPatentUrl"
  >;
  // src/api/patents.ts — mapBackendPatentDetail(578) 최상위 필드
  patentDetail: AssertSchemaKeys<
    Schemas["PatentDetailResponse"],
    | "patentId" | "summary" | "aiEvaluationReport" | "finalDecisionRecord" | "businessOpinion" | "inReview"
  >;
  // src/api/patents.ts — mapBackendSummary(588). 주의: rawMarkdown 은 BE PatentSummaryResponse 에 없어
  // 매핑/가드 모두에서 제외(드리프트 정리 완료).
  patentSummary: AssertSchemaKeys<
    Schemas["PatentSummaryResponse"],
    "summaryText" | "problemSolved" | "coreTechnicalPoints" | "claimsSummary" | "missingFields"
  >;
  // src/api/patents.ts — mapBackendAiEvaluationReport(599)
  aiEvaluationReport: AssertSchemaKeys<
    Schemas["AiEvaluationReportResponse"],
    | "reportId" | "createdAt" | "recommendation" | "recommendationReason" | "totalScore" | "averageScore"
    | "finalGrade" | "finalIndicator" | "degraded" | "failureReason" | "scores" | "missingInformation"
    | "keyEvidence" | "judgementGrounds" | "businessCheckRequests" | "externalSources" | "rawMarkdown" | "markdownFilePath"
  >;
  // src/api/patents.ts — mapBackendEvaluationScores(636)
  evaluationScore: AssertSchemaKeys<
    Schemas["EvaluationScoreResponse"],
    "category" | "score" | "grade" | "evidence" | "evidenceDetails"
  >;
  // src/api/patents.ts — mapBackendEvidenceDetails(662)
  evidenceDetail: AssertSchemaKeys<Schemas["EvidenceDetailResponse"], "text" | "source">;
  // src/api/patents.ts — mapBackendSource(655) / mapBackendExternalSources(668)
  source: AssertSchemaKeys<Schemas["SourceResponse"], "title" | "url">;
  // src/api/patents.ts — mapBackendFinalDecisionRecord(720)
  finalDecisionRecord: AssertSchemaKeys<Schemas["FinalDecisionRecordResponse"], "decisionId" | "reason" | "decidedAt">;
  // src/api/patents.ts — mapBackendBusinessOpinion(731)
  businessOpinion: AssertSchemaKeys<Schemas["BusinessOpinionResponse"], "decision" | "reason" | "submittedAt">;
  // src/api/patents.ts — getPatentBibliographicInfo 정규화
  patentBibliographicInfo: AssertSchemaKeys<
    Schemas["PatentBibliographicInfoResponse"],
    | "managementNumber" | "title" | "applicationDate" | "coApplicants" | "country" | "registrationDate"
    | "applicationNumber" | "registrationNumber" | "expectedExpirationDate" | "source"
  >;
  // src/api/notifications.ts — 알림 매핑
  notification: AssertSchemaKeys<
    Schemas["NotificationResponse"],
    "notificationId" | "title" | "message" | "targetRole" | "isRead" | "createdAt" | "link"
  >;
  // src/api/businessSubmissions.ts — mapBackendBusinessSubmission(57)
  businessSubmissionVersion: AssertSchemaKeys<
    Schemas["BusinessSubmissionVersionResponse"],
    | "submissionId" | "version" | "decision" | "reason" | "submittedBy" | "submittedAt" | "aiReportCreatedAt"
    | "aiRecommendation" | "aiTotalScore" | "checklistTotal" | "checklistScores" | "qualitativeScore"
  >;
  businessSubmissionChecklistScore: AssertSchemaKeys<
    Schemas["BusinessSubmissionChecklistScoreResponse"],
    "itemId" | "score" | "memo"
  >;
  // src/api/businessChecklist.ts — 체크리스트 정의 매핑. 주의: itemId 폴백은 BE 에 없어 제거(드리프트 정리).
  businessChecklistItem: AssertSchemaKeys<
    Schemas["BusinessChecklistItemResponse"],
    "id" | "category" | "title" | "description" | "options"
  >;
  businessChecklistScoreOption: AssertSchemaKeys<Schemas["BusinessChecklistScoreOptionResponse"], "score" | "label">;
}
