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
- Create React App (react-scripts)
- Vercel Functions (`api/lostark/[...].js`)

## 시작하기

### 1) 의존성 설치

```bash
yarn install
```

### 2) 개발 서버 실행

```bash
yarn start
```

브라우저에서 `http://localhost:3000` 접속

Lost Ark API 조회가 필요하면 `.env` 또는 로컬 환경변수에 아래 값을 설정합니다.

```bash
LOSTARK_API_KEY=...
```

로컬 개발에서는 `src/setupProxy.js`가 `/api/lostark/*` 요청에 API key를 주입합니다.

## 스크립트

```bash
yarn start   # 개발 서버 실행
yarn test    # 테스트 실행
yarn build   # 프로덕션 빌드
yarn eject   # CRA 설정 분리(되돌릴 수 없음)
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

- SPA fallback: `vercel.json`에서 `/api/`를 제외한 경로를 `/index.html`로 rewrite
- API proxy: `/api/lostark/:path*`를 `api/lostark/[...].js` Vercel Function으로 rewrite
- Production env: Vercel Project Settings에 `LOSTARK_API_KEY`를 Production scope로 설정

```bash
yarn build
```

빌드 결과물은 `build/` 폴더에 생성됩니다.

## 문서

- `API_KEY_MITIGATION.md` - API key를 서버 전용 Vercel proxy로 옮긴 설계 기록
- `docs/DEV_ENV_REPRO_GUIDE.md` - 개발 환경 재현 가이드
- `docs/troubleshooting/` - 재발 가능성이 있는 문제와 해결 기록
- `README_write_guide.md` - README 작성/갱신 규칙
- `REAPER_LOPEC_VALIDATION_TEMPLATE.md` - Lopec 정합 검증 템플릿
- `docs/GUILD_HOMEPAGE_BLUEPRINT.md` - 별도 길드 홈페이지 아이디어 청사진
