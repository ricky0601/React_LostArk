import type { AttackPosition, ClassSynergy, RaidRole } from '../../data/raidComposition';
import { resolveRaidSynergyEffect } from './raidSynergyEffects';

export type PartyNumber = 1 | 2;
export type CompositionStrategy = 'position-focused' | 'balanced';

export interface RaidCompositionMember {
  readonly id: string;
  readonly className: string;
  readonly role: RaidRole;
  readonly position: AttackPosition;
  readonly synergies: readonly ClassSynergy[];
  readonly combatPower: number | null;
  readonly currentParty: PartyNumber;
  readonly fixed?: boolean;
}

export interface PartyAssignment {
  readonly 1: readonly RaidCompositionMember[];
  readonly 2: readonly RaidCompositionMember[];
}

export interface DuplicateSynergyWarning {
  readonly type: 'duplicate-synergy';
  readonly party: PartyNumber;
  readonly stackingGroup: string;
  readonly memberIds: readonly string[];
}

export interface SupportCountWarning {
  readonly type: 'support-count';
  readonly party: PartyNumber;
  readonly actual: number;
  readonly expected: 1;
}

export interface PartySizeWarning {
  readonly type: 'party-size';
  readonly party: PartyNumber;
  readonly actual: number;
  readonly expected: 4;
}

export type CompositionWarning =
  | DuplicateSynergyWarning
  | SupportCountWarning
  | PartySizeWarning;

export interface PositionCounts {
  readonly entropyHead: number;
  readonly entropyBack: number;
  readonly hitMaster: number;
  readonly unknown: number;
}

export interface PartyEvaluation {
  readonly party: PartyNumber;
  readonly supportCount: number;
  readonly positions: PositionCounts;
  readonly effectiveSynergyCount: number;
  readonly armorReductionCount: number;
  readonly repeatedSynergyTypeCount: number;
  readonly duplicateSynergyCount: number;
  readonly headBackConflictCount: number;
  readonly dealerCombatPower: number | null;
  readonly directionalSynergyBenefit: number | null;
  readonly estimatedSynergyBenefit: number | null;
  readonly effectivePartyPower: number | null;
  readonly estimatedSynergyNames: readonly string[];
  readonly synergyEffectSourceIds: readonly string[];
  readonly warnings: readonly CompositionWarning[];
}

export interface CompositionEvaluation {
  readonly parties: PartyAssignment;
  readonly partyEvaluations: Readonly<Record<PartyNumber, PartyEvaluation>>;
  readonly isValid: boolean;
  readonly isConfirmed: boolean;
  readonly unresolvedMemberIds: readonly string[];
  readonly unresolvedCombatPowerMemberIds: readonly string[];
  readonly strategyScore: number;
  readonly effectiveSynergyCount: number;
  readonly armorReductionStackingScore: number;
  readonly repeatedSynergyTypeCount: number;
  readonly duplicateSynergyCount: number;
  readonly headBackConflictCount: number;
  readonly directionalSynergyBenefit: number | null;
  readonly estimatedRaidPower: number | null;
  readonly partyPowerDifference: number | null;
  readonly supportDealerPowerScore: number | null;
  readonly estimatedSynergyNames: readonly string[];
  readonly synergyEffectSourceIds: readonly string[];
  readonly movedMemberIds: readonly string[];
  readonly warnings: readonly CompositionWarning[];
}

export interface CompositionRecommendation extends CompositionEvaluation {
  readonly dataVersion: string;
  readonly reasons: readonly string[];
}

const countPositions = (members: readonly RaidCompositionMember[]): PositionCounts => (
  members.reduce<PositionCounts>((counts, member) => {
    if (member.role !== 'dealer') return counts;
    if (member.position === 'entropy-head') {
      return { ...counts, entropyHead: counts.entropyHead + 1 };
    }
    if (member.position === 'entropy-back') {
      return { ...counts, entropyBack: counts.entropyBack + 1 };
    }
    if (member.position === 'hit-master') {
      return { ...counts, hitMaster: counts.hitMaster + 1 };
    }
    return { ...counts, unknown: counts.unknown + 1 };
  }, { entropyHead: 0, entropyBack: 0, hitMaster: 0, unknown: 0 })
);

const isDirectionalDealer = (member: RaidCompositionMember): boolean => (
  member.position === 'entropy-head' || member.position === 'entropy-back'
);

const estimatePartyPower = (
  dealers: readonly RaidCompositionMember[],
  synergies: ReadonlyMap<string, ClassSynergy>,
): Pick<PartyEvaluation,
  'dealerCombatPower' | 'directionalSynergyBenefit' | 'estimatedSynergyBenefit' | 'effectivePartyPower'
> => {
  if (dealers.some(({ combatPower }) => combatPower == null || combatPower <= 0)) {
    return {
      dealerCombatPower: null,
      directionalSynergyBenefit: null,
      estimatedSynergyBenefit: null,
      effectivePartyPower: null,
    };
  }
  const dealerCombatPower = dealers.reduce((total, member) => total + (member.combatPower ?? 0), 0);
  let directionalSynergyBenefit = 0;
  let effectivePartyPower = 0;
  dealers.forEach((dealer) => {
    const categoryRates = new Map<string, number>();
    synergies.forEach((synergy, stackingGroup) => {
      const effect = resolveRaidSynergyEffect(synergy.name);
      if (!effect) return;
      const directionalRate = isDirectionalDealer(dealer) ? effect.directionalRate : 0;
      directionalSynergyBenefit += (dealer.combatPower ?? 0) * directionalRate;
      // 서로 다른 방어력 감소는 곱연산되도록 각 stackingGroup을 별도 범주로 둔다.
      const category = effect.category === 'armor-reduction'
        ? `${effect.category}:${stackingGroup}`
        : effect.category;
      categoryRates.set(
        category,
        (categoryRates.get(category) ?? 0) + effect.generalRate + directionalRate,
      );
    });
    const multiplier = Array.from(categoryRates.values()).reduce(
      (combined, rate) => combined * (1 + rate),
      1,
    );
    effectivePartyPower += (dealer.combatPower ?? 0) * multiplier;
  });
  return {
    dealerCombatPower,
    directionalSynergyBenefit,
    estimatedSynergyBenefit: effectivePartyPower - dealerCombatPower,
    effectivePartyPower,
  };
};

const evaluateParty = (
  party: PartyNumber,
  members: readonly RaidCompositionMember[],
): PartyEvaluation => {
  const warnings: CompositionWarning[] = [];
  const supportCount = members.filter((member) => member.role === 'support').length;
  if (members.length !== 4) {
    warnings.push({ type: 'party-size', party, actual: members.length, expected: 4 });
  }
  if (supportCount !== 1) {
    warnings.push({ type: 'support-count', party, actual: supportCount, expected: 1 });
  }

  const dealers = members.filter((member) => member.role === 'dealer');
  const synergyMembers = new Map<string, string[]>();
  const effectiveSynergies = new Map<string, ClassSynergy>();
  const synergyTypeMembers = new Map<string, Set<string>>();
  const armorReductionGroups = new Set<string>();
  dealers.forEach((member) => {
    const memberSynergies = new Map(
      member.synergies.map((synergy) => [synergy.stackingGroup, synergy]),
    );
    memberSynergies.forEach((synergy, stackingGroup) => {
      const memberIds = synergyMembers.get(stackingGroup) ?? [];
      memberIds.push(member.id);
      synergyMembers.set(stackingGroup, memberIds);
      if (!effectiveSynergies.has(stackingGroup)) effectiveSynergies.set(stackingGroup, synergy);
      if (synergy.name === '방어력 감소') {
        armorReductionGroups.add(stackingGroup);
      } else {
        const typeMemberIds = synergyTypeMembers.get(synergy.name) ?? new Set<string>();
        typeMemberIds.add(member.id);
        synergyTypeMembers.set(synergy.name, typeMemberIds);
      }
    });
  });

  const duplicateWarnings: DuplicateSynergyWarning[] = [];
  synergyMembers.forEach((memberIds, stackingGroup) => {
    if (memberIds.length > 1) {
      duplicateWarnings.push({
        type: 'duplicate-synergy',
        party,
        stackingGroup,
        memberIds: [...memberIds].sort(),
      });
    }
  });
  duplicateWarnings.sort((left, right) => left.stackingGroup.localeCompare(right.stackingGroup));
  warnings.push(...duplicateWarnings);
  const positions = countPositions(members);
  const power = estimatePartyPower(dealers, effectiveSynergies);

  return {
    party,
    supportCount,
    positions,
    effectiveSynergyCount: synergyMembers.size,
    armorReductionCount: armorReductionGroups.size,
    repeatedSynergyTypeCount: Array.from(synergyTypeMembers.values()).reduce(
      (total, memberIds) => total + Math.max(0, memberIds.size - 1),
      0,
    ),
    duplicateSynergyCount: duplicateWarnings.reduce(
      (total, warning) => total + warning.memberIds.length - 1,
      0,
    ),
    headBackConflictCount: positions.entropyHead * positions.entropyBack,
    ...power,
    estimatedSynergyNames: Array.from(new Set(Array.from(effectiveSynergies.values())
      .filter((synergy) => resolveRaidSynergyEffect(synergy.name)?.estimated)
      .map((synergy) => synergy.name))).sort(),
    synergyEffectSourceIds: Array.from(new Set(Array.from(effectiveSynergies.values())
      .flatMap((synergy) => {
        const effect = resolveRaidSynergyEffect(synergy.name);
        return effect ? [effect.sourceId] : [];
      }))).sort(),
    warnings,
  };
};

const pairCount = (count: number): number => count * (count - 1) / 2;

const positionStrategyScore = (
  partyEvaluations: Readonly<Record<PartyNumber, PartyEvaluation>>,
  strategy: CompositionStrategy,
): number => {
  const first = partyEvaluations[1].positions;
  const second = partyEvaluations[2].positions;
  const firstEntropy = first.entropyHead + first.entropyBack;
  const secondEntropy = second.entropyHead + second.entropyBack;

  if (strategy === 'position-focused') {
    return [first, second].reduce((score, positions) => (
      score
      + pairCount(positions.entropyHead)
      + pairCount(positions.entropyBack)
      + pairCount(positions.hitMaster)
    ), 0);
  }

  return [first, second].reduce((score, positions) => {
    const entropy = positions.entropyHead + positions.entropyBack;
    const distanceFromTarget = Math.abs(positions.hitMaster - 2) + Math.abs(entropy - 1);
    return score + Math.max(0, 3 - distanceFromTarget);
  }, 0);
};

export const evaluateRaidComposition = (
  parties: PartyAssignment,
  strategy: CompositionStrategy,
): CompositionEvaluation => {
  const partyEvaluations: Readonly<Record<PartyNumber, PartyEvaluation>> = {
    1: evaluateParty(1, parties[1]),
    2: evaluateParty(2, parties[2]),
  };
  const members = [...parties[1], ...parties[2]];
  const unresolvedRoleOrPositionIds = members
    .filter((member) => (
      member.role === 'unknown'
      || (member.role === 'dealer' && member.position === 'unknown')
    ))
    .map((member) => member.id);
  const unresolvedCombatPowerMemberIds = members
    .filter((member) => (
      (member.role === 'dealer' || member.role === 'support')
      && (member.combatPower == null || member.combatPower <= 0)
    ))
    .map((member) => member.id)
    .sort();
  const unresolvedMemberIds = Array.from(new Set([
    ...unresolvedRoleOrPositionIds,
    ...unresolvedCombatPowerMemberIds,
  ])).sort();
  const warnings = [...partyEvaluations[1].warnings, ...partyEvaluations[2].warnings];
  const isValid = !warnings.some((warning) => (
    warning.type === 'party-size' || warning.type === 'support-count'
  ));

  return {
    parties,
    partyEvaluations,
    isValid,
    isConfirmed: isValid && unresolvedMemberIds.length === 0,
    unresolvedMemberIds,
    unresolvedCombatPowerMemberIds,
    strategyScore: positionStrategyScore(partyEvaluations, strategy),
    effectiveSynergyCount: partyEvaluations[1].effectiveSynergyCount
      + partyEvaluations[2].effectiveSynergyCount,
    armorReductionStackingScore: pairCount(
      partyEvaluations[1].armorReductionCount,
    ) + pairCount(partyEvaluations[2].armorReductionCount),
    repeatedSynergyTypeCount: partyEvaluations[1].repeatedSynergyTypeCount
      + partyEvaluations[2].repeatedSynergyTypeCount,
    duplicateSynergyCount: partyEvaluations[1].duplicateSynergyCount
      + partyEvaluations[2].duplicateSynergyCount,
    headBackConflictCount: partyEvaluations[1].headBackConflictCount
      + partyEvaluations[2].headBackConflictCount,
    directionalSynergyBenefit: partyEvaluations[1].directionalSynergyBenefit == null
      || partyEvaluations[2].directionalSynergyBenefit == null
      ? null
      : partyEvaluations[1].directionalSynergyBenefit + partyEvaluations[2].directionalSynergyBenefit,
    estimatedRaidPower: partyEvaluations[1].effectivePartyPower == null
      || partyEvaluations[2].effectivePartyPower == null
      ? null
      : partyEvaluations[1].effectivePartyPower + partyEvaluations[2].effectivePartyPower,
    partyPowerDifference: partyEvaluations[1].effectivePartyPower == null
      || partyEvaluations[2].effectivePartyPower == null
      ? null
      : Math.abs(partyEvaluations[1].effectivePartyPower - partyEvaluations[2].effectivePartyPower),
    supportDealerPowerScore: (() => {
      const firstSupportPower = parties[1].find(({ role }) => role === 'support')?.combatPower;
      const secondSupportPower = parties[2].find(({ role }) => role === 'support')?.combatPower;
      const firstDealerPower = partyEvaluations[1].effectivePartyPower;
      const secondDealerPower = partyEvaluations[2].effectivePartyPower;
      if (firstSupportPower == null || firstSupportPower <= 0
        || secondSupportPower == null || secondSupportPower <= 0
        || firstDealerPower == null || secondDealerPower == null) return null;
      return firstSupportPower * firstDealerPower + secondSupportPower * secondDealerPower;
    })(),
    estimatedSynergyNames: Array.from(new Set([
      ...partyEvaluations[1].estimatedSynergyNames,
      ...partyEvaluations[2].estimatedSynergyNames,
    ])).sort(),
    synergyEffectSourceIds: Array.from(new Set([
      ...partyEvaluations[1].synergyEffectSourceIds,
      ...partyEvaluations[2].synergyEffectSourceIds,
    ])).sort(),
    movedMemberIds: members
      .filter((member) => !parties[member.currentParty].some(({ id }) => id === member.id))
      .map((member) => member.id)
      .sort(),
    warnings,
  };
};

const countMovedSupporters = (evaluation: CompositionEvaluation): number => {
  const movedIds = new Set(evaluation.movedMemberIds);
  return [...evaluation.parties[1], ...evaluation.parties[2]]
    .filter(({ id, role }) => role === 'support' && movedIds.has(id))
    .length;
};

export const compareCompositionEvaluations = (
  left: CompositionEvaluation,
  right: CompositionEvaluation,
): number => {
  if (left.duplicateSynergyCount !== right.duplicateSynergyCount) {
    return left.duplicateSynergyCount - right.duplicateSynergyCount;
  }
  if (left.armorReductionStackingScore !== right.armorReductionStackingScore) {
    return right.armorReductionStackingScore - left.armorReductionStackingScore;
  }
  if (left.strategyScore !== right.strategyScore) {
    return right.strategyScore - left.strategyScore;
  }
  if (left.effectiveSynergyCount !== right.effectiveSynergyCount) {
    return right.effectiveSynergyCount - left.effectiveSynergyCount;
  }
  if (left.supportDealerPowerScore != null && right.supportDealerPowerScore != null
    && left.supportDealerPowerScore !== right.supportDealerPowerScore) {
    return right.supportDealerPowerScore - left.supportDealerPowerScore;
  }
  const movedSupportDifference = countMovedSupporters(left) - countMovedSupporters(right);
  if (movedSupportDifference !== 0) return movedSupportDifference;
  if (left.movedMemberIds.length !== right.movedMemberIds.length) {
    return left.movedMemberIds.length - right.movedMemberIds.length;
  }
  return left.parties[1].map(({ id }) => id).sort().join('\u0000')
    .localeCompare(right.parties[1].map(({ id }) => id).sort().join('\u0000'));
};

export const combinationsOfFour = (
  members: readonly RaidCompositionMember[],
): RaidCompositionMember[][] => {
  const combinations: RaidCompositionMember[][] = [];
  const visit = (start: number, selected: RaidCompositionMember[]): void => {
    if (selected.length === 4) {
      combinations.push(selected);
      return;
    }
    for (let index = start; index <= members.length - (4 - selected.length); index += 1) {
      visit(index + 1, [...selected, members[index]]);
    }
  };
  visit(0, []);
  return combinations;
};

const assertValidRoster = (members: readonly RaidCompositionMember[]): void => {
  if (members.length !== 8) throw new Error('8명의 공격대원이 필요합니다.');
  if (new Set(members.map(({ id }) => id)).size !== members.length) {
    throw new Error('공격대원 id는 중복될 수 없습니다.');
  }
};

export const recommendRaidComposition = (
  members: readonly RaidCompositionMember[],
  strategy: CompositionStrategy,
  dataVersion: string,
): CompositionRecommendation | null => {
  assertValidRoster(members);
  const candidates = combinationsOfFour(members).flatMap((firstParty) => {
    const firstIds = new Set(firstParty.map(({ id }) => id));
    const parties: PartyAssignment = {
      1: firstParty,
      2: members.filter(({ id }) => !firstIds.has(id)),
    };
    const keepsFixedMembers = members
      .filter(({ fixed }) => fixed)
      .every((member) => parties[member.currentParty].some(({ id }) => id === member.id));
    if (!keepsFixedMembers) return [];

    const evaluation = evaluateRaidComposition(parties, strategy);
    return evaluation.isValid ? [evaluation] : [];
  });

  if (candidates.length === 0) return null;
  candidates.sort(compareCompositionEvaluations);
  const best = candidates[0];
  const strategyReason = strategy === 'position-focused'
    ? '헤드·백·타대 딜러가 같은 포지션끼리 모이도록 평가했습니다.'
    : '각 파티의 타대와 헤드·백 딜러 분포가 균형을 이루도록 평가했습니다.';

  return {
    ...best,
    dataVersion,
    reasons: [
      '각 파티에 서포터를 1명씩 배치했습니다.',
      best.duplicateSynergyCount === 0
        ? '중첩되지 않는 동일 stackingGroup 시너지를 분리했습니다.'
        : `동일 stackingGroup 중복을 ${best.duplicateSynergyCount}건으로 최소화했습니다.`,
      best.armorReductionStackingScore > 0
        ? `방어력 감소 중첩 점수를 ${best.armorReductionStackingScore}점으로 최대화했습니다.`
        : '방어력 감소 중첩 가능한 조합이 없습니다.',
      strategyReason,
      `유효 시너지 ${best.effectiveSynergyCount}개를 확보했습니다.`,
      ...(best.supportDealerPowerScore == null
        ? []
        : ['서포터 전투력이 높은 파티에 강한 딜러를 우선 배치했습니다.']),
      `현재 편성에서 ${best.movedMemberIds.length}명이 이동합니다.`,
      ...(members.some(({ fixed }) => fixed) ? ['고정 인원의 현재 파티를 유지했습니다.'] : []),
    ],
  };
};
