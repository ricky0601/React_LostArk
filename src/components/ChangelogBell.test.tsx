import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { CHANGELOG } from '../data/changelog';
import ChangelogBell from './ChangelogBell';

const SEEN_IDS_KEY = 'changelogSeenIds';
const PREVIEW_COUNT = 3;

const readStoredIds = (): unknown => JSON.parse(window.localStorage.getItem(SEEN_IDS_KEY) ?? 'null');

/** 실제 react-router-dom을 사용한다. useLocation을 stub하면 "라우트 진입 시 읽음 처리"가
 *  라우팅이 아니라 stub을 검증하게 되어 회귀를 잡지 못한다. */
const renderBell = (initialPath = '/', extra?: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ChangelogBell />
      {extra}
      <Routes>
        <Route path="/" element={<p>홈 화면</p>} />
        <Route path="/changelog" element={<p>업데이트 내역 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );

const allSeenLabel = '업데이트 알림, 새 소식 없음';
const unseenLabel = (count: number) => `업데이트 알림, 새 소식 ${count}건`;

beforeEach(() => {
  window.localStorage.clear();
});

test('counts every unread entry in the accessible name and shows the unread dot', () => {
  const { container } = renderBell();

  expect(screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) })).toBeInTheDocument();
  expect(container.querySelector('span[aria-hidden]')).toBeInTheDocument();
});

test('Tab moves from the toggle button straight into the open panel', async () => {
  renderBell('/', <button type="button">다음 탐색 대상</button>);

  const toggleButton = screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) });
  userEvent.click(toggleButton);

  const panel = await screen.findByRole('region', { name: '최근 업데이트' });
  const firstPanelLink = panel.querySelector('a');

  userEvent.tab();

  expect(document.activeElement).toBe(firstPanelLink);
});

test('opening marks the whole changelog seen so no unread remainder is stranded', async () => {
  const { container } = renderBell();

  userEvent.click(screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) }));

  expect(readStoredIds()).toEqual(CHANGELOG.map((entry) => entry.id));
  expect(screen.getByRole('button', { name: allSeenLabel })).toBeInTheDocument();
  expect(container.querySelector('span[aria-hidden]')).not.toBeInTheDocument();
});

test('keeps NEW markers visible in the panel after the badge clears, then drops them on reopen', async () => {
  renderBell();

  const button = screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) });
  userEvent.click(button);

  expect(await screen.findAllByText('새 소식')).toHaveLength(PREVIEW_COUNT);

  userEvent.click(screen.getByRole('button', { name: allSeenLabel }));
  userEvent.click(screen.getByRole('button', { name: allSeenLabel }));

  expect(screen.queryByText('새 소식')).not.toBeInTheDocument();
});

test('read state survives a remount', async () => {
  const { unmount } = renderBell();
  userEvent.click(screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) }));
  unmount();

  renderBell();

  expect(screen.getByRole('button', { name: allSeenLabel })).toBeInTheDocument();
});

test('Escape closes the panel and returns focus to the toggle button', async () => {
  renderBell();

  const button = screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) });
  userEvent.click(button);
  await screen.findByRole('region', { name: '최근 업데이트' });

  userEvent.keyboard('{Escape}');

  expect(screen.queryByRole('region', { name: '최근 업데이트' })).not.toBeInTheDocument();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: allSeenLabel }));
});

test('an outside click closes the panel without stealing focus from the clicked element', async () => {
  renderBell('/', <button type="button">바깥 버튼</button>);

  userEvent.click(screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) }));
  await screen.findByRole('region', { name: '최근 업데이트' });

  const outsideButton = screen.getByRole('button', { name: '바깥 버튼' });
  userEvent.click(outsideButton);

  expect(screen.queryByRole('region', { name: '최근 업데이트' })).not.toBeInTheDocument();
  expect(document.activeElement).toBe(outsideButton);
});

test('a click inside the panel does not close it', async () => {
  renderBell();

  userEvent.click(screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) }));
  const panel = await screen.findByRole('region', { name: '최근 업데이트' });

  userEvent.click(screen.getByText('최근 업데이트'));

  expect(panel).toBeInTheDocument();
});

test('following a preview link navigates to the changelog and closes the panel', () => {
  renderBell();

  userEvent.click(screen.getByRole('button', { name: unseenLabel(CHANGELOG.length) }));
  const [newest] = CHANGELOG;
  if (!newest) throw new TypeError('Expected a changelog entry');

  userEvent.click(screen.getByRole('link', { name: new RegExp(newest.title) }));

  expect(screen.getByText('업데이트 내역 화면')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '최근 업데이트' })).not.toBeInTheDocument();
  expect(readStoredIds()).toEqual(CHANGELOG.map((entry) => entry.id));
});

test('entering the changelog route marks everything seen', () => {
  renderBell('/changelog');

  expect(readStoredIds()).toEqual(CHANGELOG.map((entry) => entry.id));
  expect(screen.getByRole('button', { name: allSeenLabel })).toBeInTheDocument();
});

test('treats the changelog trailing slash as the changelog route', () => {
  renderBell('/changelog/');

  expect(readStoredIds()).toEqual(CHANGELOG.map((entry) => entry.id));
  expect(screen.getByRole('button', { name: allSeenLabel })).toBeInTheDocument();
});
