/** Simulation 페이지 localStorage 키 헬퍼 + 마이그레이션.
 *  이 모듈이 키 포맷의 단일 진실 공급원(SoT). Simulation.tsx와 CharacterRaidCard가 모두 여기서 import. */

// 키 구분자: 닉네임/레이드명에 절대 나타나지 않는 ASCII Unit Separator (U+001F).
// charName으로 split해 prefix를 추출하는 곳이 있어 일반 텍스트와 충돌하지 않는 구분자가 필요.
export const KEY_SEP = '';

// 이전 버전 separator. 현재 주차의 사용자 진행 상황을 보존하기 위해 로드 시 한 번 마이그레이션.
const LEGACY_KEY_SEP = '::';

export const bonusKey = (charName: string, raidName: string, difficulty: string, gate: number): string =>
  `${charName}${KEY_SEP}${raidName}${KEY_SEP}${difficulty}${KEY_SEP}${gate}`;

export const completedKey = (charName: string, raidName: string, difficulty: string): string =>
  `${charName}${KEY_SEP}${raidName}${KEY_SEP}${difficulty}`;

/** localStorage에 저장된 구버전(::) 키를 신버전(KEY_SEP) 키로 변환. 신키 형식은 그대로 통과(idempotent). */
export const migrateLegacyKeys = (keys: unknown): string[] => {
  if (!Array.isArray(keys)) return [];
  return keys
    .map((k) => (typeof k === 'string' ? k.split(LEGACY_KEY_SEP).join(KEY_SEP) : ''))
    .filter((k) => k.length > 0);
};
