import { RAID_CLASS_DATA_BY_NAME, type AttackPosition, type ClassSynergy, type RaidRole } from '../../data/raidComposition';
import { resolveRaidBuild } from '../../data/raidBuildPositions';
import type { PartyNumber, RaidCompositionMember } from './evaluateComposition';
import type { RaidSlotObservation } from './recognition';
import { RAID_SLOT_COUNT } from './recognition';

export type ArkPassiveLookupStatus = 'idle' | 'loading' | 'confirmed' | 'review' | 'error';

export interface RaidRosterSlot {
  readonly id: string;
  readonly slot: number;
  readonly currentParty: PartyNumber;
  /** 빈 슬롯은 ''이며, 직업 선택 전까지 검토 필요 상태이다. */
  readonly className: string;
  readonly nickname: string;
  readonly nicknameCandidates: readonly string[];
  readonly confidence: number;
  readonly needsReview: boolean;
  readonly arkPassiveTitle: string;
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
    nickname: '',
    nicknameCandidates: [],
    confidence: 0,
    needsReview: true,
    arkPassiveTitle: '',
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
export const applyRecognitionToRoster = (
  roster: readonly RaidRosterSlot[],
  observations: readonly RaidSlotObservation[],
): readonly RaidRosterSlot[] => {
  const observationBySlot = new Map(observations.map((observation) => [observation.slot, observation]));
  return roster.map((slot) => {
    const observation = observationBySlot.get(slot.slot);
    if (!observation) return slot;
    const nextClassName = observation.className ?? slot.className;
    const nextNickname = observation.nickname ?? slot.nickname;
    const identityChanged = nextClassName !== slot.className || nextNickname !== slot.nickname;
    return {
      ...slot,
      className: nextClassName,
      nickname: nextNickname,
      nicknameCandidates: (observation.nicknameCandidates?.length ?? 0) > 0
        ? observation.nicknameCandidates
        : slot.nicknameCandidates,
      confidence: observation.confidence,
      needsReview: observation.needsReview
        || (observation.className == null && slot.className === '')
        || classNeedsBuildResolution(nextClassName)
        || (!identityChanged && ['loading', 'review', 'error'].includes(slot.arkPassiveStatus)),
      ...(identityChanged ? {
        nicknameCandidates: observation.nicknameCandidates ?? [],
        arkPassiveTitle: '',
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
  patch: Partial<Pick<RaidRosterSlot, 'className' | 'nickname' | 'currentParty' | 'fixed'>>,
): readonly RaidRosterSlot[] => roster.map((slot) => {
  if (slot.id !== id) return slot;
  const identityChanged = (patch.className !== undefined && patch.className !== slot.className)
    || (patch.nickname !== undefined && patch.nickname !== slot.nickname);
  const next = {
    ...slot,
    ...patch,
    ...(identityChanged ? {
      nicknameCandidates: patch.nickname !== undefined ? [patch.nickname] : slot.nicknameCandidates,
      arkPassiveTitle: '',
      resolvedRole: null,
      resolvedPosition: null,
      arkPassiveStatus: 'idle' as const,
      arkPassiveMessage: '',
    } : {}),
  };
  if (patch.className !== undefined) {
    next.needsReview = patch.className === ''
      || !RAID_CLASS_DATA_BY_NAME.has(patch.className)
      || classNeedsBuildResolution(patch.className);
  }
  return next;
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
      currentParty: slot.currentParty,
      fixed: slot.fixed,
    };
  });
