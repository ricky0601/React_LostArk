import { LOPEC_T4_GEM_BASE_ATTACK_BY_LEVEL } from '../data/specScore/lopecCoefficients';
import { classifyGem } from '../data/specScore/gems';
import { ACCESSORY_SLOTS, type AccessorySlot } from '../data/specScore/polishOptions';
import type { ArkPassiveData, GemItem } from '../types/lostark';
import type { AccessoryState, BraceletState } from './polishState';

/**
 * 기본 공격력 계열 canonical 계산.
 * 근거와 검증 기록: docs/lostark-combat-power-research.md > Canonical Formula
 *
 *   pure_base_attack = sqrt(main_stat * effective_weapon_attack / 6)
 *
 * 게임이 표시하는 '기본 공격력'은 pure_base_attack 이 아니라
 * 기본 공격력% 버킷까지 적용된 값이다. 두 버킷 모두 버킷 내부에서는 합연산.
 */

/** 깨달음 카르마 레벨 1당 무기 공격력 증가율(%) */
const ENLIGHTENMENT_KARMA_WEAPON_ATTACK_PERCENT_PER_LEVEL = 0.1;

/** 어빌리티 스톤 기본 공격력 보너스. 툴팁에서 읽지 못했을 때만 사용한다. */
export const ASSUMED_STONE_BASE_ATTACK_PERCENT = 1.5;

const KARMA_RANK_LEVEL_PATTERN = /(\d+)랭크\s*(\d+)레벨/;

export interface KarmaState {
  readonly rank: number;
  readonly level: number;
}

/**
 * /arkpassive 의 Points[].Description 은 "6랭크 26레벨" 형태로
 * 카르마 랭크와 레벨을 함께 담고 있다.
 */
export const parseKarmaState = (
  arkPassive: ArkPassiveData | undefined,
  pointName: string,
): KarmaState | undefined => {
  const point = arkPassive?.Points?.find((entry) => entry.Name === pointName);
  const match = point?.Description?.match(KARMA_RANK_LEVEL_PATTERN);
  if (!match) return undefined;
  return { rank: Number(match[1]), level: Number(match[2]) };
};

/** 깨달음 카르마는 전투력 직접 인자가 아니라 무기 공격력% 로 들어간다. */
export const resolveEnlightenmentKarmaWeaponAttackPercent = (
  arkPassive: ArkPassiveData | undefined,
): number => {
  const karma = parseKarmaState(arkPassive, '깨달음');
  if (!karma) return 0;
  return karma.level * ENLIGHTENMENT_KARMA_WEAPON_ATTACK_PERCENT_PER_LEVEL;
};

/** 장신구 연마 '무기 공격력 +N%' 합. 절대값(_abs) 옵션은 여기 포함하지 않는다. */
export const sumAccessoryWeaponAttackPercent = (
  accessories: Partial<Record<AccessorySlot, AccessoryState>> | undefined,
): number => {
  if (!accessories) return 0;
  let total = 0;
  for (const slot of ACCESSORY_SLOTS) {
    const accessory = accessories[slot];
    if (!accessory) continue;
    for (const option of accessory.polishOptions) {
      if (option.type === '무기 공격력') total += option.value;
    }
  }
  return total;
};

/** 장신구 연마 '무기 공격력 +N' 절대값 합. */
export const sumAccessoryFlatWeaponAttack = (
  accessories: Partial<Record<AccessorySlot, AccessoryState>> | undefined,
): number => {
  if (!accessories) return 0;
  let total = 0;
  for (const slot of ACCESSORY_SLOTS) {
    const accessory = accessories[slot];
    if (!accessory) continue;
    for (const option of accessory.polishOptions) {
      if (option.type === '무기 공격력_abs') total += option.value;
    }
  }
  return total;
};


export const sumBraceletFlatWeaponAttack = (
  bracelet: BraceletState | null | undefined,
): number => {
  if (!bracelet) return 0;
  let total = 0;
  for (const option of bracelet.options) {
    if (option.type === '무기 공격력') total += option.value;
  }
  return total;
};

/** T4 보석의 기본 공격력% 합. T3 보석은 기본 공격력에 기여하지 않는다. */
export const sumGemBaseAttackPercent = (gems: readonly GemItem[] | null | undefined): number => {
  if (!gems) return 0;
  return gems.reduce((total, gem) => {
    const { tier } = classifyGem(gem.Name, gem.Tooltip);
    if (tier !== 'T4') return total;
    return total + (LOPEC_T4_GEM_BASE_ATTACK_BY_LEVEL[gem.Level] ?? 0);
  }, 0);
};

export interface EffectiveWeaponAttackInput {
  /** 무기 툴팁 '기본 효과 > 무기 공격력 +N' */
  readonly weaponTooltipAttack: number;
  /** 장신구/팔찌의 비버프 절대값 무기 공격력 합 */
  readonly flatWeaponAttack: number;
  /** 장신구 연마% + 깨달음 카르마% 합 */
  readonly weaponAttackPercentSum: number;
}

/**
 * 유효 무기 공격력. 절대값을 먼저 더한 뒤 % 를 한 번 곱한다.
 * 연마 '무기 공격력 +N%' 를 무기 총합 기준 비율로 해석한 결과다.
 *
 * 바깥 형태(`tooltip * pct + flat`)와는 측정으로 판별되지 않았다. 두 식의 차이는
 * `flat * pct` 뿐이라 실제 표본에서 주스탯 0.011%, 전투력 예측 0.00025 수준이다.
 */
export const composeEffectiveWeaponAttack = ({
  weaponTooltipAttack,
  flatWeaponAttack,
  weaponAttackPercentSum,
}: EffectiveWeaponAttackInput): number => {
  if (weaponTooltipAttack <= 0) return 0;
  return (weaponTooltipAttack + flatWeaponAttack) * (1 + weaponAttackPercentSum / 100);
};

export interface MainStatInversionInput {
  /** profile Stats 공격력 툴팁의 '기본 공격력은 N' */
  readonly displayedBaseAttack: number;
  readonly effectiveWeaponAttack: number;
  /** 완갑 등 기본 공격력 flat 보너스 합 */
  readonly baseAttackFlatSum?: number;
  /** T4 보석% + 어빌리티 스톤% 합 */
  readonly baseAttackPercentSum: number;
}

/** 표시 기본 공격력에서 기본 공격력% 를 되돌린 순수 기본 공격력. */
export const resolvePureBaseAttack = (
  displayedBaseAttack: number,
  baseAttackPercentSum: number,
  baseAttackFlatSum = 0,
): number => (displayedBaseAttack / (1 + baseAttackPercentSum / 100)) - baseAttackFlatSum;

/**
 * 주스탯 역산. API 가 표시 주스탯을 주지 않으므로 기본 공격력 공식을 뒤집는다.
 * flat 스탯 소스를 bottom-up 으로 합산하는 방식과 달리, 게임이 이미 합산해 둔
 * 값에서 출발하므로 툴팁 밖 영구 스탯을 놓칠 수 없다.
 */
export const invertMainStat = ({
  displayedBaseAttack,
  effectiveWeaponAttack,
  baseAttackFlatSum = 0,
  baseAttackPercentSum,
}: MainStatInversionInput): number => {
  if (displayedBaseAttack <= 0 || effectiveWeaponAttack <= 0) return 0;
  const pureBaseAttack = resolvePureBaseAttack(displayedBaseAttack, baseAttackPercentSum, baseAttackFlatSum);
  if (pureBaseAttack <= 0) return 0;
  return (pureBaseAttack * pureBaseAttack * 6) / effectiveWeaponAttack;
};
