/** 라우트 경로 상수와 경로 정규화.
 *  SEO 메타 조회와 "현재 이 라우트인가?" 판정이 서로 다른 규칙을 쓰면
 *  한쪽만 바뀌었을 때 조용히 어긋나므로 한 곳에서 정의한다. */

export const ROUTES = {
  changelog: '/changelog',
  policy: '/policy',
} as const;

/** 뒤따르는 슬래시를 제거한 경로. 루트('/', '//')는 항상 '/'로 수렴한다. */
export const normalizePathname = (pathname: string): string =>
  pathname.replace(/\/+$/, '') || '/';
