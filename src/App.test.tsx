import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { CHUNK_ERROR_EVENT, CHUNK_ERROR_KEY } from './context/PwaChunkContext';
import routeSeoEntries from './constants/routeSeo.json';

let mockPathname = '/';

// BrowserRouter만 MemoryRouter로 바꾼다. Routes/Route/useLocation을 stub하면
// 모든 라우트가 동시에 렌더되어 경로 매칭(오타, 누락)이 검증되지 않는다.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) =>
      React.createElement(actual.MemoryRouter, { initialEntries: [mockPathname] }, children),
  };
});

vi.mock('./pages/Home', () => ({ default: () => <div>Home Page</div> }));
vi.mock('./pages/Character', () => ({ default: () => <div>Character Page</div> }));
vi.mock('./pages/Simulation', () => ({ default: () => <div>Simulation Page</div> }));
vi.mock('./pages/SpecSimulator', () => ({ default: () => <div>Spec Simulator Page</div> }));
vi.mock('./pages/Expedition', () => ({ default: () => <div>Expedition Page</div> }));
vi.mock('./pages/Compare', () => ({ default: () => <div>Compare Page</div> }));
vi.mock('./pages/Enhancement', () => ({ default: () => <div>Enhancement Page</div> }));
vi.mock('./pages/Market', () => ({ default: () => <div>Market Page</div> }));
vi.mock('./pages/Spending', () => ({ default: () => <div>Spending Page</div> }));
vi.mock('./pages/Changelog', () => ({ default: () => <div>Changelog Page</div> }));
vi.mock('./pages/Policy', () => ({ default: () => <div>Policy Page</div> }));
vi.mock('./pages/AuthCallback', () => ({ default: () => <div>Auth Callback Page</div> }));
vi.mock('./pages/NotFound', () => ({ default: () => <div>Not Found Page</div> }));

import App from './App';

beforeEach(() => {
  mockPathname = '/';
  window.sessionStorage.removeItem(CHUNK_ERROR_KEY);
});

test('renders the loading state before the home route', async () => {
  render(<App />);

  expect(screen.getByText('페이지 불러오는 중...')).toBeInTheDocument();
  expect(await screen.findByText('Home Page')).toBeInTheDocument();
  expect(document.title).toBe('로아끼욧 - 로스트아크 캐릭터 조회·주간 골드 계산기');
});

test('shows the existing chunk error banner when the chunk error event fires', async () => {
  render(<App />);
  await screen.findByText('Home Page');

  act(() => {
    window.dispatchEvent(new CustomEvent(CHUNK_ERROR_EVENT));
  });

  expect(
    screen.getByText('새 버전이 배포되었습니다. 안정적인 사용을 위해 새로고침해 주세요.'),
  ).toBeInTheDocument();
});

test('matches the changelog route to the changelog page', async () => {
  mockPathname = '/changelog';

  render(<App />);

  expect(await screen.findByText('Changelog Page')).toBeInTheDocument();
  expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
});

test('matches the policy route and renders the common footer', async () => {
  mockPathname = '/policy';

  render(<App />);

  expect(await screen.findByText('Policy Page')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026 로아끼욧. All rights reserved.');
});

test('matches the OAuth callback route', async () => {
  mockPathname = '/auth/callback';

  render(<App />);

  expect(await screen.findByText('Auth Callback Page')).toBeInTheDocument();
  expect(screen.queryByText('Not Found Page')).not.toBeInTheDocument();
  expect(document.title).toBe('Discord 로그인 - 로아끼욧');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
});

test('falls back to the not found page for unmatched routes', async () => {
  mockPathname = '/missing-route';

  render(<App />);

  expect(await screen.findByText('Not Found Page')).toBeInTheDocument();
});

test('updates SEO metadata for the current route', async () => {
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
  expect(await screen.findByText('Market Page')).toBeInTheDocument();
});

test('marks unknown routes as noindex with the home canonical', async () => {
  mockPathname = '/missing-route';

  render(<App />);

  const description = '요청하신 로아끼욧 페이지를 찾을 수 없습니다. 홈에서 로스트아크 캐릭터 조회와 주간 골드 계산 기능을 이용해 주세요.';
  expect(document.title).toBe('페이지를 찾을 수 없습니다 - 로아끼욧');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', description);
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://lokki.vercel.app/');

  const structuredData = JSON.parse(document.getElementById('route-structured-data')?.textContent ?? '{}');
  expect(structuredData['@graph']).toEqual([
    expect.objectContaining({
      '@type': 'WebSite',
      '@id': 'https://lokki.vercel.app/#website',
      url: 'https://lokki.vercel.app/',
    }),
  ]);
  expect(await screen.findByText('Not Found Page')).toBeInTheDocument();
});

test('normalizes the changelog trailing slash for metadata and canonical URL', async () => {
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
  expect(await screen.findByText('Changelog Page')).toBeInTheDocument();
});

// trailing slash 정규화는 /changelog 전용이 아니라 모든 라우트에 적용된다.
// 이전에는 /market/ 이 NOT_FOUND_SEO(noindex)로 폴백됐으므로 회귀 지점을 함께 고정한다.
test('normalizes the trailing slash for pre-existing routes as well', async () => {
  mockPathname = '/market/';

  render(<App />);

  expect(document.title).toBe('로스트아크 거래소 검색 - 로아끼욧');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://lokki.vercel.app/market',
  );
  expect(await screen.findByText('Market Page')).toBeInTheDocument();
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
  const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

  expect(indexHtml).toContain('property="og:locale" content="ko_KR"');
  expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"');
  expect(indexHtml).toContain('property="og:image:width" content="1200"');
  expect(indexHtml).toContain('type="application/ld+json"');
  expect(indexHtml).toContain('"@type": "SoftwareApplication"');
  expect(indexHtml).toContain('"@type": "SearchAction"');
  expect(indexHtml).toContain(
    '"urlTemplate": "https://lokki.vercel.app/character?nickname={search_term_string}"'
  );
  expect(indexHtml).toContain('"query-input": "required name=search_term_string"');
  expect(indexHtml).toContain('name="naver-site-verification"');
  expect(indexHtml).toContain('name="google-site-verification"');
});
