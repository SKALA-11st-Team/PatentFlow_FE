# add-db-cleanup Frontend Handoff

이 문서는 `add-db-cleanup` 브랜치에서 BE 연동을 위해 정리한 FE 변경 사항과 다음 세션에서 확인해야 할 항목을 기록한다.

## 현재 브랜치 상태

- 대상 브랜치: `add-db-cleanup`
- 목적: mock 중심 화면을 실제 BE API와 연결 가능한 구조로 정리
- BE도 같은 이름의 `add-db-cleanup` 브랜치에서 API/DB/Auth 정리 중

## 주요 커밋

- `feat: 대시보드 요약과 특허 이력 API 연결`
  - 관리자/사업부 대시보드 summary API wrapper 추가
  - 특허 이력 API wrapper 추가
  - 대시보드 KPI에 BE summary 응답 우선 반영
  - 특허 상세에 평가 및 판단 이력 섹션 추가
- `docs: 최신 FR UI 계약 반영`
- `docs: FE FR UI 주석 최신화`

## API 사용 모드

FE는 다음 기준으로 mock/API 모드를 구분한다.

- `VITE_USE_MOCK_API=true`이면 mock 사용
- `VITE_API_BASE_URL`이 있고 `VITE_USE_MOCK_API`가 true가 아니면 BE API 사용

실제 BE 연동 QA를 할 때는 `.env.local`에서 예를 들어 아래처럼 둔다.

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK_API=false
```

## 최근 추가된 FE API Wrapper

추가 파일:

- `src/api/dashboard.ts`

추가/보강 함수:

- `getLegalDashboardSummary()`
  - `GET /api/v1/legal/dashboard/summary`
- `getBusinessDashboardSummary()`
  - `GET /api/v1/business/dashboard/summary`
- `getPatentHistory(patentId)`
  - `GET /api/v1/patents/{patentId}/history`

관리자 사용자/부서 수정 API는 FE에 이미 존재했으며, BE에 맞춰짐:

- `updateUser(userId, request)`
  - `PUT /api/v1/admin/users/{userId}`
- `updateDepartment(departmentId, departmentName)`
  - `PUT /api/v1/admin/departments/{departmentId}`

## UI 연결 상태

관리자 대시보드:

- summary API가 성공하면 KPI 숫자에 BE 응답을 우선 사용한다.
- summary API가 실패하면 기존처럼 특허 목록에서 계산한 값으로 fallback한다.

사업부 대시보드:

- summary API가 성공하면 KPI와 도넛 차트 숫자에 BE 응답을 우선 사용한다.
- 실패 시 기존 목록 기반 계산으로 fallback한다.

특허 상세:

- `getPatentHistory()`를 호출한다.
- “평가 및 판단 이력” 섹션을 추가했다.
- AI 레포트 생성, 메일 발송, 최종 판단 저장 후 이력을 다시 불러오도록 연결했다.

## Auth 관련 현재 상태

현재 FE는 BE의 username/password 로그인과 cookie 기반 refresh 구조를 사용한다.

Google OAuth는 아직 BE에 구현되어 있지 않다.

설정 화면에는 Gmail OAuth 방향의 문구가 있지만 현재 버튼은 BE OAuth 엔드포인트 준비 전까지 활성화 대상이 아니다.

## Workflow Status 기준

현재 FE가 사용하는 workflow 상태는 아래 6개다.

```ts
[
  "NOT_IN_REVIEW_QUARTER",
  "REVIEW_QUARTER_STARTED",
  "MAIL_READY",
  "WAITING_BUSINESS_RESPONSE",
  "BUSINESS_RESPONSE_RECEIVED",
  "LEGAL_ACTION_RECORDED",
]
```

`REPORT_GENERATED`는 사용하지 않는다.

AI 평가 레포트 생성이 끝나면 바로 `MAIL_READY`로 간주한다.

## 수동 QA 포인트

1. 관리자 로그인 후 대시보드 KPI가 BE summary와 맞는지 확인
2. 사업부 로그인 후 대시보드 KPI가 해당 부서 기준으로 보이는지 확인
3. 특허 상세에서 “평가 및 판단 이력”이 표시되는지 확인
4. AI 레포트 생성 후 상태가 `MAIL_READY`로 전환되는지 확인
5. 메일 발송 후 상태가 `WAITING_BUSINESS_RESPONSE`로 전환되는지 확인
6. 사업부 체크리스트 제출 후 상태가 `BUSINESS_RESPONSE_RECEIVED`로 전환되는지 확인
7. 최종 판단 저장 후 상태가 `LEGAL_ACTION_RECORDED`로 전환되는지 확인
8. 특허 관리/수정 화면에서 전체 185건과 페이지/필터/검색 결과가 의도대로 보이는지 확인
9. `checklist-items` 401/403이 재발하지 않는지 권한별로 확인
10. summary API 실패 시 대시보드가 죽지 않고 fallback 값으로 표시되는지 확인

## 다음 세션 우선순위

1. 사용자가 수동 QA에서 발견한 401/403, 수량 차이, 상태 전환 문제를 우선 수정
2. 대시보드 summary API와 목록 기반 count가 서로 다른 경우 source of truth를 BE로 고정할지 결정
3. 특허 상세 이력 UI가 현재 BE 응답 문구/타입과 발표/시연에 충분한지 확인
4. 설정 화면의 Google OAuth 문구를 실제 구현 계획에 맞게 유지/수정
5. mock fallback이 시연을 방해하지 않도록 `.env.example`, `.env.local` 가이드 재점검
