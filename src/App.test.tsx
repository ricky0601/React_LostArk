import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import routeSeoEntries from './constants/routeSeo.json';

let mockPathname = '/';

// BrowserRouter만 MemoryRouter로 바꾼다. Routes/Route/useLocation을 stub하면
// 모든 라우트가 동시에 렌더되어 경로 매칭(오타, 누락)이 검증되지 않는다.
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  const React = require('react');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) =>
      React.createElement(actual.MemoryRouter, { initialEntries: [mockPathname] }, children),
  };
});

jest.mock('./pages/Home', () => () => <div>Home Page</div>);
jest.mock('./pages/Character', () => () => <div>Character Page</div>);
jest.mock('./pages/Simulation', () => () => <div>Simulation Page</div>);
jest.mock('./pages/SpecSimulator', () => () => <div>Spec Simulator Page</div>);
jest.mock('./pages/Expedition', () => () => <div>Expedition Page</div>);
jest.mock('./pages/Compare', () => () => <div>Compare Page</div>);
jest.mock('./pages/Enhancement', () => () => <div>Enhancement Page</div>);
jest.mock('./pages/Market', () => () => <div>Market Page</div>);
jest.mock('./pages/Spending', () => () => <div>Spending Page</div>);
jest.mock('./pages/Changelog', () => () => <div>Changelog Page</div>);
jest.mock('./pages/NotFound', () => () => <div>Not Found Page</div>);

import App from './App';

beforeEach(() => {
  mockPathname = '/';
});

test('renders the home route', () => {
  render(<App />);

  expect(screen.getByText('Home Page')).toBeInTheDocument();
  expect(document.title).toBe('로아끼욧 - 로스트아크 캐릭터 조회·주간 골드 계산기');
});

test('matches the changelog route to the changelog page', () => {
  mockPathname = '/changelog';

  render(<App />);

  expect(screen.getByText('Changelog Page')).toBeInTheDocument();
  expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
});

test('falls back to the not found page for unmatched routes', () => {
  mockPathname = '/missing-route';

  render(<App />);

  expect(screen.getByText('Not Found Page')).toBeInTheDocument();
});

test('updates SEO metadata for the current route', () => {
  mockPathname = '/market';

  render(<App />);

  expect(document.title).toBe('로스트아크 거래소 검색 - 로아끼욧');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
    'content',
    '로스트아크 거래소와 경매장 아이템 정보를 검색해 시세와 구매 판단에 필요한 정보를 확인하세요.',
  );
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://lokki.vercel.app/market',
  );
});

test('marks unknown routes as noindex with the home canonical', () => {
  mockPathname = '/missing-route';

  render(<App />);

  expect(document.title).toBe('페이지를 찾을 수 없습니다 - 로아끼욧');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://lokki.vercel.app/');
});

test('normalizes the changelog trailing slash for metadata and canonical URL', () => {
  mockPathname = '/changelog/';

  render(<App />);

  expect(document.title).toBe('업데이트 내역 - 로아끼욧');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
    'content',
    '로아끼욧에 추가되거나 개선된 기능을 날짜순으로 확인하세요.',
  );
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://lokki.vercel.app/changelog',
  );
});

// trailing slash 정규화는 /changelog 전용이 아니라 모든 라우트에 적용된다.
// 이전에는 /market/ 이 NOT_FOUND_SEO(noindex)로 폴백됐으므로 회귀 지점을 함께 고정한다.
test('normalizes the trailing slash for pre-existing routes as well', () => {
  mockPathname = '/market/';

  render(<App />);

  expect(document.title).toBe('로스트아크 거래소 검색 - 로아끼욧');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://lokki.vercel.app/market',
  );
});

test('lists every indexable route in the sitemap', () => {
  const sitemap = readFileSync(join(process.cwd(), 'public', 'sitemap.xml'), 'utf8');
  const indexableRoutes = routeSeoEntries.filter((entry) => entry.robots === 'index, follow');

  for (const route of indexableRoutes) {
    const routeUrl = `https://lokki.vercel.app${route.path === '/' ? '/' : route.path}`;
    expect(sitemap).toContain(`<loc>${routeUrl}</loc>`);
    expect(sitemap).toContain(`<lastmod>${route.lastmod}</lastmod>`);
  }
});

test('keeps static social and structured metadata available before hydration', () => {
  const indexHtml = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf8');

  expect(indexHtml).toContain('property="og:locale" content="ko_KR"');
  expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"');
  expect(indexHtml).toContain('property="og:image:width" content="1200"');
  expect(indexHtml).toContain('type="application/ld+json"');
  expect(indexHtml).toContain('"@type": "SoftwareApplication"');
});
