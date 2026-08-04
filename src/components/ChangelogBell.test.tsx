import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockPathname = '/';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
        <a href={to} {...rest}>
          {children}
        </a>
      ),
      useLocation: () => ({ pathname: mockPathname }),
    };
  },
  { virtual: true },
);

import { CHANGELOG } from '../data/changelog';
import * as changelogState from '../utils/changelogState';
import ChangelogBell from './ChangelogBell';

const renderBell = () => render(<ChangelogBell />);

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

beforeEach(() => {
  mockPathname = '/';
});

test('exposes a non-modal region without trapping Tab in the open panel', async () => {
  jest.spyOn(changelogState, 'readUnseenEntries').mockReturnValue([]);
  render(
    <>
      <ChangelogBell />
      <button type="button">다음 탐색 대상</button>
    </>,
  );

  const toggleButton = screen.getByRole('button', { name: '업데이트 알림, 새 소식 없음' });
  await userEvent.click(toggleButton);
  await screen.findByRole('region', { name: '최근 업데이트' });

  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '다음 탐색 대상' }));
});

test('restores button focus and clears NEW labels after closing', async () => {
  const latestEntry = CHANGELOG[0];
  if (!latestEntry) throw new TypeError('Expected at least one changelog entry');
  jest.spyOn(changelogState, 'readUnseenEntries').mockReturnValue([latestEntry]);
  renderBell();

  const button = screen.getByRole('button', { name: '업데이트 알림, 새 소식 1건' });
  await userEvent.click(button);
  expect(await screen.findByText('NEW')).toBeInTheDocument();

  await userEvent.keyboard('{Escape}');
  expect(document.activeElement).toBe(button);
  await userEvent.click(button);

  expect(screen.queryByText('NEW')).not.toBeInTheDocument();
});

test('marks only visible unseen preview revisions when opening', async () => {
  jest.spyOn(changelogState, 'readUnseenEntries').mockReturnValue(CHANGELOG);
  const markSeen = jest.spyOn(changelogState, 'markChangelogSeen');
  renderBell();

  await userEvent.click(screen.getByRole('button', { name: `업데이트 알림, 새 소식 ${CHANGELOG.length}건` }));

  expect(markSeen).toHaveBeenCalledWith(CHANGELOG.slice(0, 3).map((entry) => entry.id));
});


test('clamps the portal panel within a narrow viewport', async () => {
  jest.spyOn(changelogState, 'readUnseenEntries').mockReturnValue([]);
  const initialInnerWidth = window.innerWidth;
  const initialClientWidth = document.documentElement.clientWidth;
  const buttonRect: DOMRect = {
    bottom: 40,
    height: 40,
    left: 200,
    right: 240,
    top: 0,
    width: 40,
    x: 200,
    y: 0,
    toJSON: () => ({}),
  };

  try {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 320 });
    const panelRect: DOMRect = {
      bottom: 0,
      height: 100,
      left: 0,
      right: 288,
      top: 0,
      width: 288,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement): DOMRect {
      return this.id === 'navbar-changelog-panel' ? panelRect : buttonRect;
    });
    renderBell();
    await userEvent.click(screen.getByRole('button', { name: '업데이트 알림, 새 소식 없음' }));
    const panel = await screen.findByRole('region', { name: '최근 업데이트' });

    expect(Number.parseFloat(panel.style.right)).toBe(24);
  } finally {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: initialInnerWidth });
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: initialClientWidth });
  }
});

test('treats the changelog trailing slash as the changelog route', () => {
  mockPathname = '/changelog/';
  const latestEntry = CHANGELOG[0];
  if (!latestEntry) throw new TypeError('Expected at least one changelog entry');
  jest.spyOn(changelogState, 'readUnseenEntries').mockReturnValue([latestEntry]);
  const markSeen = jest.spyOn(changelogState, 'markChangelogSeen');

  renderBell();

  expect(markSeen).toHaveBeenCalledWith();
  expect(screen.getByRole('button', { name: '업데이트 알림, 새 소식 없음' })).toBeInTheDocument();
});
