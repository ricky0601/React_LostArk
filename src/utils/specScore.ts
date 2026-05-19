import type {
  CharacterProfile,
  EngravingData,
  GemData,
  ArkPassiveData,
  CardData,
} from '../types/lostark';
import {
  findClassAwakening,
  findCommonEngraving,
  findCardSet,
  getStatWeights,
  classifyGem,
  stripGemName,
  calcDamageEfficiency,
  calcCooldownEfficiency,
  calcBaseAttackEfficiency,
  calcSupportEfficiency,
  CLASS_AWAKENINGS,
  COOLDOWN_DPS_FACTOR,
  type JobRole,
  type StatType,
} from '../data/specScore';

/**
 * 환산 점수 계산기 — 곱연산 모델 (실제 딜증가율 기반)
 *
 * 핵심 원리: 실제 로스트아크 데미지는 각 요소가 "곱연산"으로 결합된다.
 *   DPS = 기본공격력 × (1+각인%) × (1+보석%) × (1+카드%) × (1+스탯환산%)
 * lopec/zloa도 곱연산 모델을 사용. 합연산은 점수 차이를 과소평가한다.
 *
 * 입력 컴포넌트:
 *   - 각인/카드/직업깨달음 = "% 피증 누적" (단순 합)
 *   - 보석 = 4종 분리 (멸화/겁화 damage, 홍염/작열 cooldown, T4 baseAttack, 겁화 supportEffect)
 *   - 스탯 = 직업별 가중치 × 1포인트당 환산 계수 → % 환산
 *
 * 정규화: 입문(1500 이아템) ≈ 1000~1300, 종결자(1700+) ≈ 2500~3000.
 *   itemLevelBase = max(0, ilv - 1500) × 1.5  → 베이스 점수 보정.
 */

/** 스탯 1포인트당 기본 % 환산 계수 (딜러 기준) */
const STAT_DPS_FACTOR: Record<StatType, number> = {
  치명: 0.035, // 치적 % 증가 (치피 50% 가정 시 ≈ 0.0175% 딜증)
  특화: 0.07, // 직업별 평균. 가중치(weights)가 직업별 보정 담당.
  신속: 0.045, // 공속(0.045N%) + 쿨감 통합
  제압: 0.01, // 제압 특화 적 한정 — 평균 효과 미미
  인내: 0.01,
  숙련: 0.01,
};

/** 스탯 1포인트당 % 환산 (서폿 기준 — 버프력 영향) */
const STAT_BUFF_FACTOR: Record<StatType, number> = {
  치명: 0.0, // 서폿은 치명 무의미
  특화: 0.07, // 특화 = 버프력 직접 영향
  신속: 0.04, // 쿨감 → 버프 사이클 단축
  제압: 0,
  인내: 0,
  숙련: 0,
};

/**
 * 멸화/겁화 피해 % 의 "실질 DPS 환산 계수".
 * 보석 피해는 특정 5개 스킬에만 적용되므로 전체 딜 중 일부만 영향.
 * 룩북별로 다르지만 평균 0.5 (5개 스킬 비중) 가정.
 */
const GEM_DAMAGE_DPS_FACTOR = 0.5;

/** 서폿 작열 쿨감 → 버프 사이클 단축 환산 계수 */
const SUPPORTER_COOLDOWN_BUFF_FACTOR = 0.9;

/** 베이스 아이템 레벨 보정 — 1500 이상부터 점수 가산 */
const ITEM_LEVEL_BASE = 1500;
const ITEM_LEVEL_BASE_COEFFICIENT = 1.5;

/** 최종 점수 정규화 계수 (mult → 점수 변환) */
const SCORE_NORMALIZATION = 1000;

export interface SpecScoreComponents {
  /** 직업 깨달음 누적 딜증가율(%) */
  classAwakening: number;
  /** 공용각인 5개 슬롯 누적 딜증가율(%) */
  commonEngraving: number;
  /** 멸화/겁화 합 (피해 %, 보스에게만 적용 가정) */
  gemDamage: number;
  /** 홍염/작열 합 (쿨감 %) */
  gemCooldown: number;
  /** T4 보석 기본 공격력 합 (%) */
  gemBaseAttack: number;
  /** 겁화 지원 효과 합 (% — 서폿 전용) */
  gemSupportEffect: number;
  /** 카드 세트 누적 딜증가율(%) */
  cardSet: number;
  /** 스탯 환산 % (직업 가중치 적용) */
  statPercent: number;
  /** 직업군 (분기용) */
  role: JobRole;
  /** API에서 받아온 인게임 전투력 (점수 base — Delta 모델의 핵심) */
  combatPower: number;
  meta: {
    className: string;
    awakeningId?: string;
    itemLevel: number;
    missingData: string[];
    /** 디버그용 raw API 응답 매핑 결과 */
    rawDebug: {
      arkPassive: Array<{
        name: string;
        level: number;
        grade?: string;
        abilityStoneLevel?: number | null;
        matched: 'class' | 'common' | 'none';
        /** 매칭된 각인의 계산된 % (lopec 비교용) */
        value?: number;
      }>;
      gems: Array<{ name: string; level: number; type: string; tier: string; hasSupport: boolean }>;
      cardEffects: Array<{ name: string; descSnippet: string; matched: boolean; matchedAwakening?: number }>;
      /** ArkPassive API의 raw Effects (직업 깨달음 노드들) */
      arkPassiveApi?: Array<{ tab: string; level: number; nodesFound: string[]; matched: string | null }>;
      /** Cards API의 raw 효과 (세트 효과들) */
      cardsApi?: Array<{ effectName: string; matched: boolean; matchedAwakening?: number }>;
    };
  };
}

export interface SpecScoreResult {
  score: number;
  breakdown: SpecScoreComponents;
}

/**
 * 단계 인덱스 산출 (단순 1-indexed)
 * - 공용각인: 전설 1~4 + 유물 1~4 = 8단계 (Level 1~8)
 * - 직업 깨달음: 1~4단계
 */
const safeStageValue = (stages: number[], level: number, maxStage = 8): number => {
  if (stages.length === 0) return 0;
  const clamped = Math.max(1, Math.min(maxStage, level || 1));
  return stages[Math.min(clamped - 1, stages.length - 1)] ?? 0;
};

/**
 * ArkPassiveEffect의 (Grade, Level, AbilityStoneLevel)을 우리 stages 배열의 인덱스로 변환.
 *
 * 우리 stages 구조: [전설1, 전설2, 전설3, 전설4, 유물1, 유물2, 유물3, 유물4]
 * 인덱스:           0      1      2      3      4      5      6      7
 *
 * - Grade='전설' Level=N → 전설 N단계 → 인덱스 N-1
 * - Grade='유물' Level=0 → 유물 막 unlock, 전설 4단계와 동등 → 인덱스 3
 * - Grade='유물' Level=N (N>0) → 유물 N단계 → 인덱스 3+N
 * - AbilityStoneLevel은 추가 단계 부여 (1~4) → 인덱스에 그대로 더함, 7에서 cap
 */
const arkPassiveStageValue = (
  stages: number[],
  grade: string | undefined,
  level: number,
  abilityStoneLevel: number | null,
): number => {
  if (stages.length === 0) return 0;
  let idx: number;
  if (grade === '유물') {
    idx = level <= 0 ? 3 : 3 + level;
  } else if (grade === '전설') {
    idx = Math.max(0, level - 1);
  } else {
    idx = Math.max(0, (level || 1) - 1);
  }
  const stoneBoost = Math.max(0, Math.min(4, abilityStoneLevel ?? 0));
  idx = Math.min(stages.length - 1, idx + stoneBoost);
  return stages[idx] ?? 0;
};

/**
 * 1+2) ArkPassiveEffects 한 번 순회로 직업 깨달음 + 공용 각인 + role + awakeningId + rawDebug 모두 산출.
 *
 * 시즌3 후반 변경: engravings.ArkPassiveEffects에는 **공용각인만** 들어옴.
 * 직업 깨달음은 별도 `/armories/characters/{name}/arkpassive` API에서 추출 (calcArkPassiveClass).
 */
const calcEngravingScores = (
  profile: CharacterProfile,
  engravings: EngravingData,
  missing: string[],
): {
  classValue: number;
  commonValue: number;
  role: JobRole;
  awakeningId?: string;
  arkPassiveDebug: SpecScoreComponents['meta']['rawDebug']['arkPassive'];
} => {
  const effects = engravings.ArkPassiveEffects ?? [];
  let classValue = 0;
  let commonValue = 0;
  let role: JobRole = 'dealer';
  let awakeningId: string | undefined;
  const arkPassiveDebug: SpecScoreComponents['meta']['rawDebug']['arkPassive'] = [];

  for (const eff of effects) {
    const classEntry = findClassAwakening(eff.Name, profile.CharacterClassName);
    const commonEntry = findCommonEngraving(eff.Name);
    let matched: 'class' | 'common' | 'none' = 'none';
    let contributed: number | undefined;

    if (classEntry) {
      matched = 'class';
      if (!awakeningId) awakeningId = classEntry.id;
      if (classEntry.role === 'supporter') role = 'supporter';
      if (classEntry.stages.length === 0) {
        missing.push(`직업 깨달음 데이터 없음: ${eff.Name}`);
      } else {
        contributed = arkPassiveStageValue(
          classEntry.stages,
          eff.Grade,
          eff.Level,
          eff.AbilityStoneLevel,
        );
        classValue += contributed;
      }
    } else if (commonEntry) {
      matched = 'common';
      if (commonEntry.stages.length === 0) {
        missing.push(`공용각인 데이터 없음: ${eff.Name}`);
      } else {
        contributed = arkPassiveStageValue(
          commonEntry.stages,
          eff.Grade,
          eff.Level,
          eff.AbilityStoneLevel,
        );
        commonValue += contributed;
      }
    } else {
      missing.push(`공용각인 미인식: ${eff.Name}`);
    }

    arkPassiveDebug.push({
      name: eff.Name,
      level: eff.Level,
      grade: eff.Grade,
      abilityStoneLevel: eff.AbilityStoneLevel,
      matched,
      value: contributed,
    });
  }
  return { classValue, commonValue, role, awakeningId, arkPassiveDebug };
};

const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * ArkPassive API에서 직업 깨달음 추출
 * - Effects 배열을 순회, 클래스명과 일치하는 awakening의 키워드를 텍스트에서 검색
 * - Level은 Effects.Level 또는 Description 파싱으로 추출
 */
const calcArkPassiveClass = (
  profile: CharacterProfile,
  arkPassive: ArkPassiveData | undefined,
  missing: string[],
): {
  value: number;
  role: JobRole;
  awakeningId?: string;
  debug: NonNullable<SpecScoreComponents['meta']['rawDebug']['arkPassiveApi']>;
} => {
  if (!arkPassive) {
    missing.push('ArkPassive API 응답 없음');
    return { value: 0, role: 'dealer', debug: [] };
  }

  const effects = arkPassive.Effects ?? [];
  const debug: NonNullable<SpecScoreComponents['meta']['rawDebug']['arkPassiveApi']> = [];
  let role: JobRole = 'dealer';
  let awakeningId: string | undefined;
  let matchedAwakening: ReturnType<typeof CLASS_AWAKENINGS.filter>[number] | null = null;

  // 직업의 직업각인 후보들 (className 매칭)
  const candidates = CLASS_AWAKENINGS.filter((a) => a.className === profile.CharacterClassName);

  // 1패스: 어떤 직업각인 노드가 활성화돼 있는지 + Level 추출
  for (const eff of effects) {
    const plainName = stripHtml(eff.Name);
    const plainDesc = stripHtml(eff.Description);
    const combined = `${plainName} ${plainDesc}`;
    const nodesFound: string[] = [];

    let entryMatched: typeof candidates[number] | null = null;
    for (const cand of candidates) {
      if (combined.includes(cand.id)) {
        nodesFound.push(cand.id);
        if (!entryMatched) entryMatched = cand;
        if (!matchedAwakening) matchedAwakening = cand;
      }
    }
    debug.push({
      tab: plainName,
      level: eff.Level,
      nodesFound,
      matched: entryMatched?.id ?? null,
    });
  }

  let value = 0;
  if (matchedAwakening) {
    awakeningId = matchedAwakening.id;
    if (matchedAwakening.role === 'supporter') role = 'supporter';
    if (matchedAwakening.stages.length === 0) {
      missing.push(`직업 깨달음 데이터 없음: ${matchedAwakening.id}`);
    } else {
      /**
       * 직업 깨달음 단계 추정 — API의 eff.Level이 빈 값이라 다른 시그널 사용:
       * 1. Points에서 '깨달음' 항목의 Value (활성 포인트 수)
       * 2. Effects 중 Tooltip/Description에 'Lv.4' 같은 패턴 검색
       * 3. fallback: 직업각인 노드가 있으면 최대 단계 (4) 가정
       *    — 플레이어가 활성화한 경우 보통 풀 단계.
       */
      const points = arkPassive.Points ?? [];
      const enlightenmentPoint = points.find((p) => p.Name.includes('깨달음'));
      // 보통 깨달음 포인트는 30 → 4단계, 22 → 3단계, 14 → 2단계, 8 → 1단계 (대략)
      let estimatedStage = 4;
      if (enlightenmentPoint) {
        const v = enlightenmentPoint.Value;
        if (v < 10) estimatedStage = 1;
        else if (v < 18) estimatedStage = 2;
        else if (v < 26) estimatedStage = 3;
        else estimatedStage = 4;
      }
      value = safeStageValue(matchedAwakening.stages, estimatedStage, 4);
    }
  } else {
    missing.push(`직업 깨달음 미인식 (${profile.CharacterClassName})`);
  }
  return { value, role, awakeningId, debug };
};

/** 3) 보석 4가지 분리 (damage / cooldown / baseAttack / supportEffect) + 디버그 */
const calcGemBreakdown = (gems: GemData, missing: string[]) => {
  const items = gems.Gems ?? [];
  let damage = 0;
  let cooldown = 0;
  let baseAttack = 0;
  let supportEffect = 0;
  const gemDebug: SpecScoreComponents['meta']['rawDebug']['gems'] = [];

  for (const gem of items) {
    const { type, tier, hasSupport } = classifyGem(gem.Name, gem.Tooltip);
    // tier 기반 공식 적용 — T3/T4 차이 정확 반영
    if (type === 'damage') damage += calcDamageEfficiency(gem.Level, tier);
    if (type === 'cooldown') cooldown += calcCooldownEfficiency(gem.Level, tier);
    if (tier === 'T4') baseAttack += calcBaseAttackEfficiency(gem.Level, tier);
    if (hasSupport) supportEffect += calcSupportEfficiency(gem.Level);
    if (type === 'unknown') missing.push(`보석 미인식: ${stripGemName(gem.Name)}`);
    gemDebug.push({ name: stripGemName(gem.Name), level: gem.Level, type, tier, hasSupport });
  }
  return { damage, cooldown, baseAttack, supportEffect, gemDebug };
};

/** 4) 카드 세트 효과 — engravings.Effects (구) + cards API (신규) 양쪽 처리 */
const calcCardSetScore = (
  engravings: EngravingData,
  cards: CardData | undefined,
  missing: string[],
): {
  value: number;
  cardDebug: SpecScoreComponents['meta']['rawDebug']['cardEffects'];
  cardsApiDebug: NonNullable<SpecScoreComponents['meta']['rawDebug']['cardsApi']>;
} => {
  let value = 0;
  const cardDebug: SpecScoreComponents['meta']['rawDebug']['cardEffects'] = [];
  const cardsApiDebug: NonNullable<SpecScoreComponents['meta']['rawDebug']['cardsApi']> = [];

  // (구) engravings.Effects 경로
  const oldEffects = engravings.Effects ?? [];
  for (const eff of oldEffects) {
    const entry = findCardSet(eff.Name);
    const descSnippet = (eff.Description ?? '').slice(0, 100);
    if (!entry) {
      cardDebug.push({ name: eff.Name, descSnippet, matched: false });
      continue;
    }
    const awakeningLevels = Object.keys(entry.awakening)
      .map(Number)
      .sort((a, b) => b - a) as Array<keyof typeof entry.awakening>;
    const matched = awakeningLevels.find((lvl) => eff.Description.includes(`${lvl}각`));
    if (matched) {
      value += entry.awakening[matched] ?? 0;
      cardDebug.push({ name: eff.Name, descSnippet, matched: true, matchedAwakening: matched });
    } else {
      cardDebug.push({ name: eff.Name, descSnippet, matched: false });
    }
  }

  // 신규 Cards API 경로
  if (cards?.Effects) {
    let cardsApiMatched = 0;
    const highestAwakeningBySet = new Map<string, number>();

    /** 단일 effect 객체에서 매칭 시도 — Name/Description 등 텍스트 필드 통합 검색 */
    const tryMatchCardEffect = (effObj: unknown): void => {
      if (!effObj || typeof effObj !== 'object') return;
      const o = effObj as Record<string, unknown>;
      const candidates = [o.Name, o.Description].filter((x): x is string => typeof x === 'string');
      if (candidates.length === 0) {
        cardsApiDebug.push({
          effectName: `(no text fields) ${JSON.stringify(o).slice(0, 80)}`,
          matched: false,
        });
        return;
      }
      const fullText = candidates.join(' | ');
      const matchedSet = findCardSet(fullText);
      if (!matchedSet) {
        cardsApiDebug.push({ effectName: fullText.slice(0, 80), matched: false });
        return;
      }
      const awakeningLevels = Object.keys(matchedSet.awakening).map(Number) as Array<
        keyof typeof matchedSet.awakening
      >;
      // 각성 단계 매칭 — 높은 단계 우선 (30→24→18→12)
      const sorted = [...awakeningLevels].sort((a, b) => b - a);
      const matchedLvl = sorted.find((lvl) => fullText.includes(`${lvl}각`));
      if (matchedLvl) {
        cardsApiMatched += 1;
        const currentHighest = highestAwakeningBySet.get(matchedSet.id) ?? 0;
        if (matchedLvl > currentHighest) highestAwakeningBySet.set(matchedSet.id, matchedLvl);
        cardsApiDebug.push({
          effectName: fullText.slice(0, 80),
          matched: true,
          matchedAwakening: matchedLvl,
        });
      } else {
        cardsApiDebug.push({ effectName: fullText.slice(0, 80), matched: false });
      }
    };

    for (const setEntry of cards.Effects) {
      // 실제 LOA API 구조: setEntry.Items 배열에 세트 효과들이 들어있음
      // 예: { Index, CardSlots, Items: [{Name: '세상을 구하는 빛 6세트 (30각성합계)', Description}] }
      const items = (setEntry as { Items?: unknown }).Items;
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) tryMatchCardEffect(item);
        continue;
      }
      // 호환: setEntry.CardEffects 배열 (대안 구조)
      const inner = (setEntry as { CardEffects?: unknown }).CardEffects;
      if (Array.isArray(inner) && inner.length > 0) {
        for (const cardEff of inner) tryMatchCardEffect(cardEff);
        continue;
      }
      // 호환: setEntry 자체가 effect 객체
      tryMatchCardEffect(setEntry);
    }

    if (cardsApiMatched > 0) {
      value = 0;
      highestAwakeningBySet.forEach((awakening, setId) => {
        const entry = findCardSet(setId);
        value += entry?.awakening[awakening as keyof typeof entry.awakening] ?? 0;
      });
    } else if (cards.Effects.length > 0) {
      missing.push('카드 API 응답은 있으나 매칭된 세트 없음');
    }
  } else {
    missing.push('Cards API 응답 없음');
  }

  return { value, cardDebug, cardsApiDebug };
};

/**
 * 5) 스탯 % 환산 — 인게임 전투력 공식 기반
 *
 * 인게임 공식: (치+특+신) × 0.03 = % (100포인트당 +3%)
 * 직업별 가중치는 미세 조정용 (1.0 기본, 특화 안쓰는 직업은 0.5 등)
 */
const calcStatPercent = (
  profile: CharacterProfile,
  role: JobRole,
  awakeningId: string | undefined,
): number => {
  const weights = getStatWeights(profile.CharacterClassName, awakeningId);
  const targets: StatType[] = ['치명', '특화', '신속'];
  // 인게임 공식: (합) × 0.03 = %. 직업별 가중치로 미세 조정.
  let value = 0;
  for (const t of targets) {
    const stat = profile.Stats.find((s) => s.Type === t);
    if (!stat) continue;
    const point = Number(stat.Value) || 0;
    const w = weights[t] ?? 0.5;
    value += point * 0.03 * w; // 1포인트당 0.03 × 가중치 %
  }
  // 서폿은 stat 비중이 낮음 (버프력 위주). role 분기 미세 보정.
  if (role === 'supporter') value *= 0.5;
  void STAT_DPS_FACTOR; // 더 이상 사용 안 함 (호환성 유지)
  void STAT_BUFF_FACTOR;
  return value;
};

const parseItemLevel = (s: string): number => Number(s.replace(/,/g, '')) || 0;

/** "4,522.91" 같은 문자열 → 숫자 */
const parseCombatPower = (s: string | null | undefined): number => {
  if (!s) return 0;
  return Number(String(s).replace(/,/g, '')) || 0;
};

/**
 * 점수 컴포넌트 추출 — 데이터 파싱 단계 (결정론적)
 */
export const extractComponents = (
  profile: CharacterProfile,
  engravings: EngravingData,
  gems: GemData,
  arkPassive?: ArkPassiveData,
  cards?: CardData,
): SpecScoreComponents => {
  const missing: string[] = [];
  const {
    commonValue: commonEngraving,
    classValue: classFromEngravings,
    role: roleFromEng,
    awakeningId: awakeningIdFromEng,
    arkPassiveDebug,
  } = calcEngravingScores(profile, engravings, missing);

  // ArkPassive API 우선 — 없으면 engravings.ArkPassiveEffects fallback
  const apResult = calcArkPassiveClass(profile, arkPassive, missing);
  const classAwakening = apResult.value || classFromEngravings;
  const role = apResult.awakeningId ? apResult.role : roleFromEng;
  const awakeningId = apResult.awakeningId ?? awakeningIdFromEng;

  const gemBd = calcGemBreakdown(gems, missing);
  const { value: cardSet, cardDebug, cardsApiDebug } = calcCardSetScore(engravings, cards, missing);
  const statPercent = calcStatPercent(profile, role, awakeningId);

  return {
    classAwakening,
    commonEngraving,
    gemDamage: gemBd.damage,
    gemCooldown: gemBd.cooldown,
    gemBaseAttack: gemBd.baseAttack,
    gemSupportEffect: gemBd.supportEffect,
    cardSet,
    statPercent,
    role,
    combatPower: parseCombatPower(profile.CombatPower),
    meta: {
      className: profile.CharacterClassName,
      awakeningId,
      itemLevel: parseItemLevel(profile.ItemAvgLevel),
      missingData: missing,
      rawDebug: {
        arkPassive: arkPassiveDebug,
        gems: gemBd.gemDebug,
        cardEffects: cardDebug,
        arkPassiveApi: apResult.debug,
        cardsApi: cardsApiDebug,
      },
    },
  };
};

/**
 * 효율 곱셈 인자 계산 — 모든 컴포넌트를 단일 mult로 결합
 *
 * 딜러: mult = ∏(1 + 각 컴포넌트/100) — 보석은 환산 계수 적용 후 합산
 * 서폿: 보석은 supportEffect + cooldown × 0.9
 *
 * Delta 시뮬레이션의 핵심: 현재 mult와 변경 후 mult의 비율로 전투력 변화 예측.
 */
export const calcEfficiencyMult = (c: SpecScoreComponents): number => {
  let mult = 1.0;
  mult *= 1 + c.classAwakening / 100;
  mult *= 1 + c.commonEngraving / 100;
  mult *= 1 + c.cardSet / 100;
  mult *= 1 + c.statPercent / 100;

  if (c.role === 'dealer') {
    const gemTotal =
      c.gemDamage * GEM_DAMAGE_DPS_FACTOR + c.gemCooldown * COOLDOWN_DPS_FACTOR + c.gemBaseAttack;
    mult *= 1 + gemTotal / 100;
  } else {
    const gemTotal = c.gemSupportEffect + c.gemCooldown * SUPPORTER_COOLDOWN_BUFF_FACTOR;
    mult *= 1 + gemTotal / 100;
  }
  return mult;
};

/**
 * 최종 점수 = API의 인게임 전투력 (Delta 모델)
 *
 * 우리는 점수를 새로 산출하지 않고 인게임 값을 그대로 사용.
 * 시뮬레이션 시 simulateSpecScore() 사용.
 */
export const combineSpecScore = (c: SpecScoreComponents): number => {
  if (c.combatPower > 0) return Math.round(c.combatPower);
  // Fallback: combatPower가 0이면 우리 모델로 추정 (구 캐릭터 호환)
  const itemLevelBase =
    Math.max(0, c.meta.itemLevel - ITEM_LEVEL_BASE) * ITEM_LEVEL_BASE_COEFFICIENT;
  return Math.round(calcEfficiencyMult(c) * SCORE_NORMALIZATION + itemLevelBase);
};

/**
 * 시뮬레이션: 현재 → 변경 후 전투력 예측
 *
 * 인게임 전투력 × (변경된 효율곱 / 현재 효율곱)
 * 효율 산출이 정확할수록 시뮬도 정확.
 */
export const simulateSpecScore = (
  current: SpecScoreComponents,
  modified: SpecScoreComponents,
): { current: number; simulated: number; delta: number } => {
  const currentMult = calcEfficiencyMult(current);
  const newMult = calcEfficiencyMult(modified);
  const currentScore = current.combatPower;
  const simulated = currentScore * (newMult / currentMult);
  return {
    current: Math.round(currentScore),
    simulated: Math.round(simulated),
    delta: Math.round(simulated - currentScore),
  };
};

/**
 * 환산 점수 계산 진입점
 */
export const calcSpecScore = (
  profile: CharacterProfile,
  engravings: EngravingData,
  gems: GemData,
  arkPassive?: ArkPassiveData,
  cards?: CardData,
): SpecScoreResult => {
  const breakdown = extractComponents(profile, engravings, gems, arkPassive, cards);
  const score = combineSpecScore(breakdown);
  return { score, breakdown };
};

/** 캐릭터 단위 메모이제이션 캐시 (Compare/Expedition/Simulation 페이지 간 공유) */
const scoreCache = new Map<string, SpecScoreResult>();

export const getCachedSpecScore = (
  characterName: string,
  compute: () => SpecScoreResult,
): SpecScoreResult => {
  const cached = scoreCache.get(characterName);
  if (cached) return cached;
  const result = compute();
  scoreCache.set(characterName, result);
  return result;
};

export const clearSpecScoreCache = (): void => scoreCache.clear();
