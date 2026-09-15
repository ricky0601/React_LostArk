import { describe, expect, it } from 'vitest';
import {
  combinationsOfFour,
  compareCompositionEvaluations,
  evaluateRaidComposition,
  recommendRaidComposition,
  type CompositionEvaluation,
  type PartyAssignment,
  type PartyNumber,
  type RaidCompositionMember,
} from './evaluateComposition';
import type { AttackPosition, RaidRole } from '../../data/raidComposition';

const member = (
  id: string,
  currentParty: PartyNumber,
  role: RaidRole = 'dealer',
  position: AttackPosition = 'hit-master',
  synergyStackingGroups: readonly string[] = [`synergy:${id}`],
  fixed = false,
  synergyName = `테스트 시너지:${id}`,
  combatPower: number | null = 100,
): RaidCompositionMember => ({
  id,
  className: id,
  role,
  position,
  synergies: synergyStackingGroups.map((stackingGroup) => ({
    name: synergyName,
    stackingGroup,
  })),
  combatPower,
  currentParty,
  fixed,
});

const supporters = [
  member('support-1', 1, 'support', 'unknown', []),
  member('support-2', 2, 'support', 'unknown', []),
];

const assignment = (
  first: readonly RaidCompositionMember[],
  second: readonly RaidCompositionMember[],
): PartyAssignment => ({ 1: first, 2: second });

describe('evaluateRaidComposition', () => {
  it('warns when a party does not have exactly one supporter', () => {
    const parties = assignment(
      [member('a', 1), member('b', 1), member('c', 1), member('d', 1)],
      [supporters[0], supporters[1], member('e', 2), member('f', 2)],
    );

    const result = evaluateRaidComposition(parties, 'balanced');

    expect(result.isValid).toBe(false);
    expect(result.warnings).toEqual(expect.arrayContaining([
      { type: 'support-count', party: 1, actual: 0, expected: 1 },
      { type: 'support-count', party: 2, actual: 2, expected: 1 },
    ]));
  });

  it('warns for every extra dealer in the same stackingGroup', () => {
    const duplicate = ['critical:wardancer'];
    const parties = assignment(
      [supporters[0], member('a', 1, 'dealer', 'hit-master', duplicate), member('b', 1, 'dealer', 'entropy-back', duplicate), member('c', 1, 'dealer', 'hit-master', duplicate)],
      [supporters[1], member('d', 2), member('e', 2), member('f', 2)],
    );

    const result = evaluateRaidComposition(parties, 'balanced');

    expect(result.duplicateSynergyCount).toBe(2);
    expect(result.warnings).toContainEqual({
      type: 'duplicate-synergy',
      party: 1,
      stackingGroup: 'critical:wardancer',
      memberIds: ['a', 'b', 'c'],
    });
  });

  it('scores same-position groups without treating head and back as one position', () => {
    const focused = assignment(
      [supporters[0], member('e1', 1, 'dealer', 'entropy-head'), member('e2', 1, 'dealer', 'entropy-back'), member('e3', 1, 'dealer', 'entropy-back')],
      [supporters[1], member('h1', 2), member('h2', 2), member('h3', 2)],
    );

    expect(evaluateRaidComposition(focused, 'position-focused').strategyScore).toBe(4);
    expect(evaluateRaidComposition(focused, 'position-focused').headBackConflictCount).toBe(2);
  });

  it('scores two parties with hit-master 2 plus entropy 1 highest for balanced', () => {
    const balanced = assignment(
      [supporters[0], member('e1', 1, 'dealer', 'entropy-head'), member('h1', 1), member('h2', 1)],
      [supporters[1], member('e2', 2, 'dealer', 'entropy-back'), member('h3', 2), member('h4', 2)],
    );

    expect(evaluateRaidComposition(balanced, 'balanced').strategyScore).toBe(6);
  });

  it('does not confirm a recommendation while a dealer position is unresolved', () => {
    const parties = assignment(
      [supporters[0], member('unknown', 1, 'dealer', 'unknown'), member('a', 1), member('b', 1)],
      [supporters[1], member('c', 2), member('d', 2), member('e', 2)],
    );

    const result = evaluateRaidComposition(parties, 'balanced');

    expect(result.isValid).toBe(true);
    expect(result.isConfirmed).toBe(false);
    expect(result.unresolvedMemberIds).toEqual(['unknown']);
  });

  it('does not confirm a recommendation while dealer combat power is unresolved', () => {
    const parties = assignment(
      [supporters[0], member('no-power', 1, 'dealer', 'entropy-head', [], false, '테스트', null), member('a', 1), member('b', 1)],
      [supporters[1], member('c', 2), member('d', 2), member('e', 2)],
    );

    const result = evaluateRaidComposition(parties, 'balanced');

    expect(result.isConfirmed).toBe(false);
    expect(result.unresolvedCombatPowerMemberIds).toEqual(['no-power']);
    expect(result.estimatedRaidPower).toBeNull();
  });

  it('does not confirm a recommendation while supporter combat power is unresolved', () => {
    const parties = assignment(
      [member('support-no-power', 1, 'support', 'unknown', [], false, '테스트', null), member('a', 1), member('b', 1), member('c', 1)],
      [supporters[1], member('d', 2), member('e', 2), member('f', 2)],
    );

    const result = evaluateRaidComposition(parties, 'balanced');

    expect(result.isConfirmed).toBe(false);
    expect(result.unresolvedCombatPowerMemberIds).toEqual(['support-no-power']);
    expect(result.supportDealerPowerScore).toBeNull();
  });

  it('does not confirm a recommendation while a member role is unresolved', () => {
    const parties = assignment(
      [supporters[0], member('unknown-role', 1, 'unknown', 'unknown'), member('a', 1), member('b', 1)],
      [supporters[1], member('c', 2), member('d', 2), member('e', 2)],
    );

    const result = evaluateRaidComposition(parties, 'balanced');

    expect(result.isConfirmed).toBe(false);
    expect(result.unresolvedMemberIds).toEqual(['unknown-role']);
  });
});

describe('recommendRaidComposition', () => {
  const evaluation = (metrics: Partial<CompositionEvaluation>): CompositionEvaluation => ({
    duplicateSynergyCount: 0,
    armorReductionStackingScore: 0,
    strategyScore: 0,
    effectiveSynergyCount: 0,
    supportDealerPowerScore: null,
    movedMemberIds: [],
    parties: { 1: [{ id: 'z' }], 2: [] },
    ...metrics,
  } as CompositionEvaluation);

  it.each([
    {
      priority: 'stackingGroup duplicates over every lower score',
      preferred: { duplicateSynergyCount: 0, armorReductionStackingScore: 0, strategyScore: 0, effectiveSynergyCount: 0, movedMemberIds: ['a'] },
      other: { duplicateSynergyCount: 1, armorReductionStackingScore: 9, strategyScore: 9, effectiveSynergyCount: 9, movedMemberIds: [] },
    },
    {
      priority: 'armor reduction stacking over strategy, synergy, and movement',
      preferred: { armorReductionStackingScore: 2, strategyScore: 0, effectiveSynergyCount: 0, movedMemberIds: ['a'] },
      other: { armorReductionStackingScore: 1, strategyScore: 9, effectiveSynergyCount: 9, movedMemberIds: [] },
    },
    {
      priority: 'strategy score over effective synergy and movement',
      preferred: { strategyScore: 2, effectiveSynergyCount: 0, movedMemberIds: ['a'] },
      other: { strategyScore: 1, effectiveSynergyCount: 9, movedMemberIds: [] },
    },
    {
      priority: 'effective synergy over support and dealer power matching',
      preferred: { effectiveSynergyCount: 2, supportDealerPowerScore: 1, movedMemberIds: ['a'] },
      other: { effectiveSynergyCount: 1, supportDealerPowerScore: 999, movedMemberIds: [] },
    },
    {
      priority: 'support and dealer power matching over movement',
      preferred: { supportDealerPowerScore: 2, movedMemberIds: ['a'] },
      other: { supportDealerPowerScore: 1, movedMemberIds: [] },
    },
  ])('prioritizes $priority', ({ preferred, other }) => {
    expect(compareCompositionEvaluations(evaluation(preferred), evaluation(other))).toBeLessThan(0);
  });

  it('uses movement before the deterministic party-id tie-break', () => {
    const preferred = evaluation({ movedMemberIds: [], parties: { 1: [{ id: 'z' }], 2: [] } as never });
    const other = evaluation({ movedMemberIds: ['a'], parties: { 1: [{ id: 'a' }], 2: [] } as never });

    expect(compareCompositionEvaluations(preferred, other)).toBeLessThan(0);
  });

  it('exhaustively considers all 8 choose 4 first-party assignments', () => {
    const roster = Array.from({ length: 8 }, (_, index) => member(`member-${index}`, index < 4 ? 1 : 2));

    expect(combinationsOfFour(roster)).toHaveLength(70);
  });

  it('keeps the current composition when score ties to minimize movement', () => {
    const roster = [
      ...supporters,
      member('e1', 1, 'dealer', 'entropy-back'),
      member('h1', 1),
      member('h2', 1),
      member('e2', 2, 'dealer', 'entropy-head'),
      member('h3', 2),
      member('h4', 2),
    ];

    const result = recommendRaidComposition(roster, 'balanced', 'test-version');

    expect(result?.strategyScore).toBe(6);
    expect(result?.movedMemberIds).toEqual([]);
    expect(result?.dataVersion).toBe('test-version');
  });

  it('pairs the strongest dealers with the stronger existing supporter before minimizing movement', () => {
    const roster = [
      member('support-strong', 1, 'support', 'unknown', [], false, '테스트', 6000),
      member('support-weak', 2, 'support', 'unknown', [], false, '테스트', 3000),
      member('weak-1', 1, 'dealer', 'hit-master', [], false, '테스트', 100),
      member('weak-2', 1, 'dealer', 'hit-master', [], false, '테스트', 200),
      member('weak-3', 1, 'dealer', 'hit-master', [], false, '테스트', 300),
      member('strong-1', 2, 'dealer', 'hit-master', [], false, '테스트', 700),
      member('strong-2', 2, 'dealer', 'hit-master', [], false, '테스트', 800),
      member('strong-3', 2, 'dealer', 'hit-master', [], false, '테스트', 900),
    ];

    const result = recommendRaidComposition(roster, 'balanced', 'test-version');

    expect(result?.parties[1].filter(({ role }) => role === 'dealer').map(({ id }) => id).sort())
      .toEqual(['strong-1', 'strong-2', 'strong-3']);
    expect(result?.parties[1].map(({ id }) => id)).toContain('support-strong');
    expect(result?.parties[2].map(({ id }) => id)).toContain('support-weak');
    expect(result?.reasons).toContain('서포터 전투력이 높은 파티에 강한 딜러를 우선 배치했습니다.');
  });

  it('separates duplicate stackingGroups before applying the movement tie-break', () => {
    const duplicate = ['damage:berserker'];
    const roster = [
      ...supporters,
      member('duplicate-1', 1, 'dealer', 'hit-master', duplicate),
      member('duplicate-2', 1, 'dealer', 'hit-master', duplicate),
      member('a', 1),
      member('b', 2),
      member('c', 2),
      member('d', 2),
    ];

    const result = recommendRaidComposition(roster, 'position-focused', 'test-version');

    expect(result?.duplicateSynergyCount).toBe(0);
    expect(result?.parties[1].some(({ id }) => id === 'duplicate-1'))
      .not.toBe(result?.parties[1].some(({ id }) => id === 'duplicate-2'));
  });

  it('groups distinct armor reduction synergies before applying the position strategy', () => {
    const roster = [
      ...supporters,
      member('armor-1', 1, 'dealer', 'hit-master', ['armor:one'], false, '방어력 감소'),
      member('armor-2', 1, 'dealer', 'entropy-back', ['armor:two'], false, '방어력 감소'),
      member('dealer-1', 1),
      member('armor-3', 2, 'dealer', 'hit-master', ['armor:three'], false, '방어력 감소'),
      member('dealer-2', 2),
      member('dealer-3', 2),
    ];

    const result = recommendRaidComposition(roster, 'balanced', 'test-version');

    expect(result?.armorReductionStackingScore).toBe(3);
    expect(Object.values(result?.partyEvaluations ?? {})
      .map(({ armorReductionCount }) => armorReductionCount)
      .sort()).toEqual([0, 3]);
    expect(result?.reasons).toContain(
      '방어력 감소 중첩 점수를 3점으로 최대화했습니다.',
    );
  });

  it('never moves a fixed member out of the current party', () => {
    const roster = [
      ...supporters,
      member('fixed', 1, 'dealer', 'entropy-back', ['fixed-synergy'], true),
      member('a', 1),
      member('b', 1),
      member('c', 2, 'dealer', 'entropy-head'),
      member('d', 2),
      member('e', 2),
    ];

    const result = recommendRaidComposition(roster, 'balanced', 'test-version');

    expect(result?.parties[1].map(({ id }) => id)).toContain('fixed');
  });

  it('returns no recommendation when fixed supporters make valid parties impossible', () => {
    const roster = [
      member('support-1', 1, 'support', 'unknown', [], true),
      member('support-2', 1, 'support', 'unknown', [], true),
      member('a', 1),
      member('b', 1),
      member('c', 2),
      member('d', 2),
      member('e', 2),
      member('f', 2),
    ];

    expect(recommendRaidComposition(roster, 'balanced', 'test-version')).toBeNull();
  });
});
