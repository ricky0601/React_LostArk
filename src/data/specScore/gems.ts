import type { GemEfficiencyEntry } from './types';

/**
 * 시즌3 보석 효율 — tier-aware 공식 (2026-05 검증 기준)
 *
 * 보석 종류 & 공식:
 *   T3 멸화 (피해)   = 3 × level [예외: 9렙 30%, 10렙 40%]
 *   T4 겁화 (피해)   = 4 × (level + 1)
 *   T3 홍염 (쿨감)   = 2 × level
 *   T4 작열 (쿨감)   = 2 × (level + 2)
 *   T4 기본 공격력 (모든 T4 공통 누적): 2-3렙 +0.05/단계, 4-5렙 +0.1, 6-7렙 +0.15, 8-10렙 +0.2
 *   겁화 지원 효과   = level (선형, 서폿 버프력)
 *   광휘 (T4)        = 조율로 겁화/작열 효과 선택 — 수치는 동일
 *
 * 출처:
 *   - 인벤 99061 (T3 멸화 vs T4 겁화 공식)
 *   - 스토브 13112 (보석 조율 시스템 공지)
 *   - 게임톡 91886 (기본 공격력 표)
 *   - 나무위키 로스트아크/성장
 */

/** 보석 종류별 효율 계산기 — tier 분기 필수 */
export const calcDamageEfficiency = (level: number, tier: 'T3' | 'T4'): number => {
  if (level <= 0) return 0;
  if (tier === 'T4') return 4 * (level + 1); // 겁화 / 광휘(피해 조율)
  // T3 멸화 — 9·10레벨 비선형 예외
  if (level === 9) return 30;
  if (level === 10) return 40;
  return 3 * level;
};

export const calcCooldownEfficiency = (level: number, tier: 'T3' | 'T4'): number => {
  if (level <= 0) return 0;
  if (tier === 'T4') return 2 * (level + 2); // 작열 / 광휘(쿨감 조율)
  return 2 * level; // T3 홍염
};

/** T4 보석 공통 기본 공격력 (누적). T3는 0. */
export const calcBaseAttackEfficiency = (level: number, tier: 'T3' | 'T4'): number => {
  if (tier !== 'T4' || level <= 1) return 0;
  // 누적 테이블: 2렙 0.05, 3렙 0.10, 4렙 0.20, 5렙 0.30, 6렙 0.45, 7렙 0.60, 8렙 0.80, 9렙 1.00, 10렙 1.20
  const table: Record<number, number> = {
    2: 0.05, 3: 0.10, 4: 0.20, 5: 0.30, 6: 0.45, 7: 0.60, 8: 0.80, 9: 1.00, 10: 1.20,
  };
  return table[level] ?? 0;
};

/** 겁화 지원 효과 % (서폿 버프력). 광휘 서폿 조율 시 동일. */
export const calcSupportEfficiency = (level: number): number => Math.max(0, level);

/**
 * 통합 효율 객체 — tier 알고 있을 때만 정확. 호환성 유지용.
 * 우선적으로 위의 개별 calc* 함수들 사용 권장.
 */
export const getGemEfficiency = (level: number, tier: 'T3' | 'T4' = 'T4'): GemEfficiencyEntry => ({
  level,
  damage: calcDamageEfficiency(level, tier),
  cooldown: calcCooldownEfficiency(level, tier),
  baseAttack: calcBaseAttackEfficiency(level, tier),
  supportEffect: calcSupportEfficiency(level),
});

/**
 * 보석 종류 판별
 * - damage: 멸화 / 겁화 (피해 증가) — 광휘 보석에서 피해 조율 시 동일 처리
 * - cooldown: 홍염 / 작열 (쿨다운 감소) — 광휘에서 쿨감 조율 시 동일 처리
 * - glow: 광휘의 보석 — Tooltip이 없거나 조율 미감지 시
 *
 * LOA API의 GemItem.Name은 HTML 마크업으로 감싸진 형태:
 *   "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>9레벨 광휘의 보석</FONT></P>"
 * 또는 "(귀속)" 접미사 포함. stripGemName으로 plain 텍스트 추출 후 매칭.
 *
 * 광휘 보석의 조율 타입은 Tooltip 안의 텍스트로 결정:
 *   "피해 X% 증가" → damage / "재사용 대기시간 X% 감소" → cooldown / "아군 X 강화 효과 증가" → support
 */
export type GemType = 'damage' | 'cooldown' | 'glow' | 'unknown';
export type GemTier = 'T3' | 'T4';

/** HTML 태그/속성/(귀속) 제거하고 보석 본명만 추출 */
export const stripGemName = (raw: string): string =>
  raw
    .replace(/<[^>]+>/g, '') // HTML 태그 제거
    .replace(/\(귀속\)/g, '') // 귀속 표기 제거
    .replace(/\s+/g, ' ')
    .trim();

const stripGemTooltip = (raw: string): string =>
  raw.replace(/<[^>]+>/g, ' ').replace(/\\n/g, ' ').replace(/\s+/g, ' ');

/**
 * 광휘 보석 Tooltip에서 조율 타입 감지
 * - 피해 N% 증가 패턴 → damage
 * - 재사용 대기시간 N% 감소 패턴 → cooldown
 * - 아군 강화 효과 / 지원 효과 증가 패턴 → support (hasSupport=true)
 */
export const detectGlowAttunement = (
  tooltip: string,
): { type: GemType; hasSupport: boolean } => {
  if (!tooltip) return { type: 'glow', hasSupport: false };
  const text = stripGemTooltip(tooltip);
  const hasSupport = /아군.*(?:공격력|피해량|보호막|치유).*강화|지원\s*효과/.test(text);
  if (/피해\s*\d+(?:\.\d+)?\s*%?\s*증가/.test(text)) {
    return { type: 'damage', hasSupport };
  }
  if (/재사용\s*대기시간\s*\d+(?:\.\d+)?\s*%?\s*감소/.test(text)) {
    return { type: 'cooldown', hasSupport };
  }
  if (hasSupport) return { type: 'damage', hasSupport: true };
  return { type: 'glow', hasSupport: false };
};

export const classifyGem = (
  rawName: string,
  tooltip?: string,
): { type: GemType; tier: GemTier; hasSupport: boolean } => {
  const name = stripGemName(rawName);
  if (name.includes('광휘')) {
    const { type, hasSupport } = detectGlowAttunement(tooltip ?? '');
    return { type, tier: 'T4', hasSupport };
  }
  if (name.includes('겁화')) return { type: 'damage', tier: 'T4', hasSupport: true };
  if (name.includes('작열')) return { type: 'cooldown', tier: 'T4', hasSupport: false };
  if (name.includes('멸화')) return { type: 'damage', tier: 'T3', hasSupport: false };
  if (name.includes('홍염')) return { type: 'cooldown', tier: 'T3', hasSupport: false };
  return { type: 'unknown', tier: 'T3', hasSupport: false };
};

/**
 * 보석 1개의 환산 점수
 * 쿨감(cooldown)은 직접 % 단위가 아니므로 DPS 환산 계수(0.6) 적용한다.
 * — 0.6은 일반 5스킬 로테이션 기준 경험적 값. 룩북에 따라 달라질 수 있음.
 */
export const COOLDOWN_DPS_FACTOR = 0.6;

export const calcDealerGemValue = (gemName: string, level: number): number => {
  const eff = getGemEfficiency(level);
  const { type, tier } = classifyGem(gemName);
  const baseAttackBonus = tier === 'T4' ? eff.baseAttack : 0;
  if (type === 'damage') return eff.damage + baseAttackBonus;
  if (type === 'cooldown') return eff.cooldown * COOLDOWN_DPS_FACTOR + baseAttackBonus;
  // 광휘는 조율 전이라 type 미정 — baseAttack만 적용
  return baseAttackBonus;
};

export const calcSupporterGemValue = (gemName: string, level: number): number => {
  const eff = getGemEfficiency(level);
  const { type, tier, hasSupport } = classifyGem(gemName);
  const supportBonus = hasSupport ? eff.supportEffect : 0;
  const cooldownBonus = type === 'cooldown' ? eff.cooldown * 0.9 : 0;
  const baseAttackBonus = tier === 'T4' ? eff.baseAttack * 0.1 : 0;
  return supportBonus + cooldownBonus + baseAttackBonus;
};
