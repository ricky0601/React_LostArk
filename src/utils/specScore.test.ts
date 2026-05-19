import { calcSpecScore, extractComponents, combineSpecScore } from './specScore';
import { classifyGem } from '../data/specScore/gems';
import { findCardSet } from '../data/specScore/cardSets';
import type { CharacterProfile, EngravingData, GemData, ArkPassiveEffect, GemItem, EngravingEffect, CardData } from '../types/lostark';

// ─────────────────────────────────────────────────────────────
// 픽스처 헬퍼
// ─────────────────────────────────────────────────────────────

const makeProfile = (overrides: Partial<CharacterProfile> = {}): CharacterProfile => ({
  CharacterImage: '',
  CharacterName: 'TestChar',
  CharacterClassName: '버서커',
  CharacterLevel: 60,
  ItemAvgLevel: '1,700.00',
  ItemMaxLevel: '1,700.00',
  ServerName: '루페온',
  Title: null,
  GuildName: null,
  ExpeditionLevel: 100,
  PvpGradeName: '브론즈',
  TownLevel: null,
  TownName: '',
  UsingSkillPoint: 400,
  TotalSkillPoint: 420,
  Stats: [
    { Type: '치명', Value: '1500', Tooltip: [] },
    { Type: '특화', Value: '500', Tooltip: [] },
    { Type: '신속', Value: '200', Tooltip: [] },
  ],
  Tendencies: [],
  CombatPower: null,
  ...overrides,
});

const arkEffect = (Name: string, Level: number, Description = ''): ArkPassiveEffect => ({
  AbilityStoneLevel: null,
  Grade: '유물',
  Level,
  Name,
  Description,
});

const makeEngravings = (
  arkPassiveEffects: ArkPassiveEffect[] = [],
  cardEffects: EngravingEffect[] = [],
): EngravingData => ({
  Engravings: [],
  Effects: cardEffects,
  ArkPassiveEffects: arkPassiveEffects,
});

const gem = (Name: string, Level: number, Slot = 0): GemItem => ({
  Slot,
  Name,
  Icon: '',
  Level,
  Grade: '유물',
  Tooltip: '',
});

const makeGems = (gems: GemItem[] = []): GemData => ({
  Gems: gems,
  Effects: null,
});

const makeCards = (effectName: string, through: 'Items' | 'CardEffects' = 'Items'): CardData => ({
  Cards: null,
  Effects: [
    through === 'Items'
      ? {
          Index: 0,
          CardEffects: [],
          Items: [{ Name: effectName, Icon: '' }],
        }
      : {
          Index: 0,
          CardEffects: [{ Index: 0, Name: effectName, Description: '' }],
          Items: [],
        },
  ],
});

// ─────────────────────────────────────────────────────────────
// extractComponents — 컴포넌트 분리 검증
// ─────────────────────────────────────────────────────────────

describe('extractComponents — 컴포넌트 분리', () => {
  it('빈 캐릭터: 모든 컴포넌트 0, 베이스 아이템레벨만', () => {
    const profile = makeProfile({
      ItemAvgLevel: '1,500.00',
      Stats: [
        { Type: '치명', Value: '0', Tooltip: [] },
        { Type: '특화', Value: '0', Tooltip: [] },
        { Type: '신속', Value: '0', Tooltip: [] },
      ],
    });
    const c = extractComponents(profile, makeEngravings(), makeGems());
    expect(c.classAwakening).toBe(0);
    expect(c.commonEngraving).toBe(0);
    expect(c.gemDamage).toBe(0);
    expect(c.gemCooldown).toBe(0);
    expect(c.gemBaseAttack).toBe(0);
    expect(c.gemSupportEffect).toBe(0);
    expect(c.cardSet).toBe(0);
    expect(c.statPercent).toBe(0);
    expect(c.role).toBe('dealer');
    expect(c.meta.itemLevel).toBe(1500);
  });

  it('직업각인 단계 누적: 광기 4단계 = 38%', () => {
    const profile = makeProfile({ CharacterClassName: '버서커' });
    const eng = makeEngravings([arkEffect('광기', 4)]);
    const c = extractComponents(profile, eng, makeGems());
    expect(c.classAwakening).toBe(38);
    expect(c.role).toBe('dealer');
    expect(c.meta.awakeningId).toBe('광기');
  });

  it('공용각인 단계: 원한 8단계(유물4) = 36%', () => {
    const profile = makeProfile();
    const eng = makeEngravings([arkEffect('원한', 8)]);
    const c = extractComponents(profile, eng, makeGems());
    expect(c.commonEngraving).toBe(36);
  });

  it('보석 종류별 분리: 멸화/홍염/겁화/작열 (tier-aware 공식)', () => {
    const profile = makeProfile();
    const gems = makeGems([
      gem('10레벨 멸화의 보석', 10),    // T3 damage = 40 (3×10 예외)
      gem('10레벨 홍염의 보석', 10),    // T3 cooldown = 20 (2×10)
      gem('10레벨 겁화의 보석', 10),    // T4 damage = 44 (4×11) + support
      gem('10레벨 작열의 보석', 10),    // T4 cooldown = 24 (2×12)
    ]);
    const c = extractComponents(profile, makeEngravings(), gems);
    expect(c.gemDamage).toBe(40 + 44);          // 멸화 40 + 겁화 44
    expect(c.gemCooldown).toBe(20 + 24);        // 홍염 20 + 작열 24
    expect(c.gemBaseAttack).toBeCloseTo(1.2 + 1.2, 5); // T4 두 개 (겁화 + 작열)
    expect(c.gemSupportEffect).toBe(10);        // 겁화만 (10레벨 = 10)
  });

  it('카드 세트: 세구빛 30각 = +15%', () => {
    const profile = makeProfile();
    const eng = makeEngravings([], [
      { Name: '세상을 구하는 빛', Description: '6세트 (30각성합계): ...' },
    ]);
    const c = extractComponents(profile, eng, makeGems());
    expect(c.cardSet).toBe(15);
  });

  it('카드 세트: Cards API의 접미사 포함 세트명을 정규화해 매칭한다', () => {
    const c = extractComponents(
      makeProfile(),
      makeEngravings(),
      makeGems(),
      undefined,
      makeCards('세상을 구하는 빛 6세트 (30각성합계)'),
    );
    expect(findCardSet('세상을 구하는 빛 6세트 (30각성합계)')?.id).toBe('세상을 구하는 빛');
    expect(c.cardSet).toBe(15);
  });

  it('카드 세트: Cards API가 하나도 매칭되지 않으면 기존 engraving 카드 fallback을 유지한다', () => {
    const c = extractComponents(
      makeProfile(),
      makeEngravings([], [{ Name: '세상을 구하는 빛', Description: '6세트 (30각성합계): ...' }]),
      makeGems(),
      undefined,
      makeCards('알 수 없는 카드 세트 6세트 (30각성합계)'),
    );
    expect(c.cardSet).toBe(15);
    expect(c.meta.missingData).toContain('카드 API 응답은 있으나 매칭된 세트 없음');
  });

  it('카드 세트: Cards API가 매칭되면 기존 engraving fallback 대신 신규 값을 사용한다', () => {
    const c = extractComponents(
      makeProfile(),
      makeEngravings([], [{ Name: '세상을 구하는 빛', Description: '6세트 (30각성합계): ...' }]),
      makeGems(),
      undefined,
      makeCards('알고 보면 6세트 (18각성합계)'),
    );
    expect(c.cardSet).toBe(5);
  });

  it('카드 세트: Cards API는 같은 세트의 여러 누적 행 중 가장 높은 각성만 점수화한다', () => {
    const cards: CardData = {
      Cards: null,
      Effects: [
        {
          Index: 0,
          CardEffects: [],
          Items: [
            { Name: '세상을 구하는 빛 6세트 (18각성합계)', Icon: '' },
            { Name: '세상을 구하는 빛 6세트 (30각성합계)', Icon: '' },
          ],
        },
      ],
    };
    const c = extractComponents(makeProfile(), makeEngravings(), makeGems(), undefined, cards);
    expect(c.cardSet).toBe(15);
  });

  it('카드 세트: Cards API 12각은 0점이어도 매칭 성공으로 처리해 legacy fallback을 덮는다', () => {
    const c = extractComponents(
      makeProfile(),
      makeEngravings([], [{ Name: '세상을 구하는 빛', Description: '6세트 (30각성합계): ...' }]),
      makeGems(),
      undefined,
      makeCards('세상을 구하는 빛 6세트 (12각성합계)'),
    );
    expect(c.cardSet).toBe(0);
    expect(c.meta.rawDebug.cardsApi[0]).toMatchObject({ matched: true, matchedAwakening: 12 });
  });

  it('광휘 보석: 지원 전용 툴팁은 damage가 아니지만 supportEffect 점수는 유지한다', () => {
    const supportGlow = gem('10레벨 광휘의 보석', 10);
    supportGlow.Tooltip = '아군 공격력 강화 효과 증가';
    const classified = classifyGem(supportGlow.Name, supportGlow.Tooltip);
    const c = extractComponents(makeProfile(), makeEngravings(), makeGems([supportGlow]));
    expect(classified).toEqual({ type: 'glow', tier: 'T4', hasSupport: true });
    expect(c.gemDamage).toBe(0);
    expect(c.gemSupportEffect).toBe(10);
  });

  it('스탯 환산: 절정 창술사 특화 = 큰 점수, 절제 창술사 치명 = 큰 점수', () => {
    const baseStats = [
      { Type: '치명', Value: '1000', Tooltip: [] },
      { Type: '특화', Value: '1000', Tooltip: [] },
      { Type: '신속', Value: '0', Tooltip: [] },
    ];
    const jeolJeong = extractComponents(
      makeProfile({ CharacterClassName: '창술사', Stats: baseStats }),
      makeEngravings([arkEffect('절정', 4)]),
      makeGems(),
    );
    const jeolJe = extractComponents(
      makeProfile({ CharacterClassName: '창술사', Stats: baseStats }),
      makeEngravings([arkEffect('절제', 4)]),
      makeGems(),
    );
    // 절정: 특화 1.0 × 0.07 × 1000 + 치명 0.3 × 0.035 × 1000 = 70 + 10.5 = 80.5
    // 절제: 치명 1.0 × 0.035 × 1000 + 특화 0.2 × 0.07 × 1000 = 35 + 14 = 49
    expect(jeolJeong.statPercent).toBeGreaterThan(jeolJe.statPercent);
  });

  it('서폿 인식: 심판자 홀리나이트 → role=supporter', () => {
    const profile = makeProfile({ CharacterClassName: '홀리나이트' });
    const eng = makeEngravings([arkEffect('심판자', 4)]);
    const c = extractComponents(profile, eng, makeGems());
    expect(c.role).toBe('supporter');
  });

  it('직업각인 분기: 같은 직업, 다른 각인이 다른 점수 산출', () => {
    const baseProfile = makeProfile({
      CharacterClassName: '창술사',
      Stats: [
        { Type: '치명', Value: '1000', Tooltip: [] },
        { Type: '특화', Value: '1000', Tooltip: [] },
        { Type: '신속', Value: '500', Tooltip: [] },
      ],
    });
    const jeolJeong = extractComponents(
      baseProfile,
      makeEngravings([arkEffect('절정', 4)]),
      makeGems(),
    );
    const jeolJe = extractComponents(
      baseProfile,
      makeEngravings([arkEffect('절제', 4)]),
      makeGems(),
    );
    // 절정: 특화 1.0 우선 → 같은 특화 1000도 더 큰 환산
    // 절제: 치명 1.0 우선 → 같은 치명 1000도 더 큰 환산
    // 두 캐릭이 같은 스탯이지만 awakeningId에 따라 statPercent가 다름
    expect(jeolJeong.statPercent).not.toBeCloseTo(jeolJe.statPercent, 1);
    expect(jeolJeong.meta.awakeningId).toBe('절정');
    expect(jeolJe.meta.awakeningId).toBe('절제');
  });

  it('데이터 미확보 각인은 missingData에 기록', () => {
    const profile = makeProfile();
    const eng = makeEngravings([arkEffect('번개의 분노', 4)]); // stages: []
    const c = extractComponents(profile, eng, makeGems());
    expect(c.commonEngraving).toBe(0);
    expect(c.meta.missingData).toContain('공용각인 데이터 없음: 번개의 분노');
  });
});

// ─────────────────────────────────────────────────────────────
// combineSpecScore — 점수 산출 모델 검증
// ─────────────────────────────────────────────────────────────

describe('combineSpecScore — 곱연산 점수 모델', () => {
  const empty = {
    classAwakening: 0,
    commonEngraving: 0,
    gemDamage: 0,
    gemCooldown: 0,
    gemBaseAttack: 0,
    gemSupportEffect: 0,
    cardSet: 0,
    statPercent: 0,
    role: 'dealer' as const,
    meta: { className: '버서커', itemLevel: 1500, missingData: [] },
  };

  it('빈 캐릭터 1500: 곱셈 1.0 × 1000 + 0 = 1000', () => {
    expect(combineSpecScore(empty)).toBe(1000);
  });

  it('아이템 레벨 1700: +300 베이스 보너스', () => {
    const c = { ...empty, meta: { ...empty.meta, itemLevel: 1700 } };
    expect(combineSpecScore(c)).toBe(1000 + 300); // (1700-1500)*1.5
  });

  it('아이템 레벨 1500 미만은 베이스 보너스 0', () => {
    const c = { ...empty, meta: { ...empty.meta, itemLevel: 1400 } };
    expect(combineSpecScore(c)).toBe(1000);
  });

  it('곱연산 검증: 두 컴포넌트 각 +10% = 1.1×1.1=1.21 (합산 +20%와 다름)', () => {
    const c = { ...empty, classAwakening: 10, commonEngraving: 10 };
    // 1.0 × 1.1 × 1.1 = 1.21 → 1210
    expect(combineSpecScore(c)).toBe(1210);
  });

  it('딜러: 보석 종합 = damage×0.5 + cooldown×0.6 + baseAttack', () => {
    const c = {
      ...empty,
      gemDamage: 100,
      gemCooldown: 100,
      gemBaseAttack: 5,
    };
    // gemTotal = 100×0.5 + 100×0.6 + 5 = 115
    // mult = 1.0 × 2.15 = 2.15 → 2150
    expect(combineSpecScore(c)).toBe(2150);
  });

  it('서폿: 보석 종합 = supportEffect + cooldown×0.9', () => {
    const c = {
      ...empty,
      role: 'supporter' as const,
      gemSupportEffect: 50,
      gemCooldown: 100,
    };
    // gemTotal = 50 + 100×0.9 = 140
    // mult = 1.0 × 2.4 = 2.4 → 2400
    expect(combineSpecScore(c)).toBe(2400);
  });

  it('종결 딜러 시나리오: 합산 vs 곱연산 차이 검증', () => {
    const c = {
      ...empty,
      classAwakening: 38,   // 광기 4단계
      commonEngraving: 80,  // 원한 36 + 아드 14 + 돌대 13 + 질량 13 + 저인 13 - 일부 = ~80
      gemDamage: 200,       // 10겁 × 5 = 200
      gemCooldown: 100,     // 10작 × 5 = 100
      gemBaseAttack: 6,     // T4 5개 × 1.2 = 6
      cardSet: 15,          // 세구빛 30각
      statPercent: 80,      // 1700+ 스탯
      meta: { ...empty.meta, itemLevel: 1700 },
    };
    const score = combineSpecScore(c);
    // mult = 1.38 × 1.80 × (1 + (200×0.5 + 100×0.6 + 6)/100) × 1.15 × 1.80
    //      = 1.38 × 1.80 × 2.66 × 1.15 × 1.80 ≈ 13.69
    // score = round(13690 + 300) ≈ 13990
    // 종결자가 이정도 점수면 정상 (비현실적으로 낮지 않음)
    expect(score).toBeGreaterThan(5000);
    expect(score).toBeLessThan(20000);
  });
});

// ─────────────────────────────────────────────────────────────
// calcSpecScore — 통합 시나리오
// ─────────────────────────────────────────────────────────────

describe('calcSpecScore — 통합 캐릭터 시나리오', () => {
  it('입문 1500 버서커: 점수가 베이스(1000) 근처', () => {
    const profile = makeProfile({
      CharacterClassName: '버서커',
      ItemAvgLevel: '1,500.00',
      Stats: [
        { Type: '치명', Value: '0', Tooltip: [] },
        { Type: '특화', Value: '0', Tooltip: [] },
        { Type: '신속', Value: '0', Tooltip: [] },
      ],
    });
    const { score } = calcSpecScore(profile, makeEngravings(), makeGems());
    expect(score).toBeGreaterThanOrEqual(1000);
    expect(score).toBeLessThan(1100);
  });

  it('중간 1620 광기 버서커: 베이스 1180 + 광기 단계 + 보석', () => {
    const profile = makeProfile({
      CharacterClassName: '버서커',
      ItemAvgLevel: '1,620.00',
      Stats: [
        { Type: '치명', Value: '800', Tooltip: [] },
        { Type: '특화', Value: '600', Tooltip: [] },
        { Type: '신속', Value: '0', Tooltip: [] },
      ],
    });
    const eng = makeEngravings([
      arkEffect('광기', 4),
      arkEffect('원한', 6), // 유물 2단계 = 24.75
      arkEffect('아드레날린', 6),
    ]);
    const gems = makeGems([
      gem('7레벨 멸화의 보석', 7),
      gem('7레벨 홍염의 보석', 7),
    ]);
    const { score, breakdown } = calcSpecScore(profile, eng, gems);
    expect(breakdown.role).toBe('dealer');
    expect(breakdown.classAwakening).toBe(38);
    expect(score).toBeGreaterThan(1500);
    expect(score).toBeLessThan(5000);
  });

  it('종결 1700 절정 창술사: 절정은 특화 가중치 1.0', () => {
    const profile = makeProfile({
      CharacterClassName: '창술사',
      ItemAvgLevel: '1,700.00',
      Stats: [
        { Type: '치명', Value: '500', Tooltip: [] },
        { Type: '특화', Value: '2000', Tooltip: [] },
        { Type: '신속', Value: '500', Tooltip: [] },
      ],
    });
    const eng = makeEngravings([
      arkEffect('절정', 4),
      arkEffect('원한', 8), // 유물 4단계 = 36
    ]);
    const { breakdown } = calcSpecScore(profile, eng, makeGems());
    // 인게임 공식: (point × 0.03 × weight) — 절정: 특화 1.0, 신속 0.8, 치명 0.3
    // statPct = 2000×0.03×1.0 + 500×0.03×0.3 + 500×0.03×0.8 = 60 + 4.5 + 12 = 76.5
    expect(breakdown.statPercent).toBeGreaterThan(70);
    expect(breakdown.statPercent).toBeLessThan(85);
  });

  it('서폿 시나리오: 심판자 홀리나이트 + 겁화 + 남바절', () => {
    const profile = makeProfile({
      CharacterClassName: '홀리나이트',
      ItemAvgLevel: '1,700.00',
      Stats: [
        { Type: '치명', Value: '100', Tooltip: [] },
        { Type: '특화', Value: '600', Tooltip: [] },
        { Type: '신속', Value: '1800', Tooltip: [] },
      ],
    });
    const eng = makeEngravings(
      [arkEffect('심판자', 4)],
      [{ Name: '남겨진 바람의 절벽', Description: '6세트 (30각성합계): ...' }],
    );
    const gems = makeGems([
      gem('10레벨 겁화의 보석', 10),
      gem('10레벨 겁화의 보석', 10),
      gem('10레벨 겁화의 보석', 10),
      gem('10레벨 작열의 보석', 10),
      gem('10레벨 작열의 보석', 10),
    ]);
    const { score, breakdown } = calcSpecScore(profile, eng, gems);
    expect(breakdown.role).toBe('supporter');
    expect(breakdown.gemSupportEffect).toBe(30); // 겁화 3개 × supportEffect(10) = 30
    expect(breakdown.gemCooldown).toBe(48);      // 작열 2개 × cooldown(2×12=24) = 48
    expect(breakdown.gemDamage).toBe(132);       // 겁화 3개 × damage(4×11=44) — 서폿 점수에는 반영 안됨
    expect(breakdown.cardSet).toBe(3.5);          // 남바절 30각
    expect(score).toBeGreaterThan(1500);
  });
});
