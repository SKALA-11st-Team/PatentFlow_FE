# PatentFlow Frontend

PatentFlow는 SYUUK 팀의 내부 특허 관리 AI 워크플로우 시스템입니다.  
프론트엔드는 법무/특허 관리팀과 사업부 사용자가 연차료 납부 시점의 회사 보유 특허를 검토하고, AI 특허 평가 레포트를 참고해 사람이 최종 판단을 기록할 수 있도록 돕는 업무형 웹앱입니다.

핵심 원칙은 `AI supports, humans decide`입니다.  
AI 결과는 평가 레포트와 권고안으로 표시하며, 최종 판단과 법적 액션 결과는 사람의 기록 영역으로 분리합니다.

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
- 사업부 설정 확인

## 기술 스택

- React 19
- Vite
- TypeScript
- React Router
- ESLint
- Plain CSS

새 의존성은 최소화하며, 현재 프로젝트는 별도 UI 라이브러리 없이 공통 컴포넌트와 전역 CSS로 화면을 구성합니다.

## 시작하기

```bash
npm install
npm run dev
```

개발 서버 실행 후 Vite가 출력하는 로컬 주소로 접속합니다. 기본 진입 경로는 `/login`입니다.

## 사용 가능한 스크립트

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

- `dev`: Vite 개발 서버 실행
- `build`: TypeScript 빌드 확인 후 프로덕션 번들 생성
- `lint`: ESLint 검사
- `preview`: 빌드 결과 미리보기 서버 실행

## 환경 변수

실제 백엔드 API를 연결할 때는 `.env` 또는 실행 환경에 다음 값을 설정합니다.

```bash
VITE_API_BASE_URL=http://localhost:8080
```

`VITE_API_BASE_URL`이 비어 있으면 프론트엔드는 `src/mocks/`의 데모 데이터를 사용합니다. 이 방식으로 백엔드가 준비되기 전에도 화면과 사용자 흐름을 검증할 수 있습니다.

백엔드 없이 화면만 단독 개발할 때는 다음 값을 사용합니다.

```bash
VITE_USE_MOCK_API=true
```

Docker 이미지로 빌드할 때는 Vite 특성상 `VITE_API_BASE_URL`이 빌드 시점에 고정됩니다. 프로젝트 루트의 `docker-compose.yml`은 기본값으로 `http://localhost:8080`을 build arg로 전달합니다.

프로덕션 이미지는 Nginx로 정적 파일을 서빙하며, `/admin/...`, `/business/...` 같은 React Router 경로 새로고침을 위해 `nginx.conf`의 SPA fallback을 사용합니다.

## 주요 라우트

### 공통

- `/login`: 로그인

### 관리자

- `/admin/dashboard`: 관리자 대시보드
- `/admin/review-targets`: 검토 대상 특허 목록
- `/admin/patents`: 특허 관리
- `/admin/patents/:patentId`: 관리자 특허 상세
- `/admin/patents/:patentId/edit`: 특허 등록/수정
- `/admin/mailing`: 메일링
- `/admin/sales-candidates`: 매각 후보 관리
- `/admin/settings`: 설정

### 사업부

- `/business/dashboard`: 사업부 대시보드
- `/business/review-requests`: 의견 요청 특허
- `/business/patents/:patentId`: 사업부 특허 상세
- `/business/submissions`: 제출 이력
- `/business/submissions/:patentId`: 제출 이력 상세
- `/business/settings`: 사업부 설정

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

## 데이터와 API 연동 방식

API 함수는 `src/api/`에 모여 있으며, 백엔드 URL 설정 여부에 따라 실제 API 또는 mock 데이터를 사용합니다.

- `src/api/client.ts`: 공통 request helper와 API 활성화 확인
- `src/api/patents.ts`: 특허 목록, 상세, 이력, 등록/수정, 일괄 처리
- `src/api/businessSubmissions.ts`: 사업부 제출 이력
- `src/api/businessChecklist.ts`: 사업부 체크리스트
- `src/api/notifications.ts`: 알림 목록과 읽음 상태

백엔드 API 우선순위와 MVP 응답 형태는 `docs/api_priority.md`를 기준으로 맞춥니다.

## 평가 기준

현재 AI 평가 점수 축은 다음 4개만 사용합니다.

- 권리성
- 기술성
- 시장성
- 사업 연계성

`라이프사이클 경제성`은 현재 점수 축에서 제외합니다. 연차료, 예상 소멸일, 보유 상태는 별도 특허 메타데이터와 workflow 정보로 표시합니다.

AI 권고 라벨은 `유지 권고`, `포기 검토`, `추가 정보 필요`처럼 표시하고, workflow 상태는 `사업부 응답 대기`, `처리 완료`처럼 프로세스 상태로 표시합니다.



- `docs/DESIGN_SYSTEM.md`: UI 톤, 토큰, 레이아웃, 컴포넌트 원칙
- `docs/skax_patents_list.md`: 데모 특허 메타데이터 원본
- `docs/patent_evaluation_criteria.md`: 평가 기준과 표시 규칙
- `docs/business_evaluavte_checklist.md`: 사업부 체크리스트 기준
- `docs/api_priority.md`: API 우선순위와 MVP 응답 형태
- `docs/need_api.md`: 추가 API 필요 사항
- `docs/prompt.md`: AI prompt/reference 관련 내용

## 구현 규칙

- 프론트엔드 범위만 수정합니다.
- 백엔드, AI serving, LangChain agent, DB schema, 배포 로직은 구현하지 않습니다.
- 화면, 컴포넌트, API 함수, mock, 주요 유틸에는 FR/UI traceability comment를 유지합니다.
- FR-001부터 FR-022까지의 의미와 번호는 변경하지 않습니다.
- 특허 상세 화면에서는 AI 특허 평가 레포트, 최종 판단, 사업부 의견, 평가 근거, 정보 부족 영역을 명확히 분리합니다.
- 개별 특허 상세 페이지는 메인 내비게이션에 직접 노출하지 않고, 목록이나 대시보드 행에서 진입합니다.

## 검증

변경 후 가능한 범위에서 다음 명령을 실행합니다.

```bash
npm install
npm run lint
npm run build
```

백엔드 없이 화면만 검증할 때는 `.env`에 mock 모드를 켭니다.

```bash
VITE_USE_MOCK_API=true
npm run dev
```

실제 백엔드와 연동할 때는 `.env`에 API 주소를 설정한 뒤 실행합니다.

```bash
VITE_API_BASE_URL=http://localhost:8080
npm run dev
```

Docker/Nginx 배포 형태는 workspace 루트에서 확인합니다.

```bash
docker compose config
docker compose up --build patentflow-fe patentflow-api
```

컨테이너 실행 후 `http://localhost:5173/admin/dashboard` 같은 하위 라우트를 새로고침해 SPA fallback이 정상 동작하는지 확인합니다.

문서만 변경한 경우에는 별도 빌드가 필요하지 않을 수 있지만, 코드 변경이 포함되면 실제 실행 결과를 확인한 뒤 보고합니다.
