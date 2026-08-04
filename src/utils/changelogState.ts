/** 업데이트 내역 확인 상태 관리.
 *  사용자가 확인한 revision id 목록을 저장하고, 저장되지 않은 항목을 미확인으로 본다.
 *  드롭다운은 표시된 항목만 읽음 처리하고, 전체 페이지는 모든 항목을 읽음 처리한다. */

import { CHANGELOG, type ChangelogEntry } from '../data/changelog';
import { safeLocalStorage } from './safeStorage';

// 기존 키 컨벤션(ThemeContext의 'isDarkMode')에 맞춰 접두사 없는 camelCase를 사용.
const SEEN_IDS_KEY = 'changelogLastSeenId';

const parseSeenIds = (storedValue: string | null): readonly string[] => {
  if (storedValue === null) return [];
  if (!storedValue.startsWith('[')) return [storedValue];

  try {
    const parsed: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [storedValue];

    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch (error) {
    if (error instanceof SyntaxError) return [storedValue];
    throw error;
  }
};

const readSeenIds = (): readonly string[] => parseSeenIds(safeLocalStorage.getItem(SEEN_IDS_KEY));

/** 지정한 항목을 확인한 것으로 표시. 생략하면 전체 내역의 모든 revision id를 저장한다. */
export const markChangelogSeen = (seenIds: readonly string[] = CHANGELOG.map((entry) => entry.id)): void => {
  if (seenIds.length === 0) return;

  const mergedSeenIds = Array.from(new Set([...readSeenIds(), ...seenIds]));
  safeLocalStorage.setItem(SEEN_IDS_KEY, JSON.stringify(mergedSeenIds));
};

/**
 * 아직 확인하지 않은 항목만 골라낸다.
 *
 * @param entries 최신 항목이 먼저 오도록 정렬된 전체 내역
 * @param seenIds 사용자가 확인한 항목 id 목록
 * @returns 미확인 항목 (입력과 같은 내림차순 유지)
 */
export const selectUnseenEntries = (
  entries: readonly ChangelogEntry[],
  seenIds: readonly string[],
): readonly ChangelogEntry[] => entries.filter((entry) => !seenIds.includes(entry.id));

/** 현재 저장 상태를 기준으로 계산한 미확인 항목. NavBar 배지가 이 결과를 사용한다. */
export const readUnseenEntries = (): readonly ChangelogEntry[] =>
  selectUnseenEntries(CHANGELOG, readSeenIds());
