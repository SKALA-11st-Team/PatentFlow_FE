# PatentFlow Frontend

PatentFlow는 SYUUK 팀의 내부 특허 관리 AI 워크플로우 시스템입니다.
프론트엔드는 법무/특허 관리팀과 사업부 사용자가 연차료 납부 시점의 회사 보유 특허를 검토하고, AI 특허 평가 레포트를 참고해 사람이 최종 판단을 기록할 수 있도록 돕는 업무형 웹앱입니다.

핵심 원칙은 `Explain the Value, Guide the Decision`입니다.
AI 결과는 단순 점수가 아니라 특허의 유지·포기 판단에 필요한 가치 설명과 의사결정 가이드로 제공하며, 최종 판단과 법적 액션 결과는 사람의 기록 영역으로 분리합니다.

## 시스템 속 위치

- **FE → BE**: 백엔드(`PatentFlow_BE`)가 권위 API이며, 프론트엔드는 이를 호출합니다.
- 백엔드 URL이 설정되지 않으면 `src/mocks/`의 데모 데이터로 동작하는 **mock fallback**이 내장되어, 백엔드 준비 전에도 화면과 사용자 흐름을 검증할 수 있습니다.

## 빠른 시작

```bash
npm install
npm run dev      # Vite 개발 서버 (기본 진입 경로 /login)
```

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | TypeScript 빌드 확인 후 프로덕션 번들 생성 |
| `npm run lint` | ESLint 검사 |
| `npm run preview` | 빌드 결과 미리보기 |

기술 스택: React 19 · Vite · TypeScript · React Router · Plain CSS. 새 의존성은 최소화하며, 별도 UI 라이브러리 없이 공통 컴포넌트와 전역 CSS로 화면을 구성합니다.

## 주요 기능

### 관리자

- 검토 대상 특허 현황 대시보드
- 전체 특허 목록 조회, 검색, 필터링, 정렬
- 특허 기본 정보 등록/수정
- 특허 상세, AI 평가 레포트, 평가 근거, 최종 판단 확인
- 검토 대상 특허 일괄 유지/포기 처리
- 평가 기준 및 운영 설정 확인

### 사업부 사용자

- 사업부 검토 요청 현황 확인
- 담당 특허 상세 조회
- 특허 요약, 해결 과제, 핵심 기술, 권리 범위 이해
- 사업부 의견 제출
- 제출 이력 및 당시 AI 레포트 확인

## 디렉터리 구조

```text
src/
  api/                 API client와 mock fallback adapter
  components/          공통 UI, 레이아웃, 도메인 컴포넌트
  constants/           상태값, 라벨, badge tone, 표시 순서
  mocks/               발표/개발용 데모 데이터
  pages/               라우트 단위 화면
    admin/             관리자 화면
    business/          사업부 화면
    shared/            역할 공통 상세 화면
  styles/              전역 스타일과 디자인 토큰
  types/               특허, 평가, 알림, 체크리스트 타입
  utils/               연차료 납부일 등 공통 계산 유틸
```

## 데이터·API 연동 / 환경변수

API 함수는 `src/api/`에 모여 있으며, 백엔드 URL 설정 여부에 따라 실제 API 또는 mock 데이터를 사용합니다.

```bash
VITE_API_BASE_URL=http://localhost:8080   # 실제 백엔드 연결
VITE_USE_MOCK_API=true                    # 백엔드 없이 mock 데이터로 화면만 개발
```

`VITE_API_BASE_URL`이 비어 있으면 프론트엔드는 `src/mocks/`의 데모 데이터를 사용합니다.

프로덕션 배포는 Vercel 정적 배포를 기준으로 합니다. `vercel.json`의 rewrite 설정이 `/admin/...`, `/business/...` 같은 React Router 하위 라우트 새로고침을 `index.html`로 연결합니다.
