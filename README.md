# 로바로 웹 (fe)

이 저장소는 전체 `gp` 프로젝트 중 `fe` 폴더를 관리합니다. 저장소를 단독으로 내려받았다면 저장소 루트에서 `npm ci`, `npm run dev`를 실행하세요. Python RAG 백엔드·법령 데이터·Ollama 모델·통합 실행 스크립트는 이 저장소에 포함되어 있지 않습니다. 실제 채팅에는 별도로 실행한 RAG API가 필요하며 `.env.example`의 `RAG_API_URL`로 연결합니다. 아래 `gp` 기준 경로와 명령은 전체 프로젝트를 함께 사용하는 로컬 환경용입니다.

`prototype/`의 HTML 화면을 Next.js(App Router) + TypeScript로 옮긴 프론트엔드입니다. `/chat`은 실제 로컬 RAG API와 연결되어 답변·검색 근거·원문 인용·공식 출처·자료 기준일을 표시합니다. 홈 미리보기와 계약서 업로드 분석은 기존 예시 데이터를 사용합니다.

## RAG와 함께 실행 (Windows)

프로젝트 루트 `gp`에서 아래 명령으로 Ollama, FastAPI, Next.js를 백그라운드에서 시작합니다. 이미 실행 중인 로컬 서비스는 재사용합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_local.ps1
```

- 상담 화면: http://127.0.0.1:3000/chat
- FastAPI 문서: http://127.0.0.1:8000/docs
- 상태 확인: http://127.0.0.1:8000/api/health
- 로그: `gp/.tools/rag/web.log`, `web-error.log`, `api.log`, `api-error.log`

Python 의존성, 코퍼스, 모델은 전체 프로젝트의 `gp/docs/rag-implementation.md`에 따라 먼저 준비해야 합니다. 이 작업 환경에는 이미 준비되어 있습니다. 프런트엔드 의존성이 없으면 `fe`에서 `npm ci`를 실행하세요. 실행 스크립트는 패키지나 모델을 자동 다운로드하지 않습니다.

브라우저 → Next.js `/api/rag/answer` → FastAPI `127.0.0.1:8000` → Ollama `127.0.0.1:11434` 순으로 처리합니다. 별도 클라우드 서버나 8080 포트는 필요 없습니다. 주소를 바꾸려면 `.env.example`을 참고해 `fe/.env.local`의 `RAG_API_URL`을 설정하고 Next.js를 직접 실행하세요. 통합 실행 스크립트는 기본 8000 주소를 사용합니다.

첫 답변은 CPU 모델 로딩으로 오래 걸릴 수 있습니다. 화면에는 대기 상태를 표시하고 중복 전송을 막습니다. API 검증 실패·연결 실패는 오류와 재시도 버튼으로 표시하며 예시 답변으로 대체하지 않습니다. 새 상담·화면 이동 시 브라우저 요청을 취소합니다. 이미 시작된 Python 추론은 끝날 때까지 실행될 수 있으므로 바로 새 요청을 보내면 잠시 후 재시도 안내가 나올 수 있습니다.

질문은 각각 독립적으로 처리합니다. `근무조건을 추가해서 다시 질문하기`는 기존 질문을 입력창에 가져오므로 필요한 정보를 이어 적을 수 있습니다. 이전 대화 전체를 자동 전달하지 않습니다. 이번 상담의 질문 목록은 메모리에만 보관하며 새 상담 또는 새로고침하면 초기화됩니다.

2026-09-27 연결 검증: 타입·린트·프로덕션 빌드 통과. 실제 Chrome에서 웹 → FastAPI → Qwen 응답과 근거 링크를 확인했습니다. CPU에서 휴게시간 질문 1건의 `RAGService.answer` 내부 처리 시간은 115.642초(약 116초)였습니다. 이는 브라우저 전체 대기시간이 아닙니다. 모바일 크기/데스크톱 뷰포트, 초기 질문 중복 전송 방지, 오류·재시도·추가 조건 입력·새 상담 취소를 점검했습니다. 실제 휴대폰 및 법률 답변 정확도의 평가 결과는 아닙니다. 하드웨어·모델·실제 응답·측정 범위는 [실행 기록](../docs/run-logs/2026-09-27-rag-web.md)에 보존했습니다.

## 실행

Node.js 20.9 이상이 필요합니다.

```powershell
cd fe
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

| 명령                   | 설명                           |
| ---------------------- | ------------------------------ |
| `npm run dev`          | 개발 서버                      |
| `npm run build`        | 프로덕션 빌드 (타입 검사 포함) |
| `npm run start`        | 빌드 결과 실행                 |
| `npm run lint`         | ESLint                         |
| `npm run format`       | Prettier로 전체 포맷           |
| `npm run format:check` | 포맷 검사만 수행               |

## 화면

휴대폰(360~599px)을 기본으로 설계한 모바일 우선 반응형입니다. 600px 이상(태블릿)에서 넓어지고, 1024px 이상(데스크톱)에서 왼쪽 사이드바가 나타납니다. 휴대폰에서는 상단 앱바와 하단 탭바로 이동하며, 상담 화면은 메신저처럼 전체 화면을 씁니다.

| 경로                   | 화면                             | prototype 대응 |
| ---------------------- | -------------------------------- | -------------- |
| `/`                    | 서비스 홈                        | `#home`        |
| `/contract`            | 근로계약 점검                    | `#contract`    |
| `/contract?tab=upload` | 근로계약 점검 - 계약서 올리기    | -              |
| `/chat`                | 노동법 상담                      | `#chat`        |
| `/chat?q=질문`         | 홈에서 입력한 질문으로 상담 시작 | -              |
| `/about`               | 서비스 소개·데이터 기준          | `#about`       |

## 구조

```text
src/
├─ app/                    라우트(page.tsx)와 페이지 전용 스타일
│  ├─ layout.tsx           글꼴, 내비게이션, 토스트를 포함한 공통 레이아웃
│  └─ template.tsx         페이지 전환 애니메이션
├─ components/
│  ├─ layout/              상단 앱바·하단 탭바(휴대폰), 사이드바(데스크톱)
│  ├─ common/              아이콘, 토스트, 제목 등 공용 조각
│  ├─ home/                홈 상황 입력창·상황 칩
│  ├─ contract/            근로조건 점검 폼, 계약서 업로드
│  └─ chat/                상담 화면, 메시지, 답변 결과 카드
├─ lib/
│  ├─ contract-check.ts    근로조건 판단 로직 (최저임금·휴게시간 등, 순수 함수)
│  ├─ situations.ts        일상어 상황 칩과 분야별 입력 가이드 (data/FAQ 6개 분야 대응)
│  ├─ chat.ts              상담 메시지·답변 타입
│  └─ site.ts              서비스명, 메뉴, 법령 수집 기준, 상담센터 연락처
└─ mocks/                  API 연결 전 예시 답변·분석 결과
```

- 스타일은 CSS Modules(`*.module.css`)를 사용하고, 색상·간격 토큰은 `src/app/globals.css`에 있습니다.
- 법령 수집일과 법령 목록은 `src/lib/site.ts`, 최저임금은 `src/lib/contract-check.ts`에서 바꿉니다. 코퍼스를 다시 수집하면 함께 갱신하세요.
- 예시 답변의 조문 인용은 `data/raw/statutes/current/`의 수집 원문과 같은 문장입니다.
- `ChatRoom`은 `src/lib/rag-client.ts`로 실제 상담 API를 호출합니다. `RagAnswerCard`가 실제 답변을 표시하며, 기존 `AnswerCard`는 홈의 예시 미리보기에 사용됩니다. `ContractUpload`는 계약서 분석 API 구현 전까지 예시로 유지됩니다.
