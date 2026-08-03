/** 업데이트 내역 확인 상태 관리.
 *  "사용자가 마지막으로 확인한 항목 id"만 저장하고, 그보다 새로운 항목을 미확인으로 본다.
 *  항목별 확인 여부를 개별 저장하지 않으므로 항목이 늘어도 저장 용량이 일정하다. */

import { CHANGELOG, LATEST_CHANGELOG_ID, type ChangelogEntry } from '../data/changelog';
import { safeLocalStorage } from './safeStorage';

// 기존 키 컨벤션(ThemeContext의 'isDarkMode')에 맞춰 접두사 없는 camelCase를 사용.
const LAST_SEEN_KEY = 'changelogLastSeenId';

/** 저장된 마지막 확인 id. 저장값이 없거나 storage 접근이 막힌 환경에서는 null. */
export const readLastSeenId = (): string | null => safeLocalStorage.getItem(LAST_SEEN_KEY);

/** 전체 내역을 확인한 것으로 표시. 최신 항목 id를 기준값으로 저장한다. */
export const markChangelogSeen = (): void => {
  if (LATEST_CHANGELOG_ID.length === 0) return;
  safeLocalStorage.setItem(LAST_SEEN_KEY, LATEST_CHANGELOG_ID);
};

/**
 * 아직 확인하지 않은 항목만 골라낸다.
 *
 * @param entries    id 내림차순으로 정렬된 전체 내역
 * @param lastSeenId 마지막으로 확인한 항목 id. 저장값이 없으면 null
 * @returns 미확인 항목 (입력과 같은 내림차순 유지)
 */
export const selectUnseenEntries = (
  entries: readonly ChangelogEntry[],
  lastSeenId: string | null,
): readonly ChangelogEntry[] => {
  if (lastSeenId === null) return entries;

  return entries.filter((entry) => entry.id > lastSeenId);
};

/** 현재 저장 상태를 기준으로 계산한 미확인 항목. NavBar 배지가 이 결과를 사용한다. */
export const readUnseenEntries = (): readonly ChangelogEntry[] =>
  selectUnseenEntries(CHANGELOG, readLastSeenId());
