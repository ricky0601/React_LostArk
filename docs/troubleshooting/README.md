# Troubleshooting Index

재발 가능성이 있거나 원인 추적 비용이 컸던 문제를 기록합니다.

## 운영/API

- `vercel-lostark-api-route-404.md`
  - Vercel `Other` 배포에서 `/api/lostark/*`가 function으로 라우팅되지 않아 production 데이터 조회가 `404 NOT_FOUND`가 된 문제
  - 핵심 수정: `api/lostark/[...].js` + `/api/lostark/:path*` rewrite

## UI/렌더링

- `enhancement-backdrop-filter-artifact.md`
  - Enhancement 페이지에서 `backdrop-filter`와 밀집된 glass card 조합이 만든 Chrome 계열 compositor artifact
  - 핵심 수정: Enhancement 페이지 scope에서만 glass card blur 비활성화
