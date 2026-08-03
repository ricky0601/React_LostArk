import type { AvatarItem, CharacterProfile, EquipmentItem } from '../../types/lostark';
import {
  fetchArkGrid,
  fetchArkPassive,
  fetchAvatars,
  fetchCards,
  fetchEngravings,
  fetchEquipment,
  fetchGems,
} from '../../utils/api';
import { fetchSpecScoreRawData } from './specScoreSimulatorParsing';

jest.mock('../../utils/api', () => ({
  fetchArkGrid: jest.fn(),
  fetchArkPassive: jest.fn(),
  fetchAvatars: jest.fn(),
  fetchCards: jest.fn(),
  fetchEngravings: jest.fn(),
  fetchEquipment: jest.fn(),
  fetchGems: jest.fn(),
}));

const profile: CharacterProfile = {
  CharacterImage: '',
  CharacterName: '테스트캐릭터',
  CharacterClassName: '버서커',
  CharacterLevel: 70,
  ItemAvgLevel: '1700.00',
  ItemMaxLevel: '1700.00',
  ServerName: '루페온',
  Title: null,
  GuildName: null,
  ExpeditionLevel: 300,
  PvpGradeName: '',
  TownLevel: null,
  TownName: '',
  UsingSkillPoint: 480,
  TotalSkillPoint: 480,
  Stats: [
    { Type: '공격력', Value: '100,000', Tooltip: [] },
    { Type: '치명', Value: '1,800', Tooltip: [] },
    { Type: '특화', Value: '600', Tooltip: [] },
    { Type: '신속', Value: '400', Tooltip: [] },
  ],
  Tendencies: [],
  CombatPower: null,
};

const equipment = (type: string, effect: string): EquipmentItem => ({
  Type: type,
  Name: `테스트 ${type}`,
  Icon: '',
  Grade: '고대',
  Tooltip: JSON.stringify({
    Element_005: {
      type: 'ItemPartBox',
      value: {
        Element_000: '기본 효과',
        Element_001: effect,
      },
    },
  }),
});

const avatar = (isInner: boolean, effect: string): AvatarItem => ({
  Type: '무기 아바타',
  Name: '테스트 아바타',
  Icon: '',
  Grade: '영웅',
  IsSet: false,
  IsInner: isInner,
  Tooltip: JSON.stringify({
    Element_005: {
      type: 'ItemPartBox',
      value: {
        Element_000: '기본 효과',
        Element_001: effect,
      },
    },
  }),
});

const malformedEquipment: EquipmentItem = {
  Type: '투구',
  Name: '깨진 장비',
  Icon: '',
  Grade: '고대',
  Tooltip: '{',
};

const malformedAvatar: AvatarItem = {
  Type: '무기 아바타',
  Name: '깨진 아바타',
  Icon: '',
  Grade: '영웅',
  IsSet: false,
  IsInner: true,
  Tooltip: '{',
};

const setupApiMocks = (items: readonly EquipmentItem[], avatars: readonly AvatarItem[]): void => {
  jest.mocked(fetchEngravings).mockResolvedValue({ Engravings: null, Effects: null, ArkPassiveEffects: null });
  jest.mocked(fetchGems).mockResolvedValue({ Gems: null, Effects: null });
  jest.mocked(fetchArkPassive).mockResolvedValue({ IsArkPassive: true, Points: null, Effects: null });
  jest.mocked(fetchArkGrid).mockResolvedValue({ Slots: null, Effects: null });
  jest.mocked(fetchCards).mockResolvedValue({ Cards: null, Effects: null });
  jest.mocked(fetchEquipment).mockResolvedValue([...items]);
  jest.mocked(fetchAvatars).mockResolvedValue([...avatars]);
};

describe('fetchSpecScoreRawData main stat parsing', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('populates displayed main stat from equipment raw stat and active inner avatar multipliers', async () => {
    // Given
    setupApiMocks(
      [
        equipment('투구', '힘 +100,000'),
        equipment('목걸이', '힘 +20,000'),
        equipment('팔찌', "힘 <FONT COLOR='#99ff99'>+11,904</FONT>"),
      ],
      [
        avatar(true, '힘 +2.00%'),
        avatar(true, '힘 +2.00%'),
        avatar(true, '힘 +2.00%'),
        avatar(true, '힘 +2.00%'),
      ],
    );

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(fetchAvatars).toHaveBeenCalledWith('테스트캐릭터');
    expect(result.charStats.avatarMainStatMultiplier).toBeCloseTo(1.08, 6);
    expect(result.charStats.petMainStatMultiplier).toBe(1.01);
    expect(result.charStats.displayedMainStat).toBe(143_775);
  });

  it('counts only the armor-inferred main stat label from accessory triple-label effects', async () => {
    // Given
    setupApiMocks(
      [
        equipment('투구', '힘 +100,000'),
        equipment(
          '귀걸이',
          "힘 +10,000<BR><FONT COLOR='#787878'>민첩 +10,000</FONT><BR><FONT COLOR='#787878'>지능 +10,000</FONT>",
        ),
        equipment('팔찌', "힘 <FONT COLOR='#99ff99'>+11,904</FONT>"),
      ],
      [avatar(true, '힘 +2.00%')],
    );

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(result.charStats.avatarMainStatMultiplier).toBeCloseTo(1.02, 6);
    expect(result.charStats.petMainStatMultiplier).toBe(1.01);
    expect(result.charStats.displayedMainStat).toBe(125_561);
  });

  it('ignores non-inner disabled avatars when calculating avatar multiplier', async () => {
    // Given
    setupApiMocks(
      [equipment('투구', '힘 +100,000')],
      [avatar(true, '힘 +2.00%'), avatar(false, '힘 +1.00%')],
    );

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(result.charStats.avatarMainStatMultiplier).toBeCloseTo(1.02, 6);
    expect(result.charStats.petMainStatMultiplier).toBe(1.01);
    expect(result.charStats.displayedMainStat).toBe(103_000);
  });

  it('leaves parsed main stat fields unset when tooltip JSON is malformed and no raw stat exists', async () => {
    // Given
    setupApiMocks([malformedEquipment], [malformedAvatar]);

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(result.charStats.displayedMainStat).toBeUndefined();
    expect(result.charStats.avatarMainStatMultiplier).toBeUndefined();
    expect(result.charStats.petMainStatMultiplier).toBeUndefined();
  });

  it('leaves parsed main stat fields unset when armor does not identify the active label', async () => {
    // Given
    setupApiMocks(
      [
        equipment(
          '귀걸이',
          "힘 +10,000<BR><FONT COLOR='#787878'>민첩 +10,000</FONT><BR><FONT COLOR='#787878'>지능 +10,000</FONT>",
        ),
      ],
      [avatar(true, '힘 +2.00%')],
    );

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(result.charStats.displayedMainStat).toBeUndefined();
    expect(result.charStats.avatarMainStatMultiplier).toBeUndefined();
    expect(result.charStats.petMainStatMultiplier).toBeUndefined();
  });
});


describe('fetchSpecScoreRawData weapon attack parsing', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('includes Parkbitina standalone bracelet weapon attack in effective weapon attack', async () => {
    // Given
    const accessory: EquipmentItem = {
      Type: '반지',
      Name: '테스트 반지 1',
      Icon: '',
      Grade: '고대',
      Tooltip: JSON.stringify({
        Element_005: {
          type: 'ItemPartBox',
          value: {
            Element_000: '연마 효과',
            Element_001: '무기 공격력 <FONT>+195</FONT>',
          },
        },
      }),
    };
    const bracelet: EquipmentItem = {
      Type: '팔찌',
      Name: '테스트 팔찌',
      Icon: '',
      Grade: '고대',
      Tooltip: JSON.stringify({
        Element_005: {
          type: 'ItemPartBox',
          value: {
            Element_000: '팔찌 효과',
            Element_001:
              '무기 공격력이   7,200.0 증가한다.<BR>체력이 50% 이상일 경우 무기 공격력이 2,000.0 증가한다.',
          },
        },
      }),
    };
    setupApiMocks([
      equipment('무기', '무기 공격력 +241,367'),
      accessory,
      { ...accessory, Name: '테스트 반지 2' },
      bracelet,
    ], []);
    jest.mocked(fetchArkPassive).mockResolvedValue({
      IsArkPassive: true,
      Points: [{ Name: '깨달음', Value: 0, Tooltip: '', Description: '6랭크 64레벨' }],
      Effects: null,
    });

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(result.bracelet?.options[0]).toMatchObject({
      type: '무기 공격력',
      value: 7200,
      combatPowerIncreasePercent: 0,
    });
    expect(result.bracelet?.options[1]).toMatchObject({
      type: '체력 조건 무공 버프',
      value: 2000,
      combatPowerIncreasePercent: 0.54,
    });
    expect(result.charStats.weaponAttackPercentSum).toBeCloseTo(6.4, 6);
    expect(result.charStats.effectiveWeaponAttack).toBeCloseTo(264_890.248, 3);
  });

  it('does not invent the 97-stone base attack fallback for ordinary stones', async () => {
    // Given
    setupApiMocks([
      equipment('무기', '무기 공격력 +100,000'),
      equipment('어빌리티 스톤', '공격력 +100'),
    ], []);
    jest.mocked(fetchEngravings).mockResolvedValue({
      Engravings: null,
      Effects: null,
      ArkPassiveEffects: [
        { AbilityStoneLevel: 2, Description: '', Grade: '유물', Level: 3, Name: '원한' },
        { AbilityStoneLevel: 2, Description: '', Grade: '유물', Level: 3, Name: '아드레날린' },
      ],
    });

    // When
    const result = await fetchSpecScoreRawData(profile);

    // Then
    expect(result.charStats.baseAttackPercentSum).toBe(0);
  });
});
