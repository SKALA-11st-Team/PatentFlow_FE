# AGENTS.md — PatentFlow Frontend

## Role of This Coding Agent

You are working as the frontend implementation agent for PatentFlow.

Your primary responsibility is the React/Vite frontend only.

Do not implement backend business logic, Spring Boot APIs, FastAPI services, LangChain agents, database schemas, or production deployment unless the user explicitly asks.

You may create frontend API client modules, mock API responses, types, fixtures, and integration placeholders that make the frontend ready for backend/AI integration.

## Project Overview

PatentFlow is an internal patent management AI workflow system.

- Service name: PatentFlow
- Team name: SYUUK
- Topic: Internal patent management AI
- Core message: AI supports, humans decide
- Goal: Help legal/patent management teams and business departments review company-owned patents around annual fee payment points.
- Product nature: Human-in-the-loop decision-support workflow system, not a simple report generator.

Core workflow:

```text
Review target identification
→ Patent understanding
→ AI evaluation draft generation
→ Human review and final decision
→ Mailing / delivery
→ History management
→ Abandoned patent sales-candidate management
```

## Frontend Scope

The frontend should support the following user groups.

### 1. 관리자 / Legal Team User

The administrator can:

- View all patent status
- Manage patents under review
- Search, filter, and sort patent lists
- Register and edit patent basic information
- View AI evaluation results
- View evaluation evidence
- Record or edit human final decisions
- Manage mailing preview and sending history
- Manage department-recipient mappings
- Manage abandoned patents as sales candidates
- Manage settings and evaluation criteria

### 2. 사업부 사용자 / Business Department User

The business user can:

- View patents assigned to their department
- Understand patent content through summaries and explanations
- View AI evaluation drafts
- Enter business-side opinions
- Upload internal documents for re-evaluation
- View re-evaluation results
- Submit maintain / abandon / re-review opinions

## Technology Stack

Use the existing frontend stack if already configured.

Planned frontend stack:

- React
- Vite
- TypeScript if already used or if setting up from scratch
- CSS Modules, plain CSS, Tailwind, or existing style system depending on the repository
- React Router if routing is needed and not already implemented
- No unnecessary heavy UI library unless the repository already uses one

Do not add new dependencies unless they are clearly needed.

If a dependency is needed, explain why.

## Out of Scope for This Agent

Do not implement:

- Spring Boot backend
- FastAPI AI serving
- LangChain agents
- Database schema
- Production deployment
- Mobile app
- Automatic assignee allocation
- Commercial packaging
- Full patent sale price estimation agent

If backend or AI behavior is needed for FE development, use:

- typed API client functions
- mock data
- fixture files
- TODO comments for integration points

## Fixed Functional Requirements

Do not change the meaning or numbering of FR-001 through FR-022.

Frontend work should reflect these fixed requirements:

- FR-001: 검토 대상 특허 조회
- FR-002: 특허 목록 검색/필터링/정렬
- FR-003: 특허 기본 정보 등록
- FR-004: 회사 컨텍스트 입력/수정
- FR-005: 특허 내용 요약 생성
- FR-006: AI 기반 특허 가치 재평가 수행
- FR-007: 평가 근거 제공
- FR-008: 종합 권고안 생성
- FR-009: 사업부 의견 입력
- FR-010: 내부 문서 반영 재평가
- FR-011: AI 초안과 사람 최종 판단 분리 조회/수정
- FR-012: 최종 의사결정 기록
- FR-013: 평가/판단 이력 조회
- FR-014: 부서별 수신자 및 메일링 매핑 등록/수정
- FR-015: 메일 미리보기
- FR-016: 메일 발송 이력 저장/조회
- FR-017: 포기 특허를 매각 후보 리스트로 분류/조회
- FR-018~FR-022: Already assumed in project planning. Do not renumber earlier requirements.

If new frontend features are needed, label them from FR-023 onward only in documents. Do not alter existing FR IDs.

## Main Frontend Screens

Build or maintain these screens.

### Administrator Screens

- Admin Dashboard
- Patent Management
- Patent Registration / Edit
- Patent Detail
- Mailing
- Mailing History
- Sales Candidate Management
- Settings

### Business User Screens

- Business Dashboard
- Department Patent List
- Patent Detail for Business User
- Business Opinion Form
- Internal Document Upload
- Re-evaluation Result

## Important Screen: Patent Detail

Patent Detail is the most important screen.

It must help non-technical business users understand the patent before giving an opinion.

Include or prepare areas for:

- Patent basic metadata
- Why this patent is currently under review
- Patent summary
- Problem solved by the patent
- Core technical points
- Rights / claims summary
- AI evaluation draft
- Evaluation score by category
- Evidence for each evaluation item
- Missing information or N/A fields
- Human final decision
- Business department opinion
- Evaluation and decision history

The UI must clearly separate:

```text
AI evaluation draft != Human final decision
```

Use labels or visual separation such as:

- AI 평가 초안
- 사람 최종 판단
- 사업부 의견
- 평가 근거
- 정보 부족 / 추가 확인 필요

## Evaluation UI Direction

Evaluation criteria may include:

- 기술성
- 시장성
- 사업 연관성
- 전략적 가치
- 권리범위
- 기술/시장 성숙도
- 비용 대비 효용

Frontend must not present AI output as the final decision.

AI output should be shown as a draft or recommendation.

When data is insufficient, display:

- 정보 부족 있음
- 추가 확인 필요
- N/A

Do not invent missing business data in frontend fixtures.

Mock data should clearly look like test data.

## Suggested Frontend Directory Structure

If the project already has a structure, follow it.

If not, prefer:

```text
src/
  app/
    router/
    providers/
  pages/
    admin/
      DashboardPage.tsx
      PatentManagementPage.tsx
      PatentDetailPage.tsx
      MailingPage.tsx
      SalesCandidatePage.tsx
      SettingsPage.tsx
    business/
      BusinessDashboardPage.tsx
      BusinessPatentListPage.tsx
      BusinessPatentDetailPage.tsx
      BusinessOpinionPage.tsx
      DocumentUploadPage.tsx
  components/
    common/
      Button.tsx
      Card.tsx
      Badge.tsx
      Table.tsx
      Modal.tsx
      EmptyState.tsx
      LoadingState.tsx
    layout/
      AppLayout.tsx
      Sidebar.tsx
      Header.tsx
    patent/
      PatentSummaryCard.tsx
      PatentMetaPanel.tsx
      PatentStatusBadge.tsx
      PatentFilterBar.tsx
    evaluation/
      EvaluationScoreCard.tsx
      EvaluationEvidenceList.tsx
      RecommendationBadge.tsx
      HumanDecisionPanel.tsx
    mailing/
      MailPreview.tsx
      MailingHistoryTable.tsx
      RecipientMappingForm.tsx
    upload/
      DocumentUploadBox.tsx
  api/
    client.ts
    patents.ts
    evaluations.ts
    mailing.ts
    salesCandidates.ts
    settings.ts
  mocks/
    patents.mock.ts
    evaluations.mock.ts
    mailing.mock.ts
  types/
    patent.ts
    evaluation.ts
    mailing.ts
    user.ts
  hooks/
  utils/
  styles/
```

## UI/UX Principles

Prioritize:

- Readability for legal and business users
- Clear workflow status
- Clear distinction between AI recommendation and human decision
- Evidence-based display
- Simple table filtering and sorting
- Empty/loading/error states
- Consistent status badges
- Demo readiness for mid/final presentation

Avoid:

- Overly complex animations
- UI that looks like a generic admin template without PatentFlow context
- Hiding important evidence behind too many clicks
- Presenting AI recommendation as final judgment
- Large refactors unrelated to the requested task

## Routing Guidance

If routing is needed, use routes like:

```text
/admin/dashboard
/admin/patents
/admin/patents/:patentId
/admin/mailing
/admin/sales-candidates
/admin/settings

/business/dashboard
/business/patents
/business/patents/:patentId
/business/opinions/:patentId
/business/upload/:patentId
```

If the existing project uses different routing, follow the existing convention.

## API Integration Guidance

Frontend should be ready for Spring Boot and FastAPI integration, but do not implement those services.

Use API modules with clear function names.

Examples:

```ts
getReviewTargetPatents()
getPatentDetail(patentId)
createPatent(payload)
updateCompanyContext(patentId, payload)
requestPatentSummary(patentId)
requestPatentEvaluation(patentId)
submitBusinessOpinion(patentId, payload)
uploadInternalDocumentForReevaluation(patentId, file)
getEvaluationHistory(patentId)
previewMailing(payload)
getMailingHistory()
getSalesCandidates()
```

If real APIs are unavailable, use mock adapters or fixtures.

Do not hardcode all data directly inside page components.

## Type Modeling Guidance

Prefer explicit domain types.

Suggested domain types:

```ts
type PatentStatus =
  | "NORMAL"
  | "REVIEW_REQUIRED"
  | "MAIL_SENT"
  | "OPINION_SUBMITTED"
  | "FINAL_DECIDED"
  | "ABANDONED"
  | "SALES_CANDIDATE";

type Recommendation =
  | "MAINTAIN"
  | "REVIEW_AGAIN"
  | "ABANDON"
  | "SALES_CANDIDATE"
  | "HOLD";

type EvaluationCategory =
  | "TECHNOLOGY"
  | "MARKET"
  | "BUSINESS_RELEVANCE"
  | "STRATEGIC_VALUE"
  | "RIGHT_SCOPE"
  | "MATURITY"
  | "COST_EFFECTIVENESS";
```

Korean labels can be mapped at the UI layer.

## Styling Guidance

Use the repository's existing style system.

If there is no style system:

- Keep CSS simple and maintainable.
- Use semantic class names.
- Prefer a clean enterprise dashboard style.
- Make tables readable.
- Use badges for status and recommendation.
- Keep Patent Detail visually clear and sectioned.

Do not change global styles in a way that breaks existing pages.

## Traceability Requirements: FR ID and UI ID

Every newly created or modified frontend page, component, hook, API client function, mock data file, and important utility should include traceability metadata.

The metadata must show:

- Related FR ID
- Related UI ID
- Purpose of the file/function/component

Use this rule for:

- Page components
- Business components
- Form components
- Table components
- API client functions
- Mock data
- Route definitions
- Important hooks
- Important utility functions

### Official UI ID Mapping

Use the following official UI IDs. Do not invent a different UI ID system.

| UI ID | 화면명 | 사용자 | 설명 |
|---|---|---|---|
| UI-001 | 로그인 | 공통 | 관리자/사업부 사용자가 로그인하고 역할에 따라 화면 진입 |
| UI-002 | 대시보드 | 관리자 | 검토 대상 특허, 만료 임박 특허, 상태 요약 확인 |
| UI-003 | 특허관리 | 관리자 | 전체 특허 목록 조회, 검색, 필터링, 정렬, 일괄 업로드 |
| UI-004 | 특허 등록/수정 | 관리자 | 특허 기본 정보, 회사 컨텍스트 정보 등록 및 수정 |
| UI-005 | 특허상세 | 관리자, 사업부 사용자 | 특허 요약, AI 평가 결과, 근거, 권고안, 최종 판단을 확인하는 상세 화면 |
| UI-006 | 사업부 마이페이지 | 사업부 사용자 | 사업부가 검토 요청받은 특허 목록을 확인하고 의견을 입력하는 화면 |
| UI-007 | 메일링 | 관리자 | 메일 미리보기, 수신자 매핑, 발송 내역 조회 |
| UI-008 | 설정 | 관리자 | 운영 기준, 평가 기준, 메일링 매핑 정보 설정 |
| UI-009 | 레포트 | 관리자, 사업부 사용자 | 평가 이력, 최종 판단 이력, 매각 후보 리스트, AI 피드백 조회 |

### Required Comment Format

For React components and page files, add a short comment near the top of the file.

Example:

```tsx
/**
 * @relatedFR FR-001, FR-002
 * @relatedUI UI-003
 * @description 관리자 특허 목록 조회, 검색, 필터링, 정렬 화면
 */
```

For functions, add a comment directly above the function.

Example:

```ts
/**
 * @relatedFR FR-001
 * @relatedUI UI-002
 * @description 관리자 대시보드에서 검토 대상 특허 목록을 조회한다.
 */
export async function getReviewTargetPatents() {
  // ...
}
```

For reusable components used by multiple screens, list all known related FR/UI IDs, or use `COMMON` only when the component is purely common UI and has no direct screen relationship.

Example:

```tsx
/**
 * @relatedFR FR-001, FR-002, FR-013
 * @relatedUI UI-002, UI-003, UI-009
 * @description 특허 목록, 대시보드 목록, 이력 목록에서 사용하는 공통 테이블 컴포넌트
 */
```

If the exact UI ID cannot be determined from the official mapping, do not invent a new final UI ID.

Instead, use:

```tsx
/**
 * @relatedFR FR-005, FR-006, FR-007, FR-008
 * @relatedUI TODO-UI-ID
 * @description UI 정의서 기준 화면 ID 확인 필요
 */
```

### Recommended FR ↔ UI Mapping

Use this mapping as the default traceability guide.

| FR ID | Requirement | Primary UI ID |
|---|---|---|
| FR-001 | 검토 대상 특허 조회 | UI-002, UI-003, UI-006 |
| FR-002 | 특허 목록 검색/필터링/정렬 | UI-003 |
| FR-003 | 특허 기본 정보 등록 | UI-004 |
| FR-004 | 회사 컨텍스트 입력/수정 | UI-004 |
| FR-005 | 특허 내용 요약 생성 | UI-005 |
| FR-006 | AI 기반 특허 가치 재평가 수행 | UI-005, UI-006 |
| FR-007 | 평가 근거 제공 | UI-005 |
| FR-008 | 종합 권고안 생성 | UI-005 |
| FR-009 | 사업부 의견 입력 | UI-006, UI-005 |
| FR-010 | 내부 문서 반영 재평가 | UI-006, UI-005 |
| FR-011 | AI 초안과 사람 최종 판단 분리 조회/수정 | UI-005 |
| FR-012 | 최종 의사결정 기록 | UI-005, UI-009 |
| FR-013 | 평가/판단 이력 조회 | UI-005, UI-009 |
| FR-014 | 부서별 수신자 및 메일링 매핑 등록/수정 | UI-007, UI-008 |
| FR-015 | 메일 미리보기 | UI-007 |
| FR-016 | 메일 발송 이력 저장/조회 | UI-007, UI-009 |
| FR-017 | 포기 특허를 매각 후보 리스트로 분류/조회 | UI-009, UI-005 |

For FR-018~FR-022, inspect the project requirement document before assigning UI IDs. Do not guess.

### Important

Do not change existing FR numbers.

Do not assign unrelated FR IDs just to fill the comment.

Do not use old temporary UI IDs such as `UI-ADM-DASHBOARD` or `UI-BIZ-PATENT-LIST` unless the user explicitly reintroduces them.

If a component has no direct FR relationship, use:

```text
@relatedFR N/A
```

If a UI relationship is common-only, use:

```text
@relatedUI COMMON
```

If a UI ID is unknown, use:

```text
@relatedUI TODO-UI-ID
```

When reporting back after a task, include a traceability summary table:

```text
Changed file | Related FR | Related UI ID | Notes
```



## WBS / Excel Context

The user may ask to edit WBS Excel files.

If asked:

- Preserve column widths.
- Preserve 1~3행 title/header styles.
- Use actual 담당자 names, not role names.
- Use yyyy-mm-dd date format.
- Keep 기간(일) formula if it already exists.
- Do not overwrite user-confirmed WBS ID / Work Package / 트랙 / 태스크명.
- If regenerating Gantt charts, use start/end dates and preserve existing chart style.

However, frontend code implementation is the primary scope.

## Schedule Context

Project schedule:

- Start: 2026-04-17
- Mid presentation: 2026-05-21
- Preliminary final: 2026-06-22
- Final presentation: 2026-06-24

Frontend priorities before mid presentation:

1. Admin Dashboard
2. Patent Management list
3. Patent Detail
4. Patent summary display
5. AI evaluation draft display
6. Human final decision separation
7. Basic mock data and API client structure

Frontend priorities before final presentation:

1. Business user flow
2. Business opinion form
3. Internal document upload UI
4. Re-evaluation result UI
5. Mailing preview/history
6. Sales candidate management
7. Settings
8. E2E demo polish

## Testing and Build

Before finishing a frontend task, run relevant commands if available.

Common commands:

```bash
npm install
npm run lint
npm run build
npm test
```

Use the commands found in `package.json`.

Do not claim tests passed unless they were actually run.

If tests cannot be run, explain why.

## Work Rules

Before changing code:

1. Inspect the existing structure.
2. Identify the frontend root.
3. Check `package.json`.
4. Check routing, styling, and existing component conventions.
5. Make the smallest safe change.

When editing:

- Do not rewrite unrelated files.
- Do not change backend or AI files.
- Do not introduce unnecessary dependencies.
- Do not remove existing functionality.
- Do not rename routes or components unless needed.
- Keep Korean UI text natural and consistent.

## Reporting Back

After completing a task, report:

1. What files were changed
2. What UI or behavior was added
3. What mock/API assumptions were used
4. What commands were run
5. Any remaining TODOs or integration points
