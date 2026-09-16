import { RAID_CLASS_DATA_BY_NAME, type AttackPosition, type ClassSynergy, type RaidRole } from '../../data/raidComposition';
import { resolveRaidBuild } from '../../data/raidBuildPositions';
import type { PartyNumber, RaidCompositionMember } from './evaluateComposition';
import type { RaidSlotObservation } from './recognition';
import { normalizeRaidNickname, RAID_SLOT_COUNT } from './recognition';

export type ArkPassiveLookupStatus = 'idle' | 'loading' | 'confirmed' | 'review' | 'error';
export type RaidValueProvenance = 'recognition' | 'manual';

export interface RaidRosterSlot {
  readonly id: string;
  readonly slot: number;
  readonly currentParty: PartyNumber;
  /** 빈 슬롯은 ''이며, 직업 선택 전까지 검토 필요 상태이다. */
  readonly className: string;
  readonly classNameSource: RaidValueProvenance;
  readonly nickname: string;
  readonly nicknameSource: RaidValueProvenance;
  readonly nicknameCandidates: readonly string[];
  readonly confidence: number;
  readonly combatPower: number | null;
  readonly combatPowerSource: RaidValueProvenance;
  readonly vacancyFrames: number;
  readonly pendingNickname: string;
  readonly pendingNicknameFrames: number;
  readonly needsReview: boolean;
  readonly arkPassiveTitle: string;
  readonly buildSource: RaidValueProvenance;
  readonly resolvedRole: RaidRole | null;
  readonly resolvedPosition: AttackPosition | null;
  readonly arkPassiveStatus: ArkPassiveLookupStatus;
  readonly arkPassiveMessage: string;
  /** true면 추천 탐색에서 현재 파티를 유지한다. */
  readonly fixed: boolean;
}

export const CLASS_OPTIONS: readonly string[] = Array.from(RAID_CLASS_DATA_BY_NAME.keys());

const POSITION_LABEL = {
  'entropy-head': '헤드',
  'entropy-back': '백',
  'hit-master': '타대',
  unknown: '포지션 확인',
} as const;

const SYNERGY_SHORT_LABEL: Readonly<Record<string, string>> = {
  '치명타 적중률 증가': '치적',
  '치명타 확률 증가': '치적',
  '치명타 피해 증가': '치피증',
  '공격력 증가': '공증',
  '피해 증가': '피증',
  '받는 피해 증가': '피증',
  '방어력 감소': '방깎',
  '헤드·백어택 피해 증가': '백헤드',
  '백/헤드 어택 피해 증가': '백헤드',
  '무력화 피해 증가': '무력화',
};

export interface RaidClassBadge {
  readonly label: string;
  readonly tone: 'position' | 'synergy' | 'support' | 'review';
}

interface RaidClassResolution {
  readonly role?: RaidRole | null;
  readonly position?: AttackPosition | null;
  readonly arkPassiveTitle?: string;
  readonly synergies?: readonly ClassSynergy[];
}

const getResolvedSynergies = (
  className: string,
  resolution: RaidClassResolution | undefined,
): readonly ClassSynergy[] => {
  if (resolution?.synergies) return resolution.synergies;
  const buildSynergies = resolution?.arkPassiveTitle
    ? resolveRaidBuild(className, resolution.arkPassiveTitle).synergies
    : undefined;
  return buildSynergies ?? RAID_CLASS_DATA_BY_NAME.get(className)?.synergies ?? [];
};

export const getRaidClassBadges = (
  className: string,
  resolution?: RaidClassResolution,
): readonly RaidClassBadge[] => {
  const classData = RAID_CLASS_DATA_BY_NAME.get(className);
  if (!classData) return className ? [{ label: '정보 확인', tone: 'review' }] : [];
  const role = resolution?.role ?? classData.role;
  const position = resolution?.position ?? classData.position;
  if (role === 'support') return [{ label: '서포터', tone: 'support' }];
  const badges: RaidClassBadge[] = [{
    label: role === 'unknown' ? '역할 확인' : POSITION_LABEL[position],
    tone: role === 'unknown' || position === 'unknown' ? 'review' : 'position',
  }];
  badges.push(...Array.from(new Set(getResolvedSynergies(className, resolution).map(({ name }) => (
    SYNERGY_SHORT_LABEL[name] ?? name
  )))).map((label) => ({ label, tone: 'synergy' as const })));
  return badges;
};

export const getRaidClassDisplayLabel = (
  className: string,
  resolution?: RaidClassResolution,
): string => {
  const classData = RAID_CLASS_DATA_BY_NAME.get(className);
  if (!classData) return className ? `${className} · 정보 확인` : '직업 선택';
  const role = resolution?.role ?? classData.role;
  const position = resolution?.position ?? classData.position;
  if (role === 'support') return `${className} · 서포터`;
  const synergies = Array.from(new Set(getResolvedSynergies(className, resolution).map(({ name }) => (
    SYNERGY_SHORT_LABEL[name] ?? name
  ))));
  return `${className} · ${POSITION_LABEL[position]} · ${synergies.join('+') || '시너지 확인'}`;
};

const classNeedsBuildResolution = (className: string): boolean => {
  const classData = RAID_CLASS_DATA_BY_NAME.get(className);
  return classData?.role === 'unknown'
    || (classData?.role === 'dealer' && classData.position === 'unknown');
};

const slotId = (slot: number): string => `slot-${slot}`;

export const createInitialRoster = (): readonly RaidRosterSlot[] => (
  Array.from({ length: RAID_SLOT_COUNT }, (_, slot) => ({
    id: slotId(slot),
    slot,
    currentParty: (slot < 4 ? 1 : 2) as PartyNumber,
    className: '',
    classNameSource: 'recognition' as const,
    nickname: '',
    nicknameSource: 'recognition' as const,
    nicknameCandidates: [],
    confidence: 0,
    combatPower: null,
    combatPowerSource: 'recognition' as const,
    vacancyFrames: 0,
    pendingNickname: '',
    pendingNicknameFrames: 0,
    needsReview: true,
    arkPassiveTitle: '',
    buildSource: 'recognition' as const,
    resolvedRole: null,
    resolvedPosition: null,
    arkPassiveStatus: 'idle' as const,
    arkPassiveMessage: '',
    fixed: false,
  }))
);

/**
 * 인식 결과를 로스터에 반영한다. 부분 인식이어도 기존 수동 입력은 유지되며,
 * 고정(fixed) 표시는 인식으로 해제되지 않는다.
 */
interface ApplyRecognitionOptions {
  readonly preserveConfirmedNicknames?: boolean;
}

const moveIdentifiedParticipants = (
  roster: readonly RaidRosterSlot[],
  observations: readonly RaidSlotObservation[],
): { roster: readonly RaidRosterSlot[]; ignoredObservationSlots: ReadonlySet<number> } => {
  const rosterNicknameCounts = new Map<string, number>();
  const observationNicknameCounts = new Map<string, number>();
  roster.forEach(({ nickname }) => {
    if (normalizeRaidNickname(nickname) === nickname) {
      rosterNicknameCounts.set(nickname, (rosterNicknameCounts.get(nickname) ?? 0) + 1);
    }
  });
  observations.forEach(({ nickname }) => {
    if (nickname != null && normalizeRaidNickname(nickname) === nickname) {
      observationNicknameCounts.set(nickname, (observationNicknameCounts.get(nickname) ?? 0) + 1);
    }
  });

  const rosterByNickname = new Map(roster
    .filter(({ nickname }) => rosterNicknameCounts.get(nickname) === 1)
    .map((slot) => [slot.nickname, slot]));
  const rosterByPhysicalPosition = new Map(roster.map((slot) => [slot.slot, slot]));
  const observationByPhysicalPosition = new Map(observations.map((observation) => [observation.slot, observation]));
  const confirmedVacancySlots = new Set(roster
    .filter((slot) => {
      const observation = observationByPhysicalPosition.get(slot.slot);
      return observation?.occupancy === 'vacant'
        && slot.vacancyFrames + 1 >= 2;
    })
    .map(({ slot }) => slot));
  const proposals = new Map<string, { participant: RaidRosterSlot; observation: RaidSlotObservation }>();
  observations.forEach((observation) => {
    if (observation.nickname == null || observationNicknameCounts.get(observation.nickname) !== 1) return;
    const participant = rosterByNickname.get(observation.nickname);
    if (participant?.className === observation.className) {
      proposals.set(participant.id, { participant, observation });
    }
  });
  const canApplyProposal = (participantId: string, visited = new Set<string>()): boolean => {
    const proposal = proposals.get(participantId);
    if (!proposal || visited.has(participantId)) return visited.has(participantId);
    if (proposal.participant.slot === proposal.observation.slot) return true;
    const displaced = rosterByPhysicalPosition.get(proposal.observation.slot);
    if (!displaced || (displaced.className === '' && displaced.nickname === '')) return true;
    if (!proposals.has(displaced.id)) {
      return confirmedVacancySlots.has(proposal.participant.slot)
        && displaced.classNameSource === 'recognition'
        && displaced.nicknameSource === 'recognition';
    }
    const nextVisited = new Set(visited);
    nextVisited.add(participantId);
    return canApplyProposal(displaced.id, nextVisited);
  };

  const assignedIds = new Set<string>();
  const ignoredObservationSlots = new Set<number>();
  const slotsByPhysicalPosition: Array<RaidRosterSlot | undefined> = Array(RAID_SLOT_COUNT);
  proposals.forEach(({ participant, observation }) => {
    if (!canApplyProposal(participant.id)) {
      ignoredObservationSlots.add(observation.slot);
      return;
    }
    const moved = participant.slot !== observation.slot;
    slotsByPhysicalPosition[observation.slot] = moved
      ? { ...participant, slot: observation.slot, currentParty: observation.party }
      : participant;
    assignedIds.add(participant.id);
  });

  const remaining = roster.filter(({ id }) => !assignedIds.has(id));
  remaining.forEach((slot) => {
    if (slotsByPhysicalPosition[slot.slot] == null) slotsByPhysicalPosition[slot.slot] = slot;
  });
  const displaced = remaining.filter((slot) => slotsByPhysicalPosition[slot.slot]?.id !== slot.id);
  for (let physicalPosition = 0; physicalPosition < RAID_SLOT_COUNT; physicalPosition += 1) {
    if (slotsByPhysicalPosition[physicalPosition] != null) continue;
    const participant = displaced.shift();
    if (!participant) continue;
    const vacancyFrames = confirmedVacancySlots.has(physicalPosition)
      ? rosterByPhysicalPosition.get(physicalPosition)?.vacancyFrames ?? participant.vacancyFrames
      : participant.vacancyFrames;
    slotsByPhysicalPosition[physicalPosition] = {
      ...participant,
      slot: physicalPosition,
      currentParty: observationByPhysicalPosition.get(physicalPosition)?.party ?? participant.currentParty,
      vacancyFrames,
    };
  }

  return {
    roster: slotsByPhysicalPosition.filter((slot): slot is RaidRosterSlot => slot != null),
    ignoredObservationSlots,
  };
};

export const applyRecognitionToRoster = (
  roster: readonly RaidRosterSlot[],
  observations: readonly RaidSlotObservation[],
  options: ApplyRecognitionOptions = {},
): readonly RaidRosterSlot[] => {
  const { roster: positionedRoster, ignoredObservationSlots } = moveIdentifiedParticipants(roster, observations);
  const observationBySlot = new Map(observations
    .filter(({ slot }) => !ignoredObservationSlots.has(slot))
    .map((observation) => [observation.slot, observation]));
  return positionedRoster.map((slot) => {
    const observation = observationBySlot.get(slot.slot);
    if (!observation) return slot;
    const isVacancy = observation.occupancy === 'vacant';
    const vacancyFrames = isVacancy ? slot.vacancyFrames + 1 : 0;
    if (isVacancy && vacancyFrames >= 2) {
      const clearClass = slot.classNameSource === 'recognition';
      const clearNickname = slot.nicknameSource === 'recognition';
      const clearBuild = clearClass || (clearNickname && slot.buildSource === 'recognition');
      return {
        ...slot,
        ...(clearClass ? { className: '' } : {}),
        ...(clearNickname ? { nickname: '', nicknameCandidates: [] } : {}),
        ...(clearBuild ? {
          arkPassiveTitle: '',
          combatPower: null,
          combatPowerSource: 'recognition' as const,
          buildSource: 'recognition' as const,
          resolvedRole: null,
          resolvedPosition: null,
          arkPassiveStatus: 'idle' as const,
          arkPassiveMessage: '',
        } : {}),
        confidence: 0,
        vacancyFrames,
        pendingNickname: '',
        pendingNicknameFrames: 0,
        needsReview: clearClass || (clearBuild ? classNeedsBuildResolution(slot.className) : slot.needsReview),
        fixed: clearClass || clearNickname ? false : slot.fixed,
      };
    }
    const nextClassName = slot.classNameSource === 'manual'
      ? slot.className
      : observation.className ?? slot.className;
    const confirmedNicknameStillObserved = observation.nicknameCandidates?.some(
      (candidate) => normalizeRaidNickname(candidate) === normalizeRaidNickname(slot.nickname),
    ) === true;
    const confirmedNicknameMismatch = options.preserveConfirmedNicknames === true
      && slot.nicknameSource === 'recognition'
      && slot.arkPassiveStatus === 'confirmed'
      && nextClassName === slot.className
      && observation.nickname != null
      && observation.nickname !== slot.nickname
      && !confirmedNicknameStillObserved;
    const pendingNicknameFrames = confirmedNicknameMismatch
      ? (slot.pendingNickname === observation.nickname ? slot.pendingNicknameFrames + 1 : 1)
      : 0;
    const replaceConfirmedNickname = confirmedNicknameMismatch && pendingNicknameFrames >= 2;
    const preserveConfirmedNickname = options.preserveConfirmedNicknames === true
      && slot.arkPassiveStatus === 'confirmed'
      && nextClassName === slot.className
      && !replaceConfirmedNickname;
    const nextNickname = slot.nicknameSource === 'manual' || preserveConfirmedNickname
      ? slot.nickname
      : observation.nickname ?? slot.nickname;
    const classChanged = nextClassName !== slot.className;
    const nicknameChanged = nextNickname !== slot.nickname;
    const identityChanged = classChanged || nicknameChanged;
    const preserveConfirmedResolution = !identityChanged && slot.arkPassiveStatus === 'confirmed';
    return {
      ...slot,
      className: nextClassName,
      nickname: nextNickname,
      nicknameCandidates: slot.nicknameSource === 'manual' || preserveConfirmedNickname
        ? slot.nicknameCandidates
        : (observation.nicknameCandidates?.length ?? 0) > 0
          ? observation.nicknameCandidates
          : slot.nicknameCandidates,
      confidence: observation.confidence,
      vacancyFrames,
      pendingNickname: confirmedNicknameMismatch && !replaceConfirmedNickname ? observation.nickname ?? '' : '',
      pendingNicknameFrames: confirmedNicknameMismatch && !replaceConfirmedNickname ? pendingNicknameFrames : 0,
      needsReview: preserveConfirmedResolution
        ? false
        : observation.needsReview
          || (observation.className == null && slot.className === '')
          || classNeedsBuildResolution(nextClassName)
          || (!identityChanged && ['loading', 'review', 'error'].includes(slot.arkPassiveStatus)),
      ...(identityChanged ? {
        nicknameCandidates: slot.nicknameSource === 'manual'
          ? slot.nicknameCandidates
          : observation.nicknameCandidates ?? [],
        arkPassiveTitle: '',
        combatPower: null,
        combatPowerSource: 'recognition' as const,
        buildSource: 'recognition' as const,
        resolvedRole: null,
        resolvedPosition: null,
        arkPassiveStatus: 'idle' as const,
        arkPassiveMessage: '',
      } : {}),
    };
  });
};

export const updateRosterSlot = (
  roster: readonly RaidRosterSlot[],
  id: string,
  patch: Partial<Pick<RaidRosterSlot, 'className' | 'nickname' | 'combatPower' | 'currentParty' | 'fixed'>>,
): readonly RaidRosterSlot[] => roster.map((slot) => {
  if (slot.id !== id) return slot;
  const identityChanged = (patch.className !== undefined && patch.className !== slot.className)
    || (patch.nickname !== undefined && patch.nickname !== slot.nickname);
  const next = {
    ...slot,
    ...patch,
    ...(patch.className !== undefined ? { classNameSource: 'manual' as const } : {}),
    ...(patch.nickname !== undefined ? { nicknameSource: 'manual' as const } : {}),
    ...(patch.combatPower !== undefined ? { combatPowerSource: 'manual' as const } : {}),
    ...(identityChanged ? {
      nicknameCandidates: patch.nickname !== undefined ? [patch.nickname] : slot.nicknameCandidates,
      arkPassiveTitle: '',
      combatPower: patch.combatPower !== undefined ? patch.combatPower : null,
      combatPowerSource: patch.combatPower !== undefined ? 'manual' as const : 'recognition' as const,
      buildSource: 'recognition' as const,
      resolvedRole: null,
      resolvedPosition: null,
      arkPassiveStatus: 'idle' as const,
      arkPassiveMessage: '',
      vacancyFrames: 0,
      pendingNickname: '',
      pendingNicknameFrames: 0,
    } : {}),
  };
  if (identityChanged) {
    next.needsReview = next.className === ''
      || !RAID_CLASS_DATA_BY_NAME.has(next.className)
      || classNeedsBuildResolution(next.className);
  }
  return next;
});

export const enableRosterAutoRecognition = (
  roster: readonly RaidRosterSlot[],
  id: string,
): readonly RaidRosterSlot[] => roster.map((slot) => (
  slot.id === id
    ? {
      ...slot,
      classNameSource: 'recognition' as const,
      nicknameSource: 'recognition' as const,
      vacancyFrames: 0,
      pendingNickname: '',
      pendingNicknameFrames: 0,
    }
    : slot
));

export const updateRosterBuild = (
  roster: readonly RaidRosterSlot[],
  id: string,
  title: string,
): readonly RaidRosterSlot[] => roster.map((slot) => {
  if (slot.id !== id) return slot;
  if (title === '') {
    return {
      ...slot,
      arkPassiveTitle: '',
      buildSource: 'recognition' as const,
      resolvedRole: null,
      resolvedPosition: null,
      arkPassiveStatus: 'idle' as const,
      arkPassiveMessage: '',
      needsReview: classNeedsBuildResolution(slot.className),
    };
  }
  const resolution = resolveRaidBuild(slot.className, title);
  return {
    ...slot,
    arkPassiveTitle: resolution.title,
    buildSource: 'manual' as const,
    resolvedRole: resolution.role,
    resolvedPosition: resolution.position,
    arkPassiveStatus: resolution.needsReview ? 'review' as const : 'confirmed' as const,
    arkPassiveMessage: resolution.needsReview ? '빌드 확인 필요' : '수동 빌드 선택',
    needsReview: resolution.needsReview,
  };
});

const UNKNOWN_MEMBER = {
  role: 'unknown',
  position: 'unknown',
  synergies: [],
} as const;

/** 로스터를 편성 평가 입력으로 변환한다. 빈 슬롯은 제외한다. */
export const toCompositionMembers = (
  roster: readonly RaidRosterSlot[],
): readonly RaidCompositionMember[] => roster
  .filter((slot) => slot.className !== '')
  .map((slot) => {
    const classData = RAID_CLASS_DATA_BY_NAME.get(slot.className);
    const buildSynergies = slot.arkPassiveTitle
      ? resolveRaidBuild(slot.className, slot.arkPassiveTitle).synergies
      : undefined;
    return {
      id: slot.id,
      className: slot.className,
      role: slot.resolvedRole ?? classData?.role ?? UNKNOWN_MEMBER.role,
      position: slot.resolvedPosition ?? classData?.position ?? UNKNOWN_MEMBER.position,
      synergies: buildSynergies ?? classData?.synergies ?? UNKNOWN_MEMBER.synergies,
      combatPower: slot.combatPower,
      currentParty: slot.currentParty,
      fixed: slot.fixed,
    };
  });
