import { KEY_SEP, bonusKey, completedKey, filterPersistedStringArray, migrateLegacyKeys } from './simulationKeys';

describe('simulationKeys', () => {
  describe('bonusKey / completedKey', () => {
    it('bonusKey가 4개 segment를 KEY_SEP으로 결합', () => {
      const key = bonusKey('치코리', '카제로스 (종막)', '하드', 1);
      expect(key.split(KEY_SEP)).toEqual(['치코리', '카제로스 (종막)', '하드', '1']);
    });

    it('completedKey는 3개 segment', () => {
      const key = completedKey('치코리', '카제로스 (종막)', '하드');
      expect(key.split(KEY_SEP)).toEqual(['치코리', '카제로스 (종막)', '하드']);
    });

    it('동일 입력은 항상 동일 키 (안정성)', () => {
      expect(bonusKey('A', 'B', 'C', 1)).toBe(bonusKey('A', 'B', 'C', 1));
      expect(completedKey('A', 'B', 'C')).toBe(completedKey('A', 'B', 'C'));
    });

    it('charName split[0]으로 prefix 추출 가능', () => {
      const key = bonusKey('치코리', '베히모스', '노말', 2);
      expect(key.split(KEY_SEP)[0]).toBe('치코리');
    });
  });

  describe('migrateLegacyKeys', () => {
    it('구버전 :: 키를 신버전 KEY_SEP 키로 변환', () => {
      const legacy = ['치코리::카제로스 (종막)::하드::1', '치코리::베히모스::노말::2'];
      const migrated = migrateLegacyKeys(legacy);
      expect(migrated).toEqual([
        `치코리${KEY_SEP}카제로스 (종막)${KEY_SEP}하드${KEY_SEP}1`,
        `치코리${KEY_SEP}베히모스${KEY_SEP}노말${KEY_SEP}2`,
      ]);
    });

    it('이미 신버전 키는 그대로 통과 (idempotent)', () => {
      const newKey = bonusKey('치코리', '카제로스 (종막)', '하드', 1);
      expect(migrateLegacyKeys([newKey])).toEqual([newKey]);
    });

    it('마이그레이션은 두 번 적용해도 결과 동일', () => {
      const legacy = ['치코리::베히모스::노말::1'];
      const once = migrateLegacyKeys(legacy);
      const twice = migrateLegacyKeys(once);
      expect(twice).toEqual(once);
    });

    it('비배열 입력은 빈 배열 반환', () => {
      expect(migrateLegacyKeys(null)).toEqual([]);
      expect(migrateLegacyKeys(undefined)).toEqual([]);
      expect(migrateLegacyKeys('not an array')).toEqual([]);
      expect(migrateLegacyKeys({})).toEqual([]);
    });

    it('배열 내 비문자열은 필터링', () => {
      const mixed = ['치코리::베히모스::노말::1', 123, null, undefined, ''];
      const migrated = migrateLegacyKeys(mixed);
      expect(migrated).toHaveLength(1);
      expect(migrated[0]).toContain('치코리');
    });

    it('completedKey 포맷(3 segment)도 정상 변환', () => {
      const legacy = ['치코리::베히모스::노말'];
      const migrated = migrateLegacyKeys(legacy);
      expect(migrated).toEqual([
        `치코리${KEY_SEP}베히모스${KEY_SEP}노말`,
      ]);
    });
  });

  describe('filterPersistedStringArray', () => {
    it('문자열 배열의 비어 있지 않은 문자열만 유지', () => {
      expect(filterPersistedStringArray(['A', '', 'B', 0, null, undefined, {}, 'C'])).toEqual(['A', 'B', 'C']);
    });

    it('배열이 아닌 입력은 빈 배열 반환', () => {
      expect(filterPersistedStringArray(null)).toEqual([]);
      expect(filterPersistedStringArray(undefined)).toEqual([]);
      expect(filterPersistedStringArray('not an array')).toEqual([]);
      expect(filterPersistedStringArray({ 0: 'A' })).toEqual([]);
    });
  });
});
