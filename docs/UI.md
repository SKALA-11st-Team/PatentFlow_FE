# PatentFlow UI And FR Traceability

이 문서는 현재 PatentFlow FE에서 사용하는 공식 UI ID와 FR 연결 기준이다.

## Official UI IDs

| UI ID | 화면명 | 사용자 | 설명 | 주요 경로/구현 |
|---|---|---|---|---|
| `UI-COM-01` | 로그인 | 공통 | 관리자/사업부 사용자가 로그인하고 역할에 따라 화면 진입 | `/login`, `src/pages/LoginPage.tsx` |
| `UI-COM-02` | 상태별 특허 리스트 | 공통 | 동일한 workflow 상태의 특허들을 표로 리스트업하고 검색과 정렬 제공 | 대시보드/검토 목록/사업부 목록의 공통 리스트 패턴 |
| `UI-COM-03` | 알림 패널 | 공통 | 읽지 않은 알림 배지, 오늘/지난주/그 이전 그룹, 읽음 토글 액션 | `src/components/notification/NotificationPanel.tsx` |
| `UI-COM-04` | 초대 수락 | 공통 | 사업부 사용자가 법무팀 초대 링크로 진입해 최초 비밀번호를 설정하고 계정을 활성화 | `/invite/accept`, `src/pages/InvitationAcceptPage.tsx` |
| `UI-LEGAL-01` | 관리자 대시보드 | 관리자 | 해당 분기에 연차료를 내야 하는 특허들의 상태와 상세를 KPI 카드와 특허 리스트로 표시 | `/admin/dashboard` |
| `UI-LEGAL-02` | 특허 관리 | 관리자 | 특허를 새로 등록하거나 수정 대상으로 조회하는 페이지 | `/admin/patents` |
| `UI-LEGAL-03` | 특허 수정 | 관리자 | 선택한 특허를 수정 | `/admin/patents/:patentId/edit` |
| `UI-LEGAL-04` | 특허 상세 | 관리자 | 특허 요약, AI 레포트, 근거, 권고안, 최종 판단 확인 | `/admin/patents/:patentId` |
| `UI-LEGAL-04-1` | 특허 상세-1 | 관리자 | 특허 상세의 보조/확장 화면 또는 발표용 세부 화면 | `src/pages/shared/PatentDetailPage.tsx` 내부 상세 섹션 |
| `UI-LEGAL-05` | 메일링 | 관리자 | 사업부 검토 요청 메일 미리보기, 발송, 발송 이력 조회 | `/admin/mailing` |
| `UI-LEGAL-07` | 관리자 설정 | 관리자 | 운영 기준, 회신 기한, 메일 발송 기준, 평가 기준, 부서/메일링, 사업/기술 분류 설정 관리 | `/admin/settings` |
| `UI-LEGAL-08` | 사용자 관리 | 관리자 | 관리자와 사업부 사용자 계정/부서 권한 관리 | `/admin/users` |
| `UI-BUS-01` | 사업부서 대시보드 | 사업부서 | 부서에 배정받은 연차료 검토 특허 리스트와 현황 확인 | `/business/dashboard` |
| `UI-BUS-02` | 사업부서 특허 상세 | 사업부서 | AI 레포트, 특허 요약, 기존 의사결정 기록, 내 사업부 의견 입력 영역 확인 | `/business/patents/:patentId` |
| `UI-BUS-03` | 사업부서 특허 평가 체크리스트 모달창 | 사업부서 | 기술완성도, 기술 독창성, 시장성, 기대효과 점수와 의견 입력 | 상세/요청 목록 내 checklist modal |
| `UI-BUS-04` | 특허별 제출 이력 리스트 페이지 | 사업부서 | 사업 의견을 제출한 특허의 제출 이력 확인 | `/business/submissions` |
| `UI-BUS-05` | 특허별 제출 상세 페이지 | 사업부서 | 특허의 제출 상세 이력과 당시 평가 근거 확인 | `/business/submissions/:patentId` |
| `UI-BUS-06` | 사업부 설정 | 사업부서 | 알림, 의견 템플릿, 담당자 정보 설정 | `/business/settings` |

## Fixed Functional Requirements

### Legal / Admin Requirements

| FR ID | Requirement | Primary UI |
|---|---|---|
| `FR-LEGAL-01` | 검토 대상 특허 목록 및 대시보드 요약 조회 | `UI-LEGAL-01`, `UI-COM-02`, `UI-BUS-01` |
| `FR-LEGAL-02` | 특허 목록 검색·필터링·정렬 | `UI-COM-02`, `UI-LEGAL-01`, `UI-LEGAL-02`, `UI-BUS-01` |
| `FR-LEGAL-03` | 특허 기본 정보 등록 및 외부 정보 기반 입력 추천 | `UI-LEGAL-02`, `UI-LEGAL-03` |
| `FR-LEGAL-04` | 회사 컨텍스트 입력 및 사업/기술 분야 추천 | `UI-LEGAL-03` |
| `FR-LEGAL-05` | 특허 내용 요약 생성 | `UI-LEGAL-04`, `UI-LEGAL-04-1`, `UI-BUS-02`, `UI-BUS-05` |
| `FR-LEGAL-06` | AI 기반 특허 가치 재평가 수행 | `UI-LEGAL-04`, `UI-LEGAL-04-1`, `UI-BUS-02`, `UI-BUS-05` |
| `FR-LEGAL-07` | 평가 근거 요약 제공 | `UI-LEGAL-04`, `UI-LEGAL-04-1`, `UI-BUS-02`, `UI-BUS-05` |
| `FR-LEGAL-08` | 특허별 종합 권고안 생성 | `UI-LEGAL-04`, `UI-LEGAL-04-1`, `UI-BUS-02`, `UI-BUS-05` |
| `FR-LEGAL-09` | AI 초안, 사람 판단, 실제 법무 처리 결과의 분리 조회 및 수정 | `UI-LEGAL-04`, `UI-BUS-02` |
| `FR-LEGAL-10` | 특허별 최종 의사결정 기록 | `UI-LEGAL-01`, `UI-LEGAL-04`, `UI-BUS-05` |
| `FR-LEGAL-11` | 평가 및 판단 이력 조회 | `UI-LEGAL-04`, `UI-BUS-04`, `UI-BUS-05` |
| `FR-LEGAL-12` | 부서별 수신자 및 메일링 매핑 등록·수정 | `UI-LEGAL-05`, `UI-LEGAL-07`, `UI-LEGAL-08` |
| `FR-LEGAL-13` | 메일 발송 전 미리보기 | `UI-LEGAL-05` |
| `FR-LEGAL-14` | 메일 발송 이력 저장 및 조회 | `UI-LEGAL-04`, `UI-LEGAL-05` |
| `FR-LEGAL-16` | 운영 기준 설정 | `UI-LEGAL-07`, `UI-LEGAL-08` |
| `FR-LEGAL-17` | 특허 리스트 일괄 등록/업로드 | `UI-LEGAL-02`, `UI-LEGAL-03` |
| `FR-LEGAL-18` | AI 작업 진행 상태 조회 | `UI-LEGAL-04`, `UI-BUS-02` |
| `FR-LEGAL-19` | 실제 법무 처리 결과 저장 및 추적 | `UI-LEGAL-04` |
| `FR-LEGAL-20` | 최종 판단 수정 및 취소 | `UI-LEGAL-04` |
| `FR-LEGAL-21` | 평가 기준 조회 및 수정 | `UI-LEGAL-07` |
| `FR-LEGAL-22` | 분기 및 날짜 범위 기반 검토 대상 조회 | `UI-LEGAL-01`, `UI-COM-02`, `UI-BUS-01` |
| `FR-LEGAL-23` | 회신 기한 및 분기별 검토 요청 메일 발송 기준 설정 | `UI-LEGAL-05`, `UI-LEGAL-07` |
| `FR-LEGAL-24` | 국가별 특허 조회 및 미래 연차료 납부 예정일 시각화/조정 | `UI-LEGAL-01`, `UI-LEGAL-02`, `UI-LEGAL-07` |
| `FR-LEGAL-25` | 사업 분류 및 기술 분류 기준값 관리 | `UI-LEGAL-03`, `UI-LEGAL-07` |

### Business Requirements

| FR ID | Requirement | Primary UI |
|---|---|---|
| `FR-BUS-01` | 사업부 의견 입력 | `UI-BUS-01`, `UI-BUS-02`, `UI-BUS-03`, `UI-LEGAL-04` |
| `FR-BUS-02` | 내부 문서 업로드 기반 재평가 요청 및 문서 관리 | `UI-BUS-02`, `UI-BUS-03`, `UI-BUS-05` |
| `FR-BUS-03` | AI 평가 결과 피드백 저장 | `UI-BUS-02`, `UI-BUS-05` |
| `FR-BUS-04` | 사업부 평가 체크리스트 조회 | `UI-BUS-03` |
| `FR-BUS-05` | 기존 의사결정 기록과 AI 레포트를 병렬 참고하며 사업부 의견 입력 | `UI-BUS-02`, `UI-BUS-03`, `UI-BUS-05` |

### Common Requirements

| FR ID | Requirement | Primary UI |
|---|---|---|
| `FR-COM-01` | 역할별 메뉴·화면·기능 분리 제공 | `UI-COM-01`, `UI-COM-02` |
| `FR-COM-02` | 알림 목록 조회 및 읽음 상태 변경 | `UI-COM-03`, `UI-LEGAL-01`, `UI-BUS-01` |

## Current Workflow Status Contract

`ReviewWorkflowStatus`는 현재 아래 6개 값만 사용한다.

```ts
[
  "NOT_IN_REVIEW",
  "REVIEW_QUARTER_STARTED",
  "MAIL_READY",
  "WAITING_BUSINESS_RESPONSE",
  "BUSINESS_RESPONSE_RECEIVED",
]
```

`REPORT_GENERATED`는 현재 workflow 상태로 사용하지 않는다. AI 평가 레포트 생성이 완료되면 특허 workflow 상태는 바로 `MAIL_READY`가 된다.
