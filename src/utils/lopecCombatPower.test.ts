import { findBraceletOption } from '../data/specScore/polishOptions';
import { calcCombatPowerBreakdown, COMBAT_POWER_CONSTANT } from './lopecCombatPower';
import { calcLopecDelta } from './lopecSimulator';
import { emptyGems, engravings, equipment } from './lopecSimulator.testUtils';
import type { CharStats } from './lopecSimulator';
import type { AccessoryState, BraceletState } from './polishState';

/** 한건뜬 2026-07-30 실측 기준 */
const 한건뜬: CharStats = {
  W: 218_667,
  baseAttack: 190_000,
  pureBaseAttack: 181_813,
  effectiveWeaponAttack: 232_224.354,
  weaponAttackPercentSum: 6.2,
  baseAttackPercentSum: 10.5,
  avatarMainStatMultiplier: 1.08,
  petMainStatMultiplier: 1.01,
};


/** Parkbitina 2026-07-30 실측 기준 */
const Parkbitina: CharStats = {
  W: 241_367,
  baseAttack: 206_733,
  pureBaseAttack: 206_733,
  effectiveWeaponAttack: 264_890.248,
  weaponAttackPercentSum: 6.4,
  baseAttackPercentSum: 12.5,
  avatarMainStatMultiplier: 1.08,
  petMainStatMultiplier: 1.01,
};

const parkbitinaAccessory = (slot: 'ring1' | 'ring2'): AccessoryState => ({
  slot,
  grade: '고대',
  polishOptions: [
    { type: '무기 공격력_abs', grade: '하', label: '무기 공격력 +195', value: 195, combatPowerIncreasePercent: 0 },
    { type: '없음', grade: '하', label: '없음', value: 0, combatPowerIncreasePercent: 0 },
    { type: '없음', grade: '하', label: '없음', value: 0, combatPowerIncreasePercent: 0 },
  ],
  raw: { Type: '반지', Name: `테스트 ${slot}`, Icon: '', Grade: '고대', Tooltip: '{}' },
});

const bracelet = (labels: readonly string[]): BraceletState => {
  const first = findBraceletOption(labels[0] ?? '없음');
  const second = findBraceletOption(labels[1] ?? '없음');
  const third = findBraceletOption(labels[2] ?? '없음');
  const fourth = findBraceletOption(labels[3] ?? '없음');
  if (!first || !second || !third || !fourth) throw new TypeError('Unknown bracelet test option');

  return {
    tier: '고대',
    effects: [],
    stats: [
      { type: '없음', value: 0 },
      { type: '없음', value: 0 },
      { type: '없음', value: 0 },
      { type: '없음', value: 0 },
    ],
    options: [first, second, third, fourth],
    raw: { Type: '팔찌', Name: '테스트 팔찌', Icon: '', Grade: '고대', Tooltip: '{}' },
  };
};

const baseInput = (charStats: CharStats, currentCombatPower: number) => ({
  currentCombatPower,
  charStats,
  currentEng: engravings([]),
  modifiedEng: engravings([]),
  currentGems: emptyGems,
  modifiedGems: emptyGems,
});

describe('calcCombatPowerBreakdown current snapshot', () => {
  it('exposes the constant, factor product, effective weapon attack and main stat', () => {
    // Given / When
    const result = calcCombatPowerBreakdown(baseInput(한건뜬, 4972.25));

    // Then
    expect(result).not.toBeNull();
    expect(result!.current.combatPowerConstant).toBeCloseTo(181_813 * COMBAT_POWER_CONSTANT, 6);
    expect(result!.current.effectiveWeaponAttack).toBeCloseTo(232_224.354, 3);
    expect(result!.current.mainStat).toBeCloseTo(699_469.5, 1);
    expect(result!.factorProduct).toBeCloseTo(4972.25 / (181_813 * COMBAT_POWER_CONSTANT), 8);
  });

  it('reproduces the current combat power when nothing changes', () => {
    const result = calcCombatPowerBreakdown(baseInput(한건뜬, 4972.25));

    expect(result!.simulatedCombatPower).toBeCloseTo(4972.25, 6);
    expect(result!.directFactorRatio).toBeCloseTo(1, 10);
  });

  it('returns null instead of guessing when base attack is unavailable', () => {
    const result = calcCombatPowerBreakdown(baseInput({ W: 218_667, baseAttack: 190_000 }, 4972.25));

    expect(result).toBeNull();
  });
});


describe('calcCombatPowerBreakdown bracelet weapon attack', () => {
  const accessories = {
    ring1: parkbitinaAccessory('ring1'),
    ring2: parkbitinaAccessory('ring2'),
  };
  const standalone7200 = bracelet(['무기 공격력 +7200']);

  it('keeps unchanged standalone bracelet weapon attack exactly once', () => {
    // Given / When
    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(Parkbitina, 6873.95),
      currentAccessories: accessories,
      modifiedAccessories: accessories,
      currentBracelet: standalone7200,
      modifiedBracelet: standalone7200,
    });

    // Then
    expect(breakdown).not.toBeNull();
    if (breakdown === null) throw new TypeError('Expected a combat-power breakdown');
    expect(breakdown.current.effectiveWeaponAttack).toBeCloseTo(264_890.248, 3);
    expect(breakdown.simulated.effectiveWeaponAttack).toBeCloseTo(264_890.248, 3);
    expect(breakdown.simulatedCombatPower).toBeCloseTo(6873.95, 6);
  });

  it('replaces 7200 with 8100 when the bracelet changes', () => {
    // Given / When
    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(Parkbitina, 6873.95),
      currentAccessories: accessories,
      modifiedAccessories: accessories,
      currentBracelet: standalone7200,
      modifiedBracelet: bracelet(['무기 공격력 +8100']),
    });

    // Then
    expect(breakdown).not.toBeNull();
    if (breakdown === null) throw new TypeError('Expected a combat-power breakdown');
    expect(breakdown.simulated.effectiveWeaponAttack).toBeCloseTo(265_847.848, 3);
    expect(breakdown.directFactorRatio).toBeCloseTo(1, 10);
  });

  it('keeps conditional weapon attack out of effective weapon attack and in the direct ratio', () => {
    // Given / When
    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(Parkbitina, 6873.95),
      currentAccessories: accessories,
      modifiedAccessories: accessories,
      currentBracelet: standalone7200,
      modifiedBracelet: bracelet([
        '무기 공격력 +7200',
        '무공 +7200 | 체력 50% 이상 무공 +2000',
      ]),
    });

    // Then
    expect(breakdown).not.toBeNull();
    if (breakdown === null) throw new TypeError('Expected a combat-power breakdown');
    expect(breakdown.simulated.effectiveWeaponAttack).toBeCloseTo(264_890.248, 3);
    expect(breakdown.directFactorRatio).toBeCloseTo(1.0054, 10);
  });

  it('reproduces Parkbitina Serka gloves 22 -> 23', () => {
    // Given
    const currentCombatPower = 6873.95;
    const displayedBaseAttack = 206_733;
    const baseAttackPercentSum = 12.5;
    const rawMainStatDelta = 3884;
    const effectiveWeaponAttack = 264_890.248;
    const pureBaseAttack = displayedBaseAttack / (1 + baseAttackPercentSum / 100);
    const currentMainStat = (pureBaseAttack * pureBaseAttack * 6) / effectiveWeaponAttack;
    const expectedCombatPower = currentCombatPower * Math.sqrt(
      (currentMainStat + rawMainStatDelta * 1.09) / currentMainStat,
    );
    const currentEquip = {
      gloves: equipment('gloves', { normalLevel: 22, equipmentFamily: 'serka', isInherited: true, tier: '전율' }),
    };
    const modifiedEquip = { gloves: { ...currentEquip.gloves, normalLevel: 23 } };

    // When
    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(Parkbitina, currentCombatPower),
      currentEquip,
      modifiedEquip,
      currentAccessories: accessories,
      modifiedAccessories: accessories,
      currentBracelet: standalone7200,
      modifiedBracelet: standalone7200,
    });

    // Then
    expect(breakdown).not.toBeNull();
    if (breakdown === null) throw new TypeError('Expected a combat-power breakdown');
    expect(breakdown.simulatedCombatPower).toBeCloseTo(expectedCombatPower, 6);
    expect(breakdown.simulatedCombatPower).toBeCloseTo(6892.9469, 3);
  });
});

describe('calcCombatPowerBreakdown vs calcLopecDelta', () => {
  const serkaArmor = (normalLevel: number) =>
    equipment('shoulder', { normalLevel, equipmentFamily: 'serka', isInherited: true, tier: '전율' });

  it('agrees with the ratio model on a Serka armor honing step', () => {
    // Given: 어깨 +17 -> +18
    const currentEquip = { shoulder: serkaArmor(17) };
    const modifiedEquip = { shoulder: { ...serkaArmor(17), normalLevel: 18 } };
    const currentCombatPower = 4972.25;

    // When
    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(한건뜬, currentCombatPower),
      currentEquip,
      modifiedEquip,
    });
    const ratioModel = calcLopecDelta(
      currentCombatPower,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      currentEquip,
      modifiedEquip,
      undefined,
      undefined,
      한건뜬,
    );

    // Then: 두 경로는 대수적으로 같은 식이므로 수치도 같아야 한다
    expect(breakdown!.simulatedCombatPower).toBeCloseTo(ratioModel, 6);
  });

  it('agrees with the ratio model on a Serka weapon honing step', () => {
    const currentEquip = {
      weapon: equipment('weapon', { normalLevel: 21, equipmentFamily: 'serka', isInherited: true, tier: '전율' }),
    };
    const modifiedEquip = { weapon: { ...currentEquip.weapon, normalLevel: 22 } };
    const currentCombatPower = 4972.25;

    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(한건뜬, currentCombatPower),
      currentEquip,
      modifiedEquip,
    });
    const ratioModel = calcLopecDelta(
      currentCombatPower,
      engravings([]),
      engravings([]),
      emptyGems,
      emptyGems,
      currentEquip,
      modifiedEquip,
      undefined,
      undefined,
      한건뜬,
    );

    expect(breakdown!.simulatedCombatPower).toBeCloseTo(ratioModel, 6);
  });

  it('amplifies the armor honing delta by the main stat multiplier', () => {
    const currentEquip = { shoulder: serkaArmor(17) };
    const modifiedEquip = { shoulder: { ...serkaArmor(17), normalLevel: 18 } };

    const breakdown = calcCombatPowerBreakdown({
      ...baseInput(한건뜬, 4972.25),
      currentEquip,
      modifiedEquip,
    });

    // 어깨 18단계 raw 3045, 배율 1.09
    expect(breakdown!.simulated.mainStat - breakdown!.current.mainStat).toBeCloseTo(3045 * 1.09, 6);
  });
});
