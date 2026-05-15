import {
  RAIDS,
  RAID_COLUMNS,
  calculateCharacterGold,
  getRaidDataByKey,
  MAX_GOLD_RAIDS_PER_CHARACTER,
} from './raidGold';

describe('raidGold data integrity', () => {
  it('베히모스 노말 더보기 비용은 보상 골드보다 작아야 함 (회귀 방지)', () => {
    const behemoth = RAIDS.find((r) => r.name === '베히모스');
    expect(behemoth).toBeDefined();
    const normal = behemoth?.difficulties.find((d) => d.difficulty === '노말');
    expect(normal).toBeDefined();
    for (const gate of normal!.gates) {
      expect(gate.bonusCost).toBeLessThan(gate.gold);
    }
  });

  it('베히모스 데이터 정확한 값 검증', () => {
    const normal = RAIDS.find((r) => r.name === '베히모스')?.difficulties[0];
    expect(normal?.gates).toEqual([
      { gate: 1, gold: 2200, bonusCost: 1480, coreReward: 0 },
      { gate: 2, gold: 5000, bonusCost: 3370, coreReward: 0 },
    ]);
  });

  it('모든 레이드의 더보기 비용은 게이트 골드보다 작거나 같음 (데이터 무결성)', () => {
    for (const raid of RAIDS) {
      for (const diff of raid.difficulties) {
        for (const gate of diff.gates) {
          expect(gate.bonusCost).toBeLessThanOrEqual(gate.gold);
        }
      }
    }
  });

  it('모든 레이드의 totalGold는 게이트 골드 합과 일치', () => {
    for (const raid of RAIDS) {
      for (const diff of raid.difficulties) {
        const sum = diff.gates.reduce((s, g) => s + g.gold, 0);
        expect(diff.totalGold).toBe(sum);
      }
    }
  });

  it('RAID_COLUMNS는 totalGold 내림차순', () => {
    for (let i = 1; i < RAID_COLUMNS.length; i++) {
      expect(RAID_COLUMNS[i - 1].totalGold).toBeGreaterThanOrEqual(RAID_COLUMNS[i].totalGold);
    }
  });
});

describe('calculateCharacterGold', () => {
  it('상위 3개 레이드만 선택', () => {
    const result = calculateCharacterGold('치코리', '버서커', '1750.00', 'img');
    expect(result.selectedRaids.length).toBeLessThanOrEqual(MAX_GOLD_RAIDS_PER_CHARACTER);
  });

  it('1750 캐릭은 카제로스 + 세르카 + 어비스 최고 난이도 골드 합', () => {
    const result = calculateCharacterGold('고렙', '바드', '1750.00', 'img');
    expect(result.itemLevel).toBe(1750);
    expect(result.selectedRaids.every((r) => r.totalGold > 0)).toBe(true);
    // 정렬 검증
    for (let i = 1; i < result.selectedRaids.length; i++) {
      expect(result.selectedRaids[i - 1].totalGold).toBeGreaterThanOrEqual(result.selectedRaids[i].totalGold);
    }
  });

  it('아이템 레벨 1600 이하는 참여 가능한 레이드 없음', () => {
    const result = calculateCharacterGold('저렙', '버서커', '1500.00', 'img');
    expect(result.availableRaids).toEqual([]);
    expect(result.totalGold).toBe(0);
  });

  it('1620은 에키드나 노말까지만 참여 가능', () => {
    const result = calculateCharacterGold('1620', '버서커', '1620.00', 'img');
    expect(result.availableRaids.length).toBeGreaterThan(0);
    expect(result.availableRaids.every((r) => r.requiredLevel !== undefined && r.requiredLevel <= 1620)).toBe(true);
  });

  it('itemLevelStr의 쉼표 제거 후 파싱', () => {
    const result = calculateCharacterGold('치코리', '버서커', '1,750.00', 'img');
    expect(result.itemLevel).toBe(1750);
  });
});

describe('getRaidDataByKey', () => {
  it('존재하는 레이드+난이도는 SelectedRaid 반환', () => {
    const data = getRaidDataByKey('베히모스', '노말');
    expect(data).not.toBeNull();
    expect(data?.raidName).toBe('베히모스');
    expect(data?.totalGold).toBe(7200);
  });

  it('존재하지 않는 키는 null', () => {
    expect(getRaidDataByKey('가짜레이드', '하드')).toBeNull();
    expect(getRaidDataByKey('베히모스', '하드')).toBeNull();
  });

  it('boundGold가 없으면 isBound 따라 계산', () => {
    const data = getRaidDataByKey('지평의 성당 (어비스)', '1750');
    expect(data?.isBound).toBe(true);
    expect(data?.boundGold).toBe(50000);
  });

  it('boundGold가 명시되면 그 값 사용 (절반 귀속)', () => {
    const data = getRaidDataByKey('베히모스', '노말');
    expect(data?.isBound).toBe(false);
    expect(data?.boundGold).toBe(3600);
  });
});
