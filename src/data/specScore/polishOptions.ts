/**
 * 장신구 연마 효과 (Polish Effects) 데이터
 *
 * 한건뜬 (발키리, 빛의 기사) 캐릭터에서 lopec.kr 시뮬레이터 측정
 * 2026-05-18 기준. 5개 슬롯 × 3개 polish position = 15개 polish slot.
 *
 * 각 polish slot은 33개 옵션 중 1개 선택 (없음 + 24개 effect):
 *   - % 옵션 6종 × 3 grade = 18
 *   - 절대값 옵션 2종 × 3 grade = 6
 *
 * 계수 출처: 각 옵션을 단독으로 적용 후 baseline (없음) 대비 cp ratio 측정.
 *
 * 클래스 일반화:
 *   - 적주피, 공격력 % : ratio = X/100 (universal, 캐릭터 무관)
 *   - 추피, 치적, 치피 : 한건뜬 baseline (~30% 추피, 65% 치적) 기준. 다른 빌드 ±10% 오차
 *   - 무기공격력 %, 절대값 : 캐릭터 W 의존 (한건뜬 W=208130 기준)
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
  /** 단독 적용 시 cp ratio (한건뜬 측정) */
  cpRatio: number;
}

/** 24개 effect + 없음 = 25개 옵션 */
export const POLISH_OPTIONS: PolishOption[] = [
  { type: '없음', grade: '하', label: '없음', value: 0, cpRatio: 1.0 },

  { type: '추가 피해', grade: '하', label: '추가 피해 +0.70%', value: 0.70, cpRatio: 1.00538 },
  { type: '추가 피해', grade: '중', label: '추가 피해 +1.60%', value: 1.60, cpRatio: 1.01231 },
  { type: '추가 피해', grade: '상', label: '추가 피해 +2.60%', value: 2.60, cpRatio: 1.02000 },

  { type: '적에게 주는 피해', grade: '하', label: '적에게 주는 피해 +0.55%', value: 0.55, cpRatio: 1.00550 },
  { type: '적에게 주는 피해', grade: '중', label: '적에게 주는 피해 +1.20%', value: 1.20, cpRatio: 1.01200 },
  { type: '적에게 주는 피해', grade: '상', label: '적에게 주는 피해 +2.00%', value: 2.00, cpRatio: 1.02000 },

  { type: '무기 공격력', grade: '하', label: '무기 공격력 +0.80%', value: 0.80, cpRatio: 1.00376 },
  { type: '무기 공격력', grade: '중', label: '무기 공격력 +1.80%', value: 1.80, cpRatio: 1.00844 },
  { type: '무기 공격력', grade: '상', label: '무기 공격력 +3.00%', value: 3.00, cpRatio: 1.01402 },

  { type: '공격력', grade: '하', label: '공격력 +0.40%', value: 0.40, cpRatio: 1.00400 },
  { type: '공격력', grade: '중', label: '공격력 +0.95%', value: 0.95, cpRatio: 1.00950 },
  { type: '공격력', grade: '상', label: '공격력 +1.55%', value: 1.55, cpRatio: 1.01550 },

  { type: '치명타 적중률', grade: '하', label: '치명타 적중률 +0.40%', value: 0.40, cpRatio: 1.00310 },
  { type: '치명타 적중률', grade: '중', label: '치명타 적중률 +0.95%', value: 0.95, cpRatio: 1.00736 },
  { type: '치명타 적중률', grade: '상', label: '치명타 적중률 +1.55%', value: 1.55, cpRatio: 1.01200 },

  { type: '치명타 피해', grade: '하', label: '치명타 피해 +1.10%', value: 1.10, cpRatio: 1.00330 },
  { type: '치명타 피해', grade: '중', label: '치명타 피해 +2.40%', value: 2.40, cpRatio: 1.00720 },
  { type: '치명타 피해', grade: '상', label: '치명타 피해 +4.00%', value: 4.00, cpRatio: 1.01200 },

  // 절대값 옵션
  { type: '무기 공격력_abs', grade: '하', label: '무기 공격력 +195', value: 195, cpRatio: 1.00047 },
  { type: '무기 공격력_abs', grade: '중', label: '무기 공격력 +480', value: 480, cpRatio: 1.00115 },
  { type: '무기 공격력_abs', grade: '상', label: '무기 공격력 +960', value: 960, cpRatio: 1.00230 },

  { type: '공격력_abs', grade: '하', label: '공격력 +80', value: 80, cpRatio: 1.00056 },
  { type: '공격력_abs', grade: '중', label: '공격력 +195', value: 195, cpRatio: 1.00136 },
  { type: '공격력_abs', grade: '상', label: '공격력 +390', value: 390, cpRatio: 1.00273 },
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
