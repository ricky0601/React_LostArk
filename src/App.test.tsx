import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';

let mockPathname = '/';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Route: ({ element }: { element: React.ReactElement }) => element,
      useLocation: () => ({ pathname: mockPathname }),
    };
  },
  { virtual: true },
);

jest.mock('./pages/Home', () => () => <div>Home Page</div>);
jest.mock('./pages/Character', () => () => <div>Character Page</div>);
jest.mock('./pages/Simulation', () => () => <div>Simulation Page</div>);
jest.mock('./pages/SpecSimulator', () => () => <div>Spec Simulator Page</div>);
jest.mock('./pages/Expedition', () => () => <div>Expedition Page</div>);
jest.mock('./pages/Compare', () => () => <div>Compare Page</div>);
jest.mock('./pages/Enhancement', () => () => <div>Enhancement Page</div>);
jest.mock('./pages/Market', () => () => <div>Market Page</div>);
jest.mock('./pages/Spending', () => () => <div>Spending Page</div>);
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

test('marks unknown routes as noindex without reusing the home canonical', () => {
  mockPathname = '/missing-route';

  render(<App />);

  expect(document.title).toBe('페이지를 찾을 수 없습니다 - 로아끼욧');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://lokki.vercel.app/missing-route',
  );
});

test('keeps the sitemap scoped to the SPA root document', () => {
  const sitemap = readFileSync(join(process.cwd(), 'public', 'sitemap.xml'), 'utf8');

  expect(sitemap).toContain('<loc>https://lokki.vercel.app/</loc>');
  expect(sitemap).not.toContain('<loc>https://lokki.vercel.app/market</loc>');
  expect(sitemap).not.toContain('<loc>https://lokki.vercel.app/character</loc>');
});
