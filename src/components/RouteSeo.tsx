import { useEffect } from 'react';
import type { FC } from 'react';
import { useLocation } from 'react-router-dom';

type RouteSeoEntry = {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly robots: 'index, follow' | 'noindex, follow';
};

const SITE_URL = 'https://lokki.vercel.app';

const ROUTE_SEO: readonly RouteSeoEntry[] = [
  {
    path: '/',
    title: '로아끼욧 - 로스트아크 캐릭터 조회·주간 골드 계산기',
    description:
      '로아끼욧에서 로스트아크 캐릭터 조회, 원정대 주간 골드 계산, 스펙 시뮬레이터, 강화·거래소·지출 관리를 한 번에 확인하세요.',
    robots: 'index, follow',
  },
  {
    path: '/character',
    title: '로스트아크 캐릭터 조회 - 로아끼욧',
    description:
      '로스트아크 캐릭터의 장비, 보석, 카드, 각인, 전투 정보와 성장 상태를 로아끼욧에서 빠르게 조회하세요.',
    robots: 'index, follow',
  },
  {
    path: '/simulation',
    title: '로스트아크 주간 골드 시뮬레이터 - 로아끼욧',
    description:
      '캐릭터별 레이드와 수익을 조합해 로스트아크 원정대 주간 골드 수입을 계산하고 계획하세요.',
    robots: 'index, follow',
  },
  {
    path: '/spec-simulator',
    title: '로스트아크 스펙 시뮬레이터 - 로아끼욧',
    description:
      '장비와 성장 요소를 바탕으로 로스트아크 캐릭터 스펙 점수를 비교하고 개선 방향을 확인하세요.',
    robots: 'index, follow',
  },
  {
    path: '/expedition',
    title: '로스트아크 원정대 관리 - 로아끼욧',
    description:
      '원정대 캐릭터 구성과 주간 콘텐츠 현황을 한눈에 정리해 로스트아크 플레이 계획을 관리하세요.',
    robots: 'index, follow',
  },
  {
    path: '/compare',
    title: '로스트아크 캐릭터 비교 - 로아끼욧',
    description:
      '여러 로스트아크 캐릭터의 장비, 보석, 각인, 전투 특성을 비교해 성장 차이를 확인하세요.',
    robots: 'index, follow',
  },
  {
    path: '/enhancement',
    title: '로스트아크 강화 계산기 - 로아끼욧',
    description:
      '로스트아크 장비 강화 비용과 성장 재료를 계산해 다음 강화 목표를 준비하세요.',
    robots: 'index, follow',
  },
  {
    path: '/market',
    title: '로스트아크 거래소 검색 - 로아끼욧',
    description:
      '로스트아크 거래소와 경매장 아이템 정보를 검색해 시세와 구매 판단에 필요한 정보를 확인하세요.',
    robots: 'index, follow',
  },
  {
    path: '/spending',
    title: '로스트아크 지출 관리 - 로아끼욧',
    description:
      '로스트아크 강화, 거래소, 콘텐츠 준비에 사용한 골드 지출을 기록하고 관리하세요.',
    robots: 'index, follow',
  },
  {
    path: '/changelog',
    title: '업데이트 내역 - 로아끼욧',
    description:
      '로아끼욧에 추가되거나 개선된 기능을 날짜순으로 확인하세요.',
    robots: 'index, follow',
  },
];

const NOT_FOUND_SEO: RouteSeoEntry = {
  path: '/',
  title: '페이지를 찾을 수 없습니다 - 로아끼욧',
  description: '요청하신 로아끼욧 페이지를 찾을 수 없습니다. 홈에서 로스트아크 캐릭터 조회와 주간 골드 계산 기능을 이용해 주세요.',
  robots: 'noindex, follow',
};

function findSeoEntry(pathname: string): RouteSeoEntry {
  const normalizedPathname = pathname === '/' ? pathname : pathname.replace(/\/+$/, '');
  return ROUTE_SEO.find((entry) => entry.path === normalizedPathname) ?? NOT_FOUND_SEO;
}

function setNamedMeta(name: string, content: string): void {
  const selector = `meta[name="${name}"]`;
  const existingMeta = document.head.querySelector(selector);
  const meta = existingMeta instanceof HTMLMetaElement ? existingMeta : document.createElement('meta');

  meta.name = name;
  meta.content = content;
  if (!existingMeta) document.head.appendChild(meta);
}

function setPropertyMeta(property: string, content: string): void {
  const selector = `meta[property="${property}"]`;
  const existingMeta = document.head.querySelector(selector);
  const meta = existingMeta instanceof HTMLMetaElement ? existingMeta : document.createElement('meta');

  meta.setAttribute('property', property);
  meta.content = content;
  if (!existingMeta) document.head.appendChild(meta);
}

function setCanonical(href: string): void {
  const existingLink = document.head.querySelector('link[rel="canonical"]');
  const link = existingLink instanceof HTMLLinkElement ? existingLink : document.createElement('link');

  link.rel = 'canonical';
  link.href = href;
  if (!existingLink) document.head.appendChild(link);
}

export const RouteSeo: FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = findSeoEntry(pathname);
    const canonicalPath = seo.robots === 'noindex, follow' ? pathname : seo.path;
    const canonicalUrl = `${SITE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`;

    document.title = seo.title;
    setNamedMeta('description', seo.description);
    setNamedMeta('robots', seo.robots);
    setNamedMeta('twitter:title', seo.title);
    setNamedMeta('twitter:description', seo.description);
    setPropertyMeta('og:title', seo.title);
    setPropertyMeta('og:description', seo.description);
    setPropertyMeta('og:url', canonicalUrl);
    setCanonical(canonicalUrl);
  }, [pathname]);

  return null;
};
