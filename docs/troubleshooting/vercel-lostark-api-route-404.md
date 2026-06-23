# Vercel LostArk API route 404

## 요약

`LOSTARK_API_KEY`를 브라우저 번들에서 제거하고 Vercel Function 프록시로 옮긴 뒤, production에서 Lost Ark 서비스 데이터 조회가 실패한 이슈입니다.

최종 원인은 API key 값이나 Production env scope가 아니라, Vercel `Other` 프로젝트에서 `/api/lostark/*` 요청이 catch-all function으로 라우팅되지 않아 함수 실행 전 단계에서 `404 NOT_FOUND`가 발생한 것이었습니다.

## 증상

- 로컬 `yarn start`에서는 `/api/lostark/...` 데이터 조회가 정상 동작
- production `https://lokki.vercel.app/api/lostark/news/events`는 `404 NOT_FOUND` 반환
- Vercel Runtime Logs에 serverless invocation이 남지 않음
- Vercel deployment metadata에는 `lambdaRuntimeStats: {"nodejs":1}`가 있어 function 자체는 빌드됨
- 루트 페이지 `https://lokki.vercel.app/`는 `200`으로 정상 응답

## 잘못 본 가설

### 1. `LOSTARK_API_KEY` Production env 누락

처음에는 Vercel Production 환경에 `LOSTARK_API_KEY`가 없거나, env 수정 후 재배포가 안 된 문제로 의심했습니다.

근거:
- `api/lostark/[...path].js`가 `process.env.LOSTARK_API_KEY`를 읽음
- key가 없으면 handler가 `500 { "message": "Lost Ark API key is not configured." }`를 반환함

결과:
- 실제 production 응답은 handler의 `500`이 아니라 Vercel platform `404 NOT_FOUND`
- Runtime Logs에도 serverless invocation이 없었음
- 따라서 요청이 함수까지 도달하지 못한 상태로 판단했습니다

### 2. SPA fallback rewrite가 `/api/*`를 가로챔

기존 `vercel.json`은 다음처럼 `/api/`를 제외한 경로만 `/index.html`로 보내도록 되어 있었습니다.

```json
{
  "rewrites": [
    { "source": "/:path((?!api/).*)", "destination": "/index.html" }
  ]
}
```

결과:
- 루트와 SPA route는 정상
- `/api/lostark/news/events`는 HTML fallback이 아니라 `404 NOT_FOUND`
- fallback이 직접 API를 삼킨 문제라기보다, `/api/lostark/*`를 function에 연결하는 명시 route가 없었던 문제였습니다

## 최종 원인

이 프로젝트는 Next.js가 아니라 Create React App을 Vercel `Other` 설정으로 배포합니다.

Next.js `pages/api` semantics에 기대면 안 되고, root `api/`의 Vercel Function route 규칙을 맞춰야 합니다. 기존 파일명은 다음과 같았습니다.

```text
api/lostark/[...path].js
```

하지만 Vercel non-framework splat route 문서와 실제 production 동작 기준으로는 splat function을 다음처럼 두고, rewrite에서 `/api/lostark/:path*`를 명시적으로 연결하는 방식이 안정적입니다.

```text
api/lostark/[...].js
```

증거:
- 배포에는 Node function 1개가 포함됨
- `/api/lostark/news/events`는 function 실행 없이 `404_NOT_FOUND`
- function 파일명과 rewrite를 splat 패턴으로 맞춘 뒤 같은 endpoint가 `200` JSON을 반환

## 최종 해결

Function 파일명을 Vercel splat route에 맞게 변경했습니다.

```text
api/lostark/[...path].js -> api/lostark/[...].js
```

그리고 `vercel.json`에 API rewrite를 SPA fallback보다 먼저 추가했습니다.

```json
{
  "rewrites": [
    { "source": "/api/lostark/:path*", "destination": "/api/lostark/[...]" },
    { "source": "/:path((?!api/).*)", "destination": "/index.html" }
  ]
}
```

관련 커밋:

```text
80c0345 fix(vercel): LostArk API splat 라우팅 명시
```

## 검증

- `npm run build`: 성공
- `npm test -- --watchAll=false`: 9 suites / 68 tests 성공
- Vercel production deployment: `dpl_3JQLSzNkPywXNjApBnrGqWFQMxQ4` READY
- `https://lokki.vercel.app/`: `200`
- `https://lokki.vercel.app/api/lostark/news/events`: `200` JSON
- Vercel Runtime Logs: `/api/lostark/...` serverless invocation `200` 확인

## 재발 방지 가이드

### local success와 production success를 분리해서 판단

로컬 개발은 `src/setupProxy.js`가 동작합니다.

```text
browser -> /api/lostark/... -> CRA setupProxy.js -> Lost Ark API
```

Production은 Vercel Function이 동작합니다.

```text
browser -> /api/lostark/... -> api/lostark/[...].js -> Lost Ark API
```

따라서 로컬에서 API key 조회가 된다고 production function route가 정상이라는 뜻은 아닙니다.

### status code로 문제 층위를 먼저 구분

- `404 NOT_FOUND` + serverless log 없음: Vercel route가 function까지 도달하지 못함
- `500 Lost Ark API key is not configured`: function은 실행됐지만 `LOSTARK_API_KEY` 누락
- `401` 또는 upstream error: function은 실행됐지만 Lost Ark API 인증/요청 문제
- `200`: route, env, upstream 호출 모두 정상

### Vercel 확인 순서

1. `https://lokki.vercel.app/`가 `200`인지 확인
2. `https://lokki.vercel.app/api/lostark/news/events` 직접 호출
3. Vercel Runtime Logs에 serverless invocation이 찍히는지 확인
4. invocation이 없으면 `vercel.json` rewrite와 `api/` 파일명 확인
5. invocation이 있고 `500`이면 `LOSTARK_API_KEY` Production env 확인

## 관련 파일

- `vercel.json`
  - `/api/lostark/:path*` rewrite
  - SPA fallback rewrite
- `api/lostark/[...].js`
  - Vercel splat function
  - `LOSTARK_API_KEY` 주입 proxy
- `src/utils/api.ts`
  - browser에서 `/api/lostark`만 호출
- `src/setupProxy.js`
  - CRA local development 전용 proxy
- `API_KEY_MITIGATION.md`
  - API key server-side migration 설계 기록
