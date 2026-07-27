/**
 * 장신구 연마 효과 (Polish Effects) 데이터
 *
 * 전투력 증가량은 장신구 연마 효과별 독립 증가분이다.
 * 힘/민/지와 무기 공격력은 기본 공격력 쪽에서 계산되므로 direct 전투력 증가분을 두지 않는다.
 * 공용 공격력 flat은 기본 공격력 142857 기준 딜 증가량으로 별도 전투력 증가분을 둔다.
 */

export type PolishEffectType =
  | '없음'
  | '추가 피해'
  | '적에게 주는 피해'
  | '무기 공격력'
  | '공격력'
  | '치명타 적중률'
  | '치명타 피해'
  | '무기 공격력_abs'
  | '공격력_abs';

export type PolishGrade = '하' | '중' | '상';

export interface PolishOption {
  type: PolishEffectType;
  grade: PolishGrade;
  /** UI 라벨 / lopec dropdown value 일치 */
  label: string;
  /** % 값 또는 절대 unit */
  value: number;
  /** 단독 적용 시 별도 전투력 증가량(%) */
  combatPowerIncreasePercent: number;
}

/** 24개 effect + 없음 = 25개 옵션 */
export const POLISH_OPTIONS: PolishOption[] = [
  { type: '없음', grade: '하', label: '없음', value: 0, combatPowerIncreasePercent: 0 },

  { type: '추가 피해', grade: '하', label: '추가 피해 +0.60%', value: 0.60, combatPowerIncreasePercent: 0.46152 },
  { type: '추가 피해', grade: '중', label: '추가 피해 +1.60%', value: 1.60, combatPowerIncreasePercent: 1.23072 },
  { type: '추가 피해', grade: '상', label: '추가 피해 +2.60%', value: 2.60, combatPowerIncreasePercent: 1.99992 },

  { type: '적에게 주는 피해', grade: '하', label: '적에게 주는 피해 +0.55%', value: 0.55, combatPowerIncreasePercent: 0.55 },
  { type: '적에게 주는 피해', grade: '중', label: '적에게 주는 피해 +1.20%', value: 1.20, combatPowerIncreasePercent: 1.20 },
  { type: '적에게 주는 피해', grade: '상', label: '적에게 주는 피해 +2.00%', value: 2.00, combatPowerIncreasePercent: 2.00 },

  { type: '무기 공격력', grade: '하', label: '무기 공격력 +0.80%', value: 0.80, combatPowerIncreasePercent: 0 },
  { type: '무기 공격력', grade: '중', label: '무기 공격력 +1.80%', value: 1.80, combatPowerIncreasePercent: 0 },
  { type: '무기 공격력', grade: '상', label: '무기 공격력 +3.00%', value: 3.00, combatPowerIncreasePercent: 0 },

  { type: '공격력', grade: '하', label: '공격력 +0.40%', value: 0.40, combatPowerIncreasePercent: 0.40 },
  { type: '공격력', grade: '중', label: '공격력 +0.95%', value: 0.95, combatPowerIncreasePercent: 0.95 },
  { type: '공격력', grade: '상', label: '공격력 +1.55%', value: 1.55, combatPowerIncreasePercent: 1.55 },

  { type: '치명타 적중률', grade: '하', label: '치명타 적중률 +0.40%', value: 0.40, combatPowerIncreasePercent: 0.309680 },
  { type: '치명타 적중률', grade: '중', label: '치명타 적중률 +0.95%', value: 0.95, combatPowerIncreasePercent: 0.735490 },
  { type: '치명타 적중률', grade: '상', label: '치명타 적중률 +1.55%', value: 1.55, combatPowerIncreasePercent: 1.200010 },

  { type: '치명타 피해', grade: '하', label: '치명타 피해 +1.10%', value: 1.10, combatPowerIncreasePercent: 0.330000 },
  { type: '치명타 피해', grade: '중', label: '치명타 피해 +2.40%', value: 2.40, combatPowerIncreasePercent: 0.720000 },
  { type: '치명타 피해', grade: '상', label: '치명타 피해 +4.00%', value: 4.00, combatPowerIncreasePercent: 1.200000 },

  { type: '무기 공격력_abs', grade: '하', label: '무기 공격력 +195', value: 195, combatPowerIncreasePercent: 0 },
  { type: '무기 공격력_abs', grade: '중', label: '무기 공격력 +480', value: 480, combatPowerIncreasePercent: 0 },
  { type: '무기 공격력_abs', grade: '상', label: '무기 공격력 +960', value: 960, combatPowerIncreasePercent: 0 },

  { type: '공격력_abs', grade: '하', label: '공격력 +80', value: 80, combatPowerIncreasePercent: 0.0560 },
  { type: '공격력_abs', grade: '중', label: '공격력 +195', value: 195, combatPowerIncreasePercent: 0.1365 },
  { type: '공격력_abs', grade: '상', label: '공격력 +390', value: 390, combatPowerIncreasePercent: 0.2730 },
];

/** 라벨로 PolishOption 찾기 */
export const findPolishOption = (label: string): PolishOption | undefined =>
  POLISH_OPTIONS.find((o) => o.label === label);

/** 장신구 슬롯 종류 */
export type AccessorySlot = 'necklace' | 'earring1' | 'earring2' | 'ring1' | 'ring2';

export const ACCESSORY_SLOTS: AccessorySlot[] = ['necklace', 'earring1', 'earring2', 'ring1', 'ring2'];

export const ACCESSORY_LABELS: Record<AccessorySlot, string> = {
  necklace: '목걸이',
  earring1: '귀걸이 1',
  earring2: '귀걸이 2',
  ring1: '반지 1',
  ring2: '반지 2',
};

/** EquipmentItem.Type에서 slot 매핑 (귀걸이/반지는 순서대로 1/2 할당) */
export const equipmentTypeToAccessorySlot = (type: string, slotOccurrence: number): AccessorySlot | null => {
  if (type === '목걸이') return 'necklace';
  if (type === '귀걸이') return slotOccurrence === 1 ? 'earring2' : 'earring1';
  if (type === '반지') return slotOccurrence === 1 ? 'ring2' : 'ring1';
  return null;
};

/** 팔찌 전용 옵션 데이터. 장신구 연마 효과와 독립 계수 체계다. */
export type BraceletOptionGrade = '하' | '중' | '상';

export interface BraceletOption {
  type: string;
  grade: BraceletOptionGrade;
  label: string;
  value: number;
  combatPowerIncreasePercent: number;
}

const braceletOption = (
  type: string,
  grade: BraceletOptionGrade,
  label: string,
  value: number,
  combatPowerIncreasePercent: number,
): BraceletOption => ({ type, grade, label, value, combatPowerIncreasePercent });

export const BRACELET_OPTIONS: BraceletOption[] = [
  braceletOption('없음', '하', '없음', 0, 0),
  braceletOption('치명타 적중률+치명타 적주피', '하', '치적 +3.40% | 치명타 적주피 +1.5%', 3.4, 3.5),
  braceletOption('치명타 적중률+치명타 적주피', '중', '치적 +4.20% | 치명타 적주피 +1.5%', 4.2, 4.0),
  braceletOption('치명타 적중률+치명타 적주피', '상', '치적 +5.00% | 치명타 적주피 +1.5%', 5.0, 4.5),
  braceletOption('치명타 피해+치명타 적주피', '하', '치피 +6.80% | 치명타 적주피 +1.5%', 6.8, 3.5),
  braceletOption('치명타 피해+치명타 적주피', '중', '치피 +8.40% | 치명타 적주피 +1.5%', 8.4, 4.0),
  braceletOption('치명타 피해+치명타 적주피', '상', '치피 +10.00% | 치명타 적주피 +1.5%', 10.0, 4.5),
  braceletOption('추가 피해+대악마 피해', '하', '추피 +2.50% | 대악마 피해 +2.5%', 2.5, 3.5),
  braceletOption('추가 피해+대악마 피해', '중', '추피 +3.00% | 대악마 피해 +2.5%', 3.0, 4.0),
  braceletOption('추가 피해+대악마 피해', '상', '추피 +3.50% | 대악마 피해 +2.5%', 3.5, 4.5),
  braceletOption('쿨증+적에게 주는 피해', '하', '쿨증 +2.0% | 적주피 +4.5%', 4.5, 3.5),
  braceletOption('쿨증+적에게 주는 피해', '중', '쿨증 +2.0% | 적주피 +5.0%', 5.0, 4.0),
  braceletOption('쿨증+적에게 주는 피해', '상', '쿨증 +2.0% | 적주피 +5.5%', 5.5, 4.5),
  braceletOption('적에게 주는 피해+무력화 적주피', '하', '적주피 +2.0% | 무력화 적주피 +4.0%', 2.0, 2.8),
  braceletOption('적에게 주는 피해+무력화 적주피', '중', '적주피 +2.5% | 무력화 적주피 +4.5%', 2.5, 3.4),
  braceletOption('적에게 주는 피해+무력화 적주피', '상', '적주피 +3.0% | 무력화 적주피 +5.0%', 3.0, 4.0),
  braceletOption('적중 무공 버프', '하', '적중 시 무공 +1160 x6 | 공이속 +6%', 1160, 1.88),
  braceletOption('적중 무공 버프', '중', '적중 시 무공 +1320 x6 | 공이속 +6%', 1320, 2.14),
  braceletOption('적중 무공 버프', '상', '적중 시 무공 +1480 x6 | 공이속 +6%', 1480, 2.40),
  braceletOption('체력 조건 무공 버프', '하', '무공 +7200 | 체력 50% 이상 무공 +2000', 2000, 0.54),
  braceletOption('체력 조건 무공 버프', '중', '무공 +8100 | 체력 50% 이상 무공 +2200', 2200, 0.59),
  braceletOption('체력 조건 무공 버프', '상', '체력 50% 이상 무공 버프', 2400, 0.65),
  braceletOption('에테르 포식자 무공 버프', '하', '무공 +6900 | 30초마다 무공 +130 x30', 3900, 1.05),
  braceletOption('에테르 포식자 무공 버프', '중', '무공 +7800 | 30초마다 무공 +140 x30', 4200, 1.13),
  braceletOption('에테르 포식자 무공 버프', '상', '무공 +8700 | 30초마다 무공 +150 x30', 4500, 1.21),
  braceletOption('적에게 주는 피해', '하', '적에게 주는 피해 +2.0%', 2.0, 2.0),
  braceletOption('적에게 주는 피해', '중', '적에게 주는 피해 +2.5%', 2.5, 2.5),
  braceletOption('적에게 주는 피해', '상', '적에게 주는 피해 +3.0%', 3.0, 3.0),
  braceletOption('추가 피해', '하', '추가 피해 +3.0%', 3.0, 2.3076),
  braceletOption('추가 피해', '중', '추가 피해 +3.5%', 3.5, 2.69220),
  braceletOption('추가 피해', '상', '추가 피해 +4.0%', 4.0, 3.0768),
  braceletOption('백어택 스킬 적주피', '하', '백어택 스킬 적주피 +2.5%', 2.5, 1.75),
  braceletOption('백어택 스킬 적주피', '중', '백어택 스킬 적주피 +3.0%', 3.0, 2.10),
  braceletOption('백어택 스킬 적주피', '상', '백어택 스킬 적주피 +3.5%', 3.5, 2.45),
  braceletOption('헤드어택 스킬 적주피', '하', '헤드어택 스킬 적주피 +2.5%', 2.5, 1.75),
  braceletOption('헤드어택 스킬 적주피', '중', '헤드어택 스킬 적주피 +3.0%', 3.0, 2.10),
  braceletOption('헤드어택 스킬 적주피', '상', '헤드어택 스킬 적주피 +3.5%', 3.5, 2.45),
  braceletOption('타대 스킬 적주피', '하', '타대 스킬 적주피 +2.5%', 2.5, 2.5),
  braceletOption('타대 스킬 적주피', '중', '타대 스킬 적주피 +3.0%', 3.0, 3.0),
  braceletOption('타대 스킬 적주피', '상', '타대 스킬 적주피 +3.5%', 3.5, 3.5),
  braceletOption('치명타 적중률', '하', '치명타 적중률 +3.40%', 3.4, 2.38),
  braceletOption('치명타 적중률', '중', '치명타 적중률 +4.20%', 4.2, 2.94),
  braceletOption('치명타 적중률', '상', '치명타 적중률 +5.00%', 5.0, 3.5),
  braceletOption('치명타 피해', '하', '치명타 피해 +6.80%', 6.8, 2.26644),
  braceletOption('치명타 피해', '중', '치명타 피해 +8.40%', 8.4, 2.79972),
  braceletOption('치명타 피해', '상', '치명타 피해 +10.00%', 10.0, 3.333),
  braceletOption('무기 공격력', '하', '무기 공격력 +7200', 7200, 0),
  braceletOption('무기 공격력', '중', '무기 공격력 +8100', 8100, 0),
  braceletOption('무기 공격력', '상', '무기 공격력 +9000', 9000, 0),

  braceletOption('방어력 감소+아군 공격력 강화', '하', '방어력 -1.8% | 아군 공격력 강화 +2.0%', 2.0, 0),
  braceletOption('방어력 감소+아군 공격력 강화', '중', '방어력 -2.1% | 아군 공격력 강화 +2.5%', 2.5, 0),
  braceletOption('방어력 감소+아군 공격력 강화', '상', '방어력 -2.5% | 아군 공격력 강화 +3.0%', 3.0, 0),
  braceletOption('치명타 저항 감소+아군 공격력 강화', '하', '치저 -1.8% | 아군 공격력 강화 +2.0%', 2.0, 0),
  braceletOption('치명타 저항 감소+아군 공격력 강화', '중', '치저 -2.1% | 아군 공격력 강화 +2.5%', 2.5, 0),
  braceletOption('치명타 저항 감소+아군 공격력 강화', '상', '치저 -2.5% | 아군 공격력 강화 +3.0%', 3.0, 0),
  braceletOption('치명타 피해 저항 감소+아군 공격력 강화', '하', '치피저 -3.6% | 아군 공격력 강화 +2.0%', 2.0, 0),
  braceletOption('치명타 피해 저항 감소+아군 공격력 강화', '중', '치피저 -4.2% | 아군 공격력 강화 +2.5%', 2.5, 0),
  braceletOption('치명타 피해 저항 감소+아군 공격력 강화', '상', '치피저 -4.8% | 아군 공격력 강화 +3.0%', 3.0, 0),
  braceletOption('보호 효과 대상 피해', '하', '보호 효과 대상 적주피 +1.1% | 아군 공격력 강화 +2.0%', 1.1, 0),
  braceletOption('보호 효과 대상 피해', '중', '보호 효과 대상 적주피 +1.3% | 아군 공격력 강화 +2.5%', 1.3, 0),
  braceletOption('보호 효과 대상 피해', '상', '보호 효과 대상 적주피 +1.5% | 아군 공격력 강화 +3.0%', 1.5, 0),
  braceletOption('보호 및 회복 효과', '하', '보호 및 회복 효과 +2.5%', 2.5, 0),
  braceletOption('보호 및 회복 효과', '중', '보호 및 회복 효과 +3.0%', 3.0, 0),
  braceletOption('보호 및 회복 효과', '상', '보호 및 회복 효과 +3.5%', 3.5, 0),
  braceletOption('아군 공격력 강화 효과', '하', '아군 공격력 강화 효과 +4.0%', 4.0, 0),
  braceletOption('아군 공격력 강화 효과', '중', '아군 공격력 강화 효과 +5.0%', 5.0, 0),
  braceletOption('아군 공격력 강화 효과', '상', '아군 공격력 강화 효과 +6.0%', 6.0, 0),
  braceletOption('아군 피해량 강화 효과', '하', '아군 피해량 강화 효과 +6.0%', 6.0, 0),
  braceletOption('아군 피해량 강화 효과', '중', '아군 피해량 강화 효과 +7.5%', 7.5, 0),
  braceletOption('아군 피해량 강화 효과', '상', '아군 피해량 강화 효과 +9.0%', 9.0, 0),
];

export const BRACELET_STAT_TYPES = ['없음', '힘', '민첩', '지능', '특화', '치명', '신속', '제압', '인내', '숙련', '체력'] as const;
export type BraceletStatType = typeof BRACELET_STAT_TYPES[number];

export interface BraceletStatOption {
  type: BraceletStatType;
  value: number;
}

export const EMPTY_BRACELET_STAT: BraceletStatOption = { type: '없음', value: 0 };

export const findBraceletOption = (label: string): BraceletOption | undefined =>
  BRACELET_OPTIONS.find((item) => item.label === label);

export const findBraceletOptionByEffect = (type: string, value: number): BraceletOption | undefined =>
  BRACELET_OPTIONS.find((item) => item.type === type && Math.abs(item.value - value) < 0.01);
