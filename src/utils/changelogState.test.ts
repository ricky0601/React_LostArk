import { CHANGELOG, type ChangelogEntry } from '../data/changelog';
import { markChangelogSeen, readUnseenEntries, selectUnseenEntries } from './changelogState';

const SEEN_IDS_KEY = 'changelogLastSeenId';

const entries: readonly ChangelogEntry[] = [
  { id: 'revision-a', date: '2026-08-03', title: 'Newest', items: [] },
  { id: 'revision-z', date: '2026-08-03', title: 'Same date update', items: [] },
  { id: 'revision-b', date: '2026-07-31', title: 'Older', items: [] },
];

beforeEach(() => {
  window.localStorage.clear();
});

test('selects entries whose revision ids were not seen', () => {
  const unseenEntries = selectUnseenEntries(entries, ['revision-z']);

  expect(unseenEntries).toEqual([entries[0], entries[2]]);
});

test('keeps same-date additions unseen when a different same-date revision was seen', () => {
  const unseenEntries = selectUnseenEntries(entries, ['revision-a']);

  expect(unseenEntries).toEqual([entries[1], entries[2]]);
});

test('returns every changelog entry when local storage is empty', () => {
  expect(readUnseenEntries()).toEqual(CHANGELOG);
});

test('reads seen revision ids from a stored JSON array', () => {
  const seenEntry = CHANGELOG[1];
  if (!seenEntry) throw new TypeError('Expected a second changelog entry');
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([seenEntry.id]));

  expect(readUnseenEntries()).toEqual(CHANGELOG.filter((entry) => entry.id !== seenEntry.id));
});

test('merges newly seen revisions with partially persisted state', () => {
  const existingEntry = CHANGELOG[1];
  const newlySeenEntry = CHANGELOG[0];
  if (!existingEntry || !newlySeenEntry) throw new TypeError('Expected changelog entries');
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([existingEntry.id]));

  markChangelogSeen([newlySeenEntry.id]);

  expect(JSON.parse(window.localStorage.getItem(SEEN_IDS_KEY) ?? '[]')).toEqual([
    existingEntry.id,
    newlySeenEntry.id,
  ]);
});

test('treats malformed JSON-like storage as a legacy revision id', () => {
  const malformedValue = '["release-004"';
  window.localStorage.setItem(SEEN_IDS_KEY, malformedValue);

  expect(readUnseenEntries()).toEqual(CHANGELOG);

  const newlySeenEntry = CHANGELOG[0];
  if (!newlySeenEntry) throw new TypeError('Expected a changelog entry');
  markChangelogSeen([newlySeenEntry.id]);
  expect(JSON.parse(window.localStorage.getItem(SEEN_IDS_KEY) ?? '[]')).toEqual([
    malformedValue,
    newlySeenEntry.id,
  ]);
});

test('migrates a legacy date scalar to revision ids at or before that date', () => {
  window.localStorage.setItem(SEEN_IDS_KEY, '2026-07-31');

  expect(readUnseenEntries()).toEqual(CHANGELOG.filter((entry) => entry.date > '2026-07-31'));
  expect(JSON.parse(window.localStorage.getItem(SEEN_IDS_KEY) ?? '[]')).toEqual(
    CHANGELOG.filter((entry) => entry.date <= '2026-07-31').map((entry) => entry.id),
  );
});

test('keeps an invalid date-shaped scalar as a legacy revision id', () => {
  const legacyId = '2026-99-99';
  window.localStorage.setItem(SEEN_IDS_KEY, legacyId);

  markChangelogSeen(['release-current']);

  expect(JSON.parse(window.localStorage.getItem(SEEN_IDS_KEY) ?? '[]')).toEqual([
    legacyId,
    'release-current',
  ]);
});
