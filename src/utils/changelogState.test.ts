import { CHANGELOG, type ChangelogEntry } from '../data/changelog';
import { markChangelogSeen, readUnseenEntries, selectUnseenEntries } from './changelogState';

const SEEN_IDS_KEY = 'changelogSeenIds';

const readStored = (): unknown => JSON.parse(window.localStorage.getItem(SEEN_IDS_KEY) ?? 'null');

const entries: readonly ChangelogEntry[] = [
  { id: 'revision-a', date: '2026-08-03', title: 'Newest', items: [] },
  { id: 'revision-z', date: '2026-08-03', title: 'Same date update', items: [] },
  { id: 'revision-b', date: '2026-07-31', title: 'Older', items: [] },
];

beforeEach(() => {
  window.localStorage.clear();
});

test('selects entries whose revision ids were not seen', () => {
  expect(selectUnseenEntries(entries, ['revision-z'])).toEqual([entries[0], entries[2]]);
});

test('keeps same-date additions unseen when a different same-date revision was seen', () => {
  expect(selectUnseenEntries(entries, ['revision-a'])).toEqual([entries[1], entries[2]]);
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

test('marks every changelog entry seen when called without arguments', () => {
  markChangelogSeen();

  expect(readStored()).toEqual(CHANGELOG.map((entry) => entry.id));
  expect(readUnseenEntries()).toEqual([]);
});

test('merges newly seen revisions with partially persisted state', () => {
  const existingEntry = CHANGELOG[1];
  const newlySeenEntry = CHANGELOG[0];
  if (!existingEntry || !newlySeenEntry) throw new TypeError('Expected changelog entries');
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([existingEntry.id]));

  markChangelogSeen([newlySeenEntry.id]);

  expect(readUnseenEntries()).toEqual(
    CHANGELOG.filter((entry) => entry.id !== existingEntry.id && entry.id !== newlySeenEntry.id),
  );
});

test('persists seen ids in changelog order regardless of the order they were seen', () => {
  const [newest, second] = CHANGELOG;
  if (!newest || !second) throw new TypeError('Expected changelog entries');

  markChangelogSeen([second.id]);
  markChangelogSeen([newest.id]);

  expect(readStored()).toEqual([newest.id, second.id]);
});

test('ignores an empty seen list instead of clobbering persisted state', () => {
  const seenEntry = CHANGELOG[0];
  if (!seenEntry) throw new TypeError('Expected a changelog entry');
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([seenEntry.id]));

  markChangelogSeen([]);

  expect(readStored()).toEqual([seenEntry.id]);
});

test('drops revision ids that no longer exist in the changelog', () => {
  const seenEntry = CHANGELOG[0];
  if (!seenEntry) throw new TypeError('Expected a changelog entry');
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(['retired-999', seenEntry.id]));

  markChangelogSeen([seenEntry.id]);

  expect(readStored()).toEqual([seenEntry.id]);
});

test('discards malformed storage instead of adopting it as a revision id', () => {
  window.localStorage.setItem(SEEN_IDS_KEY, '["release-004"');

  expect(readUnseenEntries()).toEqual(CHANGELOG);

  markChangelogSeen();

  expect(readStored()).toEqual(CHANGELOG.map((entry) => entry.id));
});

test('discards a non-array stored value', () => {
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify({ id: 'release-004' }));

  expect(readUnseenEntries()).toEqual(CHANGELOG);
});

test('drops non-string members of a stored array', () => {
  const seenEntry = CHANGELOG[0];
  if (!seenEntry) throw new TypeError('Expected a changelog entry');
  window.localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([seenEntry.id, 42, null]));

  expect(readUnseenEntries()).toEqual(CHANGELOG.filter((entry) => entry.id !== seenEntry.id));
});

test('degrades to "everything unseen" when storage writes fail', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError');
  });

  try {
    expect(() => markChangelogSeen()).not.toThrow();
    expect(readUnseenEntries()).toEqual(CHANGELOG);
  } finally {
    setItem.mockRestore();
  }
});
