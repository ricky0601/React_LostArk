import { useEffect } from 'react';
import type { FC } from 'react';
import { useLocation } from 'react-router-dom';
import routeSeoEntries from '../constants/routeSeo.json';
import { normalizePathname } from '../utils/routes';

type RouteSeoEntry = {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly robots: 'index, follow' | 'noindex, follow';
  readonly name?: string;
  readonly schemaType?: 'WebApplication' | 'WebPage';
  readonly lastmod?: string;
  readonly priority?: string;
};

const SITE_URL = 'https://lokki.vercel.app';

const ROUTE_SEO: readonly RouteSeoEntry[] = routeSeoEntries.map((entry) => ({
  path: entry.path,
  title: entry.title,
  description: entry.description,
  name: 'name' in entry ? entry.name : undefined,
  schemaType: 'schemaType' in entry && entry.schemaType === 'WebApplication' ? 'WebApplication' : 'WebPage',
  robots: entry.robots === 'noindex, follow' ? 'noindex, follow' : 'index, follow',
  lastmod: entry.lastmod,
  priority: entry.priority,
}));

const NOT_FOUND_SEO: RouteSeoEntry = {
  path: '/',
  title: '페이지를 찾을 수 없습니다 - 로아끼욧',
  description: '요청하신 로아끼욧 페이지를 찾을 수 없습니다. 홈에서 로스트아크 캐릭터 조회와 주간 골드 계산 기능을 이용해 주세요.',
  name: '페이지를 찾을 수 없습니다',
  schemaType: 'WebPage',
  robots: 'noindex, follow',
};

function findSeoEntry(pathname: string): RouteSeoEntry {
  const normalizedPathname = normalizePathname(pathname);
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

function buildStructuredData(seo: RouteSeoEntry, canonicalUrl: string): Record<string, unknown> {
  const websiteId = `${SITE_URL}/#website`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: '로아끼욧',
      url: `${SITE_URL}/`,
      inLanguage: 'ko-KR',
      description: '로아끼욧에서 로스트아크 캐릭터 조회, 원정대 주간 골드 계산, 스펙 시뮬레이터, 강화·거래소·지출 관리를 한 번에 확인하세요.',
    },
  ];

  if (seo.robots === 'noindex, follow') {
    return { '@context': 'https://schema.org', '@graph': graph };
  }

  const pageName = seo.name ?? seo.title.replace(/\s[-|]\s로아끼욧$/, '');
  const schemaType = seo.schemaType === 'WebApplication' ? 'WebApplication' : 'WebPage';
  const page: Record<string, unknown> = {
    '@type': schemaType,
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: pageName,
    description: seo.description,
    inLanguage: 'ko-KR',
    isPartOf: { '@id': websiteId },
  };

  if (schemaType === 'WebApplication') {
    page.applicationCategory = 'GameApplication';
    page.operatingSystem = 'Web';
    page.offers = { '@type': 'Offer', price: '0', priceCurrency: 'KRW' };
  }

  graph.push(page);

  if (seo.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: pageName, item: canonicalUrl },
      ],
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

function setStructuredData(data: Record<string, unknown>): void {
  const existingScript = document.getElementById('route-structured-data');
  const script = existingScript instanceof HTMLScriptElement ? existingScript : document.createElement('script');

  script.id = 'route-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data).replaceAll('<', '\\u003c');
  if (!existingScript) document.head.appendChild(script);
}
export const RouteSeo: FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = findSeoEntry(pathname);
    const canonicalUrl = `${SITE_URL}${seo.path === '/' ? '/' : seo.path}`;

    document.title = seo.title;
    setNamedMeta('description', seo.description);
    setNamedMeta('robots', seo.robots);
    setNamedMeta('twitter:title', seo.title);
    setNamedMeta('twitter:description', seo.description);
    setPropertyMeta('og:title', seo.title);
    setPropertyMeta('og:description', seo.description);
    setPropertyMeta('og:url', canonicalUrl);
    setCanonical(canonicalUrl);
    setStructuredData(buildStructuredData(seo, canonicalUrl));
  }, [pathname]);

  return null;
};
