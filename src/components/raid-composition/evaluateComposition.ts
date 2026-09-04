import type { AttackPosition, RaidRole } from '../../data/raidComposition';

export type PartyNumber = 1 | 2;
export type CompositionStrategy = 'position-focused' | 'balanced';

export interface RaidCompositionMember {
  readonly id: string;
  readonly className: string;
  readonly role: RaidRole;
  readonly position: AttackPosition;
  readonly synergyStackingGroups: readonly string[];
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
  readonly duplicateSynergyCount: number;
  readonly warnings: readonly CompositionWarning[];
}

export interface CompositionEvaluation {
  readonly parties: PartyAssignment;
  readonly partyEvaluations: Readonly<Record<PartyNumber, PartyEvaluation>>;
  readonly isValid: boolean;
  readonly isConfirmed: boolean;
  readonly unresolvedMemberIds: readonly string[];
  readonly strategyScore: number;
  readonly effectiveSynergyCount: number;
  readonly duplicateSynergyCount: number;
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

  const synergyMembers = new Map<string, string[]>();
  members.filter((member) => member.role === 'dealer').forEach((member) => {
    new Set(member.synergyStackingGroups).forEach((stackingGroup) => {
      const memberIds = synergyMembers.get(stackingGroup) ?? [];
      memberIds.push(member.id);
      synergyMembers.set(stackingGroup, memberIds);
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

  return {
    party,
    supportCount,
    positions: countPositions(members),
    effectiveSynergyCount: synergyMembers.size,
    duplicateSynergyCount: duplicateWarnings.reduce(
      (total, warning) => total + warning.memberIds.length - 1,
      0,
    ),
    warnings,
  };
};

const positionStrategyScore = (
  partyEvaluations: Readonly<Record<PartyNumber, PartyEvaluation>>,
  strategy: CompositionStrategy,
): number => {
  const first = partyEvaluations[1].positions;
  const second = partyEvaluations[2].positions;
  const firstEntropy = first.entropyHead + first.entropyBack;
  const secondEntropy = second.entropyHead + second.entropyBack;

  if (strategy === 'position-focused') {
    return Math.max(
      firstEntropy + second.hitMaster,
      first.hitMaster + secondEntropy,
    );
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
  const unresolvedMemberIds = members
    .filter((member) => (
      member.role === 'unknown'
      || (member.role === 'dealer' && member.position === 'unknown')
    ))
    .map((member) => member.id)
    .sort();
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
    strategyScore: positionStrategyScore(partyEvaluations, strategy),
    effectiveSynergyCount: partyEvaluations[1].effectiveSynergyCount
      + partyEvaluations[2].effectiveSynergyCount,
    duplicateSynergyCount: partyEvaluations[1].duplicateSynergyCount
      + partyEvaluations[2].duplicateSynergyCount,
    movedMemberIds: members
      .filter((member) => !parties[member.currentParty].some(({ id }) => id === member.id))
      .map((member) => member.id)
      .sort(),
    warnings,
  };
};

const compareEvaluations = (
  left: CompositionEvaluation,
  right: CompositionEvaluation,
): number => {
  if (left.duplicateSynergyCount !== right.duplicateSynergyCount) {
    return left.duplicateSynergyCount - right.duplicateSynergyCount;
  }
  if (left.strategyScore !== right.strategyScore) {
    return right.strategyScore - left.strategyScore;
  }
  if (left.effectiveSynergyCount !== right.effectiveSynergyCount) {
    return right.effectiveSynergyCount - left.effectiveSynergyCount;
  }
  if (left.movedMemberIds.length !== right.movedMemberIds.length) {
    return left.movedMemberIds.length - right.movedMemberIds.length;
  }
  return left.parties[1].map(({ id }) => id).sort().join('\u0000')
    .localeCompare(right.parties[1].map(({ id }) => id).sort().join('\u0000'));
};

const combinationsOfFour = (
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
  candidates.sort(compareEvaluations);
  const best = candidates[0];
  const strategyReason = strategy === 'position-focused'
    ? '사멸 중심 파티와 타대 중심 파티가 되도록 평가했습니다.'
    : '각 파티가 타대 2명과 사멸 1명에 가까워지도록 평가했습니다.';

  return {
    ...best,
    dataVersion,
    reasons: [
      '각 파티에 서포터를 1명씩 배치했습니다.',
      best.duplicateSynergyCount === 0
        ? '동일 stackingGroup 시너지 중복이 없습니다.'
        : `동일 stackingGroup 중복을 ${best.duplicateSynergyCount}건으로 최소화했습니다.`,
      strategyReason,
      `현재 편성에서 ${best.movedMemberIds.length}명이 이동합니다.`,
      ...(members.some(({ fixed }) => fixed) ? ['고정 인원의 현재 파티를 유지했습니다.'] : []),
    ],
  };
};
