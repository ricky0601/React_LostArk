import { describe, expect, it } from 'vitest';
import type { CompositionRecommendation, RaidCompositionMember } from './evaluateComposition';
import { getRecommendationExchanges } from './RaidCompositionRecommendation';

const member = (id: string, currentParty: 1 | 2): RaidCompositionMember => ({
  id,
  className: id,
  role: 'dealer',
  position: 'hit-master',
  synergies: [],
  combatPower: 100,
  currentParty,
});

const recommendationWith = (
  firstParty: readonly RaidCompositionMember[],
  secondParty: readonly RaidCompositionMember[],
): CompositionRecommendation => ({
  parties: { 1: firstParty, 2: secondParty },
  partyEvaluations: {} as CompositionRecommendation['partyEvaluations'],
  isValid: true,
  isConfirmed: true,
  unresolvedMemberIds: [],
  unresolvedCombatPowerMemberIds: [],
  strategyScore: 0,
  effectiveSynergyCount: 0,
  armorReductionStackingScore: 0,
  repeatedSynergyTypeCount: 0,
  duplicateSynergyCount: 0,
  headBackConflictCount: 0,
  directionalSynergyBenefit: 0,
  estimatedRaidPower: 800,
  partyPowerDifference: 0,
  estimatedSynergyNames: [],
  synergyEffectSourceIds: [],
  movedMemberIds: [...firstParty, ...secondParty]
    .filter((item) => item.currentParty !== (firstParty.includes(item) ? 1 : 2))
    .map(({ id }) => id),
  warnings: [],
  dataVersion: 'test',
  reasons: [],
});

describe('getRecommendationExchanges', () => {
  it('presents opposite party movements as a single exchange', () => {
    const sorceress = member('소서리스', 2);
    const gunslinger = member('건슬링어', 1);
    const recommendation = recommendationWith(
      [sorceress, member('1파티유지1', 1), member('1파티유지2', 1), member('1파티유지3', 1)],
      [gunslinger, member('2파티유지1', 2), member('2파티유지2', 2), member('2파티유지3', 2)],
    );

    expect(getRecommendationExchanges(recommendation)).toEqual([{
      toFirstParty: sorceress,
      toSecondParty: gunslinger,
    }]);
  });

  it('returns no exchange when the recommendation is already applied', () => {
    const recommendation = recommendationWith(
      [member('a', 1), member('b', 1), member('c', 1), member('d', 1)],
      [member('e', 2), member('f', 2), member('g', 2), member('h', 2)],
    );

    expect(getRecommendationExchanges(recommendation)).toEqual([]);
  });
});
