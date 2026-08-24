# React LostArk

로스트아크 공개 API와 수기 입력 데이터를 바탕으로 캐릭터 조회, 원정대 확인, 스펙 시뮬레이션, 강화 비용, 시세 랭킹, 소모 내역을 확인하는 React 웹 프로젝트입니다.

- Production: `https://lokki.vercel.app/`
- 주요 데이터 출처: Lost Ark Open API, STOVE 소모 내역 스크립트, 프로젝트 내 정적 기준 데이터

## 주요 기능

- 캐릭터 정보 조회
- 시뮬레이션 페이지
- 스펙 점수 시뮬레이터
- 원정대 단위 확인
- 캐릭터 비교 기능
- 강화 비용 계산
- 시세 랭킹
- 소모(Spending) 내역 확인 보조
- 다크 모드 토글
- PWA 청크 오류 감지 배너

## 기술 스택

- React 19
- TypeScript
- React Router DOM
- Tailwind CSS
- Vite
- Vitest + React Testing Library
- Vercel Functions (`api/lostark/[...].js`)

## 시작하기

### 1) 실행 환경

- Node.js `^20.19.0` 또는 `>=22.12.0` (CI: 22.19.0)
- Yarn 1.22.x

Issue #31에서 패키지 관리자와 Node 버전 고정을 별도로 다루므로, 이 마이그레이션에서는 기존 Yarn 명령과 lockfile 정책을 유지합니다.

### 2) 의존성 설치

```bash
yarn install
```

### 3) 개발 서버 실행

```bash
yarn start
```

브라우저에서 `http://localhost:3000` 접속 (`yarn dev`는 기존 개발 포트인 `3001` 사용)

Lost Ark API 조회가 필요하면 `.env` 또는 로컬 환경변수에 아래 값을 설정합니다.

```bash
LOSTARK_API_KEY=...
```

로컬 개발에서는 `vite.config.mts`의 개발 서버 프록시가 `/api/lostark/*` 요청에 API key를 주입합니다. `LOSTARK_API_KEY`는 서버 전용이며 `VITE_` 접두사를 붙이거나 클라이언트 코드에서 접근하면 안 됩니다.

## 스크립트

```bash
yarn start       # Vite 개발 서버 실행 (3000)
yarn dev         # Vite 개발 서버 실행 (3001)
yarn test        # Vitest 전체 테스트 1회 실행
yarn test:watch  # Vitest watch 모드
yarn typecheck   # TypeScript 검사
yarn build       # sitemap 생성 → typecheck/Vite 빌드 → 정적 SEO 생성
yarn preview     # production build 로컬 미리보기
```

## 프로젝트 구조

```text
src/
├─ components/     # 공통 UI 컴포넌트
├─ context/        # 전역 상태/컨텍스트
├─ data/           # 정적 데이터
├─ pages/          # 라우팅 페이지
├─ types/          # 타입 정의
└─ utils/          # 유틸리티 함수
api/
└─ lostark/[...].js # Vercel Lost Ark API 프록시
docs/
└─ troubleshooting/ # 주요 장애/해결 기록
```

## 라우트

- `/` - 홈
- `/character` - 캐릭터
- `/simulation` - 시뮬레이션
- `/spec-simulator` - 스펙 점수 시뮬레이터
- `/expedition` - 원정대
- `/compare` - 비교
- `/enhancement` - 강화
- `/market` - 시세 랭킹
- `/spending` - 소모

## 배포

이 프로젝트는 Vercel에서 Framework Preset `Other`로 배포합니다.

- 정적 라우트 SEO: `vercel.json`이 알려진 라우트를 빌드된 `<route>/index.html`로 rewrite
- SPA fallback: 나머지 경로는 BrowserRouter 앱이 포함된 `/404.html`로 rewrite
- API proxy: `/api/lostark/:path*`를 `api/lostark/[...].js` Vercel Function으로 rewrite
- Production env: Vercel Project Settings에 서버 전용 `LOSTARK_API_KEY`를 Production 및 필요한 Preview scope로 설정

```bash
yarn build
```

빌드 결과물은 기존 Vercel 설정과 SEO 스크립트 호환을 위해 `build/` 폴더에 생성됩니다. `prebuild`가 sitemap을 만들고 Vite가 public 자산을 복사한 뒤, `postbuild`가 라우트별 HTML과 SPA fallback용 `404.html`을 생성합니다.

## 문서

- `API_KEY_MITIGATION.md` - API key를 서버 전용 Vercel proxy로 옮긴 설계 기록
- `docs/DEV_ENV_REPRO_GUIDE.md` - 개발 환경 재현 가이드
- `docs/lostark-combat-power-research.md` - 현재 전투력 공식과 시뮬레이션 동작의 기준 문서
- `docs/troubleshooting/` - 재발 가능성이 있는 문제와 해결 기록
- `README_write_guide.md` - README 작성/갱신 규칙
- `REAPER_LOPEC_VALIDATION_TEMPLATE.md` - 절대 재구성과 fallback 경로를 검증하는 중립 템플릿
- `docs/GUILD_HOMEPAGE_BLUEPRINT.md` - 별도 길드 홈페이지 아이디어 청사진
