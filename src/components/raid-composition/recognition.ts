import type { PartyNumber } from './evaluateComposition';

/**
 * 8인 레이드 모집 상세 화면(오른쪽 패널)의 슬롯 기하 정보.
 *
 * 1919x1079 기준 화면에서 관측한 2x2(파티별 4슬롯) 배치를 정규화 좌표로
 * 표현한다. 실제 프레임 크기에 맞게 스케일업해서 사용하므로 다른 해상도에서도
 * 동일한 비율로 슬롯을 찾는다. 4인 화면은 지원하지 않는다(#85).
 */
export const RAID_RECOGNITION_REFERENCE = { width: 1919, height: 1079 } as const;

export const RAID_SLOT_COUNT = 8 as const;

/** 1파티 영역과 2파티 영역을 나누는 정규화 y 경계(두 파티 사이 여백의 중간값). */
export const PARTY_SPLIT_Y = 0.412;

/** confidence가 이 값 미만이면 자동 판정 대신 `검토 필요`로 표시한다. */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.63;
/** 1·2위 직업 점수가 가까우면 잘못된 자동 확정보다 검토 상태를 우선한다. */
export const CLASS_CONFIDENCE_MARGIN = 0.04;

export interface NormalizedBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * 슬롯 인덱스 0~3은 1파티(위쪽 2x2), 4~7은 2파티(아래쪽 2x2)이다.
 * 각 행은 [왼쪽, 오른쪽] 순서이다.
 */
export const RAID_SLOT_BOXES: readonly NormalizedBox[] = [
  { x: 0.686, y: 0.282, width: 0.146, height: 0.045 },
  { x: 0.841, y: 0.282, width: 0.146, height: 0.045 },
  { x: 0.686, y: 0.335, width: 0.146, height: 0.045 },
  { x: 0.841, y: 0.335, width: 0.146, height: 0.045 },
  { x: 0.686, y: 0.444, width: 0.146, height: 0.045 },
  { x: 0.841, y: 0.444, width: 0.146, height: 0.045 },
  { x: 0.686, y: 0.498, width: 0.146, height: 0.045 },
  { x: 0.841, y: 0.498, width: 0.146, height: 0.045 },
] as const;

/** 슬롯 안에서 직업 문양이 표시되는 왼쪽 영역만 남겨 OCR 텍스트 오탐을 줄인다. */
export const RAID_SLOT_ICON_BOXES: readonly NormalizedBox[] = RAID_SLOT_BOXES.map((box) => ({
  x: box.x,
  y: box.y - 0.006,
  width: 0.035,
  height: box.height + 0.012,
}));

/** 아이콘 오른쪽부터 아이템 레벨 왼쪽까지의 닉네임 텍스트 영역. */
export const RAID_SLOT_NICKNAME_BOXES: readonly NormalizedBox[] = RAID_SLOT_BOXES.map((box) => ({
  x: box.x + 0.017,
  y: box.y + 0.021,
  width: 0.083,
  height: 0.023,
}));

export const normalizeRaidNickname = (value: string): string | null => {
  const normalized = value.replace(/[^가-힣A-Za-z0-9]/g, '');
  return normalized.length >= 2 && normalized.length <= 12 ? normalized : null;
};

export interface ClassIconMatch {
  /** 직업 표시 이름(RAID_CLASS_DATA의 name과 동일). */
  readonly className: string;
  /** 정규화 좌표(0~1) 기준 아이콘 중심. */
  readonly x: number;
  readonly y: number;
  readonly confidence: number;
}

export interface NicknameObservation {
  readonly slot: number;
  readonly text: string;
  readonly candidates?: readonly string[];
  readonly confidence: number;
}

export interface RaidSlotObservation {
  readonly slot: number;
  readonly party: PartyNumber;
  /** 인식된 직업이 없거나(빈 슬롯) threshold 미만이면 null. */
  readonly className: string | null;
  readonly confidence: number;
  readonly needsReview: boolean;
  /** 닉네임 OCR은 보조 결과이므로 없어도 직업 인식에 영향을 주지 않는다. */
  readonly nickname: string | null;
  readonly nicknameCandidates: readonly string[];
}

export interface RaidFrameObservation {
  readonly observations: readonly RaidSlotObservation[];
  readonly scannedAt: number;
}

export const assignPartyByNormalizedY = (y: number): PartyNumber => (y < PARTY_SPLIT_Y ? 1 : 2);

const isInsideBox = (x: number, y: number, box: NormalizedBox): boolean => (
  x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
);

export const slotIndexForPoint = (x: number, y: number): number | null => {
  const found = RAID_SLOT_BOXES.findIndex((box) => isInsideBox(x, y, box));
  return found < 0 ? null : found;
};

const partyForSlot = (slot: number): PartyNumber => (slot < 4 ? 1 : 2);

/**
 * 템플릿 매칭 결과와 닉네임 OCR 결과를 슬롯 단위로 합친다.
 * 닉네임이 없거나 실패해도 직업·파티 판정은 그대로 유지된다.
 */
export const mapMatchesToSlots = (
  matches: readonly ClassIconMatch[],
  nicknames: readonly NicknameObservation[] = [],
): readonly RaidSlotObservation[] => {
  const nicknameBySlot = new Map(nicknames.map((nickname) => [nickname.slot, nickname]));

  return RAID_SLOT_BOXES.map((box, slot) => {
    const bestByClass = new Map<string, ClassIconMatch>();
    matches.filter((match) => isInsideBox(match.x, match.y, box)).forEach((match) => {
      const current = bestByClass.get(match.className);
      if (!current || match.confidence > current.confidence) bestByClass.set(match.className, match);
    });
    const candidates = Array.from(bestByClass.values())
      .sort((left, right) => right.confidence - left.confidence);
    const best = candidates[0] ?? null;
    const runnerUp = candidates[1] ?? null;
    const recognized = best != null
      && best.confidence >= REVIEW_CONFIDENCE_THRESHOLD
      && (runnerUp == null || best.confidence - runnerUp.confidence >= CLASS_CONFIDENCE_MARGIN);
    return {
      slot,
      party: partyForSlot(slot),
      className: recognized && best != null ? best.className : null,
      confidence: best?.confidence ?? 0,
      needsReview: !recognized,
      nickname: nicknameBySlot.get(slot)?.text ?? null,
      nicknameCandidates: nicknameBySlot.get(slot)?.candidates ?? [],
    };
  });
};

export const countRecognizedSlots = (
  observations: readonly RaidSlotObservation[],
): number => observations.filter((observation) => observation.className != null).length;
