import type { ChangelogEntry } from '../data/changelog';
import { selectUnseenEntries } from './changelogState';

const entries: readonly ChangelogEntry[] = [
  { id: 'revision-a', date: '2026-08-03', title: 'Newest', items: [] },
  { id: 'revision-z', date: '2026-08-03', title: 'Same date update', items: [] },
  { id: 'revision-b', date: '2026-07-31', title: 'Older', items: [] },
];

test('selects entries whose revision ids were not seen', () => {
  const unseenEntries = selectUnseenEntries(entries, ['revision-z']);

  expect(unseenEntries).toEqual([entries[0], entries[2]]);
});

test('keeps same-date additions unseen when a different same-date revision was seen', () => {
  const unseenEntries = selectUnseenEntries(entries, ['revision-a']);

  expect(unseenEntries).toEqual([entries[1], entries[2]]);
});
