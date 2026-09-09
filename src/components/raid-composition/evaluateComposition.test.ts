import { describe, expect, it } from 'vitest';
import {
  evaluateRaidComposition,
  recommendRaidComposition,
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
  synergyName = '테스트 시너지',
): RaidCompositionMember => ({
  id,
  className: id,
  role,
  position,
  synergies: synergyStackingGroups.map((stackingGroup) => ({
    name: synergyName,
    stackingGroup,
  })),
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

  it('scores an entropy party plus a hit-master party highest for position-focused', () => {
    const focused = assignment(
      [supporters[0], member('e1', 1, 'dealer', 'entropy-head'), member('e2', 1, 'dealer', 'entropy-back'), member('e3', 1, 'dealer', 'entropy-back')],
      [supporters[1], member('h1', 2), member('h2', 2), member('h3', 2)],
    );

    expect(evaluateRaidComposition(focused, 'position-focused').strategyScore).toBe(6);
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
      '방어력 감소 시너지를 같은 파티에 모아 중첩 효율을 높였습니다.',
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
