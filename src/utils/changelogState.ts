/** 업데이트 내역 확인 상태 관리.
 *  사용자가 확인한 revision id 목록을 저장하고, 저장되지 않은 항목을 미확인으로 본다.
 *  드롭다운을 열거나 전체 페이지에 진입하면 모든 항목을 읽음 처리한다. */

import { CHANGELOG, type ChangelogEntry } from '../data/changelog';
import { safeLocalStorage } from './safeStorage';

// 기존 키 컨벤션(ThemeContext의 'isDarkMode')에 맞춰 접두사 없는 camelCase를 사용.
const SEEN_IDS_KEY = 'changelogSeenIds';

/** 현재 changelog에 실제로 존재하는 revision id. 저장 대상은 이 집합으로 한정한다. */
const KNOWN_IDS: readonly string[] = CHANGELOG.map((entry) => entry.id);

/** 저장된 값을 revision id 목록으로 해석한다.
 *  이 키는 changelog 기능과 함께 도입되어 이전 포맷이 존재하지 않으므로,
 *  string[] 이외의 값은 마이그레이션 대상이 아니라 손상된 상태로 보고 버린다. */
const parseSeenIds = (storedValue: string | null): readonly string[] => {
  if (storedValue === null) return [];

  try {
    const parsed: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
};

const readSeenIds = (): readonly string[] => parseSeenIds(safeLocalStorage.getItem(SEEN_IDS_KEY));

/** 지정한 항목을 확인한 것으로 표시. 생략하면 전체 내역의 모든 revision id를 저장한다. */
export const markChangelogSeen = (seenIds: readonly string[] = KNOWN_IDS): void => {
  if (seenIds.length === 0) return;

  // 기존 저장값과 병합해 부분 확인(일부 id만 전달)에도 이전 상태가 남게 한다.
  // KNOWN_IDS로 필터링해 (1) 손상되거나 삭제된 id가 눌러앉지 않게 하고
  // (2) 저장 크기를 현재 changelog 길이로 묶으며 (3) 저장 순서를 결정론적으로 만든다.
  const mergedSeenIds = new Set([...readSeenIds(), ...seenIds]);
  const nextSeenIds: readonly string[] = KNOWN_IDS.filter((id) => mergedSeenIds.has(id));

  safeLocalStorage.setItem(SEEN_IDS_KEY, JSON.stringify(nextSeenIds));
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
