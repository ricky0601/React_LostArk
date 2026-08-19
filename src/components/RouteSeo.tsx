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
  readonly lastmod?: string;
  readonly priority?: string;
};

const SITE_URL = 'https://lokki.vercel.app';

const ROUTE_SEO: readonly RouteSeoEntry[] = routeSeoEntries.map((entry) => ({
  path: entry.path,
  title: entry.title,
  description: entry.description,
  robots: entry.robots === 'noindex, follow' ? 'noindex, follow' : 'index, follow',
  lastmod: entry.lastmod,
  priority: entry.priority,
}));

const NOT_FOUND_SEO: RouteSeoEntry = {
  path: '/',
  title: '페이지를 찾을 수 없습니다 - 로아끼욧',
  description: '요청하신 로아끼욧 페이지를 찾을 수 없습니다. 홈에서 로스트아크 캐릭터 조회와 주간 골드 계산 기능을 이용해 주세요.',
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
