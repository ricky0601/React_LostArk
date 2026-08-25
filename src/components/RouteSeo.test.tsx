import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { RouteSeo } from './RouteSeo';

type StructuredData = {
  '@graph': Array<Record<string, unknown>>;
};

const SCRIPT_ID = 'route-structured-data';

const RouteNavigator = () => {
  const navigate = useNavigate();

  return <button onClick={() => navigate('/enhancement')}>강화 계산기로 이동</button>;
};

function readStructuredData(): StructuredData {
  const script = document.getElementById(SCRIPT_ID);
  if (!(script instanceof HTMLScriptElement)) {
    throw new Error('Route structured data script was not found');
  }

  return JSON.parse(script.textContent ?? '') as StructuredData;
}

beforeEach(() => {
  document.getElementById(SCRIPT_ID)?.remove();
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = '{"stale":true}';
  document.head.appendChild(script);
});

afterEach(() => {
  document.getElementById(SCRIPT_ID)?.remove();
});

test('replaces static JSON-LD and updates it after client-side navigation', async () => {
  const initialScript = document.getElementById(SCRIPT_ID);

  render(
    <MemoryRouter initialEntries={['/simulation']}>
      <RouteSeo />
      <RouteNavigator />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(readStructuredData()['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({
        '@type': 'WebSite',
        '@id': 'https://lokki.vercel.app/#website',
        description: '로아끼욧에서 로스트아크 캐릭터 조회, 원정대 주간 골드 계산, 스펙 시뮬레이터, 강화·거래소·지출 관리를 한 번에 확인하세요.',
      }),
      expect.objectContaining({
        '@type': 'WebApplication',
        '@id': 'https://lokki.vercel.app/simulation#webpage',
        url: 'https://lokki.vercel.app/simulation',
        name: '로아 주간 골드 계산기',
      }),
    ]));
  });

  fireEvent.click(screen.getByRole('button', { name: '강화 계산기로 이동' }));

  await waitFor(() => {
    expect(readStructuredData()['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({
        '@type': 'WebSite',
        '@id': 'https://lokki.vercel.app/#website',
        description: '로아끼욧에서 로스트아크 캐릭터 조회, 원정대 주간 골드 계산, 스펙 시뮬레이터, 강화·거래소·지출 관리를 한 번에 확인하세요.',
      }),
      expect.objectContaining({
        '@type': 'WebApplication',
        '@id': 'https://lokki.vercel.app/enhancement#webpage',
        url: 'https://lokki.vercel.app/enhancement',
        name: '로아 강화 계산기',
      }),
      expect.objectContaining({
        '@type': 'BreadcrumbList',
        '@id': 'https://lokki.vercel.app/enhancement#breadcrumb',
      }),
    ]));
  });

  expect(document.querySelectorAll(`#${SCRIPT_ID}`)).toHaveLength(1);
  expect(document.getElementById(SCRIPT_ID)).toBe(initialScript);
});
