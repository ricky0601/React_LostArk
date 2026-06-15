# React LostArk

로스트아크 관련 데이터를 바탕으로 캐릭터/원정대/강화/소모 내역 등을 확인하고 비교할 수 있는 React 웹 프로젝트입니다.

## 주요 기능

- 캐릭터 정보 조회
- 시뮬레이션 페이지
- 원정대 단위 확인
- 캐릭터 비교 기능
- 강화/소모(Spending) 관련 페이지
- 다크 모드 토글
- PWA 청크 오류 감지 배너

## 기술 스택

- React 19
- TypeScript
- React Router DOM
- Tailwind CSS
- Create React App (react-scripts)

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
├─ styles/         # 스타일 리소스
├─ types/          # 타입 정의
└─ utils/          # 유틸리티 함수
```

## 라우트

- `/` - 홈
- `/character` - 캐릭터
- `/simulation` - 시뮬레이션
- `/expedition` - 원정대
- `/compare` - 비교
- `/enhancement` - 강화
- `/market` - 시세 랭킹
- `/spending` - 소모

## 배포

```bash
yarn build
```

빌드 결과물은 `build/` 폴더에 생성됩니다.

---

원하시면 다음 단계로 README에 **스크린샷, 기능 GIF, 배포 URL, 사용 데이터 출처, 기여 가이드(CONTRIBUTING)** 까지 포함해 더 완성도 있게 다듬어드릴게요.
