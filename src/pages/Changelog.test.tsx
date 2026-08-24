import React from 'react';
import { render, screen } from '@testing-library/react';

import { CHANGELOG, CHANGELOG_TAG_LABEL, type ChangelogEntry } from '../data/changelog';

const { changelogState } = vi.hoisted(() => ({
  changelogState: { entries: [] as readonly ChangelogEntry[] },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/changelog' }),
}));

vi.mock('../components/NavBar', () => ({ default: () => <nav /> }));

// CHANGELOG를 테스트별로 갈아끼우기 위해 getter로 노출한다. 빈 상태는 데이터로만 재현할 수 있다.
vi.mock('../data/changelog', async () => {
  const actual = await vi.importActual<typeof import('../data/changelog')>('../data/changelog');
  return {
    ...actual,
    get CHANGELOG() {
      return changelogState.entries;
    },
  };
});

import Changelog from './Changelog';

const { CHANGELOG: realChangelog } = await vi.importActual<typeof import('../data/changelog')>('../data/changelog');

beforeEach(() => {
  changelogState.entries = realChangelog;
});

test('renders every changelog entry with its date and title', () => {
  render(<Changelog />);

  expect(screen.getByRole('heading', { level: 1, name: '업데이트 내역' })).toBeInTheDocument();

  realChangelog.forEach((entry) => {
    expect(screen.getByRole('heading', { level: 2, name: entry.title })).toBeInTheDocument();
  });

  const [newest] = realChangelog;
  if (!newest) throw new TypeError('Expected a changelog entry');
  expect(screen.getByText(newest.date.split('-').join('.'))).toHaveAttribute('datetime', newest.date);
});

test('labels each item with its Korean tag', () => {
  render(<Changelog />);

  const usedTags = new Set(realChangelog.flatMap((entry) => entry.items.map((item) => item.tag)));
  expect(usedTags.size).toBeGreaterThan(0);

  usedTags.forEach((tag) => {
    expect(screen.getAllByText(CHANGELOG_TAG_LABEL[tag]).length).toBeGreaterThan(0);
  });
});

test('renders the empty state when there are no entries', () => {
  changelogState.entries = [];

  render(<Changelog />);

  expect(screen.getByText('아직 등록된 업데이트 내역이 없습니다.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
});

test('keeps the module-level changelog export non-empty so the page is not shipped blank', () => {
  expect(CHANGELOG.length).toBeGreaterThan(0);
});
