# PatentFlow BE 구현 요청 프롬프트

PatentFlow FE 변경사항에 맞춰 BE 상태 계약과 API 동작을 정리해 주세요.

## 핵심 변경

`REPORT_GENERATED` 상태는 더 이상 현재 workflow 상태로 사용하지 않습니다.
AI 평가 레포트 생성이 완료되면 특허 workflow 상태는 `REPORT_GENERATED`를 거치지 않고 바로 `MAIL_READY`가 됩니다.

현재 FE가 사용하는 `ReviewWorkflowStatus` 값은 아래 6개입니다.

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

## 상태 의미

| 상태 | 의미 | 주요 다음 액션 |
|---|---|---|
| `NOT_IN_REVIEW_QUARTER` | 검토 분기 아님 | 대상 제외 |
| `REVIEW_QUARTER_STARTED` | 이번 분기 검토 대상이며 AI 레포트 생성 대기 | AI 레포트 생성 |
| `MAIL_READY` | AI 레포트 생성 완료 및 사업부 검토 요청 메일 발송 대기 | 메일 발송 |
| `WAITING_BUSINESS_RESPONSE` | 사업부 응답 대기 | 사업부 제출 대기/독려 |
| `BUSINESS_RESPONSE_RECEIVED` | 사업부 응답 완료 | 최종 처리 결과 입력 |
| `LEGAL_ACTION_RECORDED` | 법무 처리 결과 기록 완료 | workflow 종료 |

## BE 구현 요청

1. BE enum, DTO, validation, query filter에서 `REPORT_GENERATED`를 현재 값으로 받거나 반환하지 않도록 정리해 주세요.
2. AI 평가 레포트 생성 성공 API는 상태를 `REVIEW_QUARTER_STARTED`에서 `MAIL_READY`로 변경해 주세요.
3. 기존 DB나 테스트 데이터에 `REPORT_GENERATED`가 남아 있다면 `MAIL_READY`로 마이그레이션하거나 조회 응답에서 `MAIL_READY`로 매핑해 주세요.
4. 목록 조회, 상세 조회, 대시보드 KPI, 필터 API 응답에서 `reviewWorkflowStatus`는 위 6개 값 중 하나만 내려 주세요.
5. 메일 발송 대상 조회와 일괄 발송 API는 `MAIL_READY` 상태만 발송 가능 대상으로 처리해 주세요.
6. 메일 발송 성공 후 상태는 `WAITING_BUSINESS_RESPONSE`로 변경해 주세요.
7. 사업부 의견 제출 성공 후 상태는 `BUSINESS_RESPONSE_RECEIVED`로 변경해 주세요.
8. 법무 최종 처리 결과 저장 후 상태는 `LEGAL_ACTION_RECORDED`로 변경해 주세요.

## API 호환성 주의

- FE 필터 옵션은 `ALL` 또는 현재 6개 workflow status만 사용합니다.
- `REPORT_GENERATED`가 응답에 포함되면 FE 라벨/필터/타입 계약과 맞지 않습니다.
- 레포트 생성 완료와 메일 발송 대기는 하나의 상태인 `MAIL_READY`로 표현합니다.
- 화면 표시 라벨은 FE에서 `레포트 생성 완료 · 메일 발송 대기`로 관리합니다.

## 테스트 요청

- AI 레포트 생성 후 상태가 `MAIL_READY`가 되는지 테스트해 주세요.
- `REPORT_GENERATED` legacy 데이터가 조회 응답에서 노출되지 않는지 테스트해 주세요.
- `MAIL_READY`가 아닌 특허는 메일 발송 API에서 제외되거나 명확한 실패 사유가 반환되는지 테스트해 주세요.
- 메일 발송 후 `WAITING_BUSINESS_RESPONSE`, 사업부 제출 후 `BUSINESS_RESPONSE_RECEIVED`, 법무 처리 후 `LEGAL_ACTION_RECORDED` 전이가 정상인지 테스트해 주세요.

## OAuth 메일 설정 참고

FE 설정 화면은 Google OAuth 연동을 기본 방향으로 표시하되, 현재는 BE OAuth 엔드포인트가 준비될 때까지 버튼을 비활성화합니다.
BE에서 OAuth를 제공할 경우 FE가 연결할 수 있도록 시작 URL, callback 처리, 연결 상태 조회 API를 공유해 주세요.
