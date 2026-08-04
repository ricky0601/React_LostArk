import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
      useLocation: () => ({ pathname: '/' }),
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

test('moves focus into the portal and cycles Tab within the open panel', async () => {
  jest.spyOn(changelogState, 'readUnseenEntries').mockReturnValue([]);
  renderBell();

  await userEvent.click(screen.getByRole('button', { name: '업데이트 알림, 새 소식 없음' }));
  const panel = await screen.findByRole('dialog', { name: '최근 업데이트' });
  const links = within(panel).getAllByRole('link');
  const firstLink = links.at(0);
  const lastLink = links.at(-1);
  if (!(firstLink instanceof HTMLElement) || !(lastLink instanceof HTMLElement)) {
    throw new TypeError('Expected focusable changelog links');
  }

  await waitFor(() => expect(document.activeElement).toBe(firstLink));
  await userEvent.tab({ shift: true });
  expect(document.activeElement).toBe(lastLink);
  await userEvent.tab();
  expect(document.activeElement).toBe(firstLink);
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
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(288);
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(buttonRect);
    renderBell();
    await userEvent.click(screen.getByRole('button', { name: '업데이트 알림, 새 소식 없음' }));
    const panel = await screen.findByRole('dialog', { name: '최근 업데이트' });

    expect(Number.parseFloat(panel.style.right)).toBeLessThanOrEqual(24);
  } finally {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: initialInnerWidth });
  }
});
