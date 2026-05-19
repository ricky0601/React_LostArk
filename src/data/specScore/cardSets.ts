import type { CardSetEntry } from './types';

/**
 * 카드 세트 효과 — 시즌3 기준 누적 딜증가율(%) 환산
 *
 * 6세트(12/18/24/30 각성합계) 효과만 점수에 반영. 2~6세트의 속성 피감은
 * 방어 옵션이므로 점수 산정에서 제외.
 *
 * 딜러 세트: 30각 = "자신 피해" 누적 (속성 변환 + 누적 15%)
 * 서폿 세트: 30각 = "파티 디버프" 누적 (3.5%, 단 파티 딜러 3인에게 적용)
 *
 * 출처: namu.wiki/로스트아크/카드 (직접 확인, 2026-05 기준)
 */
export const CARD_SETS: CardSetEntry[] = [
  // === 5.1.1. 딜러용 종결 ===
  {
    id: '세상을 구하는 빛',
    awakening: { 12: 0, 18: 7, 24: 11, 30: 15 },
    role: 'dealer',
    note: '세구빛(성속성). 12각=성속성 변환, 18각=+7%, 24각=+4%, 30각=+4% (누적 15%)',
  },
  {
    id: '카제로스의 군단장',
    awakening: { 12: 0, 18: 7, 24: 11, 30: 15 },
    role: 'dealer',
    note: '암구빛(암속성). 세구빛과 동일 패턴. 1730 루멘칼리고/지평의 성당에서 사용',
  },
  {
    id: '날랜 뇌전의 숨결',
    awakening: { 12: 0, 18: 7, 24: 11, 30: 15 },
    role: 'dealer',
    note: '뇌속성 변환. 2막 아브렐슈드 / 크라티오스(1720)',
  },
  {
    id: '굳센 대지의 숨결',
    awakening: { 12: 0, 18: 7, 24: 11, 30: 15 },
    role: 'dealer',
    note: '토속성 변환. 3막 3관 모르둠 / 스콜라키아(1680)',
  },
  {
    id: '거센 파도의 숨결',
    awakening: { 12: 0, 18: 7, 24: 11, 30: 15 },
    role: 'dealer',
    note: '수속성 변환. 현재 사용처 없음 (스토리 2부 대기)',
  },
  {
    id: '힘찬 화염의 숨결',
    awakening: { 12: 0, 18: 7, 24: 11, 30: 15 },
    role: 'dealer',
    note: '화속성 변환. 4막 2관 아르모체 / 베스칼(1580) / 드렉탈라스(1700)',
  },

  // === 5.1.2. 서포터용 종결 (파티 디버프 누적치) ===
  {
    id: '남겨진 바람의 절벽',
    awakening: { 12: 0, 18: 1.0, 24: 2.0, 30: 3.5 },
    role: 'supporter',
    note: '남바절(성속성). 12각=치적 +7%, 18~30각=파티 성속성 피해 +1.0/1.0/1.5%',
  },
  {
    id: '신념의 길',
    awakening: { 12: 0, 18: 1.0, 24: 2.0, 30: 3.5 },
    role: 'supporter',
    note: '신길(암속성). 2026-04-22 신규. 12각=방어력 +4%',
  },
  {
    id: '몰아치는 뇌전의 가호',
    awakening: { 12: 0, 18: 1.0, 24: 2.0, 30: 3.5 },
    role: 'supporter',
    note: '뇌속성 가호. 12각=이동속도 +8%',
  },
  {
    id: '잠재우는 대지의 가호',
    awakening: { 12: 0, 18: 1.0, 24: 2.0, 30: 3.5 },
    role: 'supporter',
    note: '토속성 가호. 12각=무력화 +8%',
  },
  {
    id: '노래하는 파도의 가호',
    awakening: { 12: 0, 18: 1.0, 24: 2.0, 30: 3.5 },
    role: 'supporter',
    note: '수속성 가호. 12각=마나 회복 +7%',
  },
  {
    id: '피어나는 화염의 가호',
    awakening: { 12: 0, 18: 1.0, 24: 2.0, 30: 3.5 },
    role: 'supporter',
    note: '화속성 가호. 12각=마나 회복 +7%',
  },

  // === 5.3.1. 초보자용 (입문 단계) ===
  {
    id: '알고 보면',
    awakening: { 18: 5, 30: 10 },
    role: 'dealer',
    note: '뉴비 딜러 1차 목표. 18각 후 세구빛으로 갈아탐',
  },
  {
    id: '너는 계획이 다 있구나',
    awakening: { 18: 1.0, 30: 2.0 },
    role: 'supporter',
    note: '너계획. 뉴비 서폿 1차 목표 (남바절 24~30각 징검다리)',
  },

  // === 시즌2 보조/대체 세트 ===
  {
    id: '에어가이츠 계획',
    awakening: { 30: 1.5 },
    role: 'supporter',
    note: '뇌전의 가호 24각 이전 대체. 30각 시 파티 뇌속성 +1.5%',
  },
  {
    id: '대사부의 시험',
    awakening: { 30: 2.5 },
    role: 'supporter',
    note: '대지의 가호 30각 이전 대체. 가디언 루 포함',
  },
  {
    id: '루테란의 시련',
    awakening: { 30: 2.5 },
    role: 'supporter',
    note: '파도의 가호 30각 이전 대체. 에스더 루테란 포함',
  },
];

export const normalizeCardSetName = (name: string): string =>
  name
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\d+세트(?:\s*\([^)]*각성합계\))?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const findCardSet = (id: string): CardSetEntry | undefined => {
  const normalized = normalizeCardSetName(id);
  return CARD_SETS.find(
    (c) => normalized === c.id || normalized.startsWith(`${c.id} `) || id.includes(c.id),
  );
};

export const findCardSetIdInText = (text: string): string | undefined => findCardSet(text)?.id;
