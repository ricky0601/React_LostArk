import { buildAccessoryRequest, buildBraceletRequest } from './marketSearch';
import type { AuctionOptionsResponse } from '../../utils/api';

const options: AuctionOptionsResponse = {
  MaxItemLevel: 1700,
  ItemGradeQualities: [0, 10],
  ItemGrades: ['유물', '고대'],
  ItemTiers: [3, 4],
  Classes: [],
  Categories: [{
    Code: 200000,
    CodeName: '장비',
    Subs: [
      { Code: 200010, CodeName: '장신구', Subs: [
        { Code: 200011, CodeName: '목걸이' },
        { Code: 200012, CodeName: '귀걸이' },
      ] },
      { Code: 200020, CodeName: '팔찌' },
    ],
  }],
  EtcOptions: [
    {
      Value: 1,
      Text: '전투 특성',
      Tiers: [4],
      EtcSubs: [
        { Value: 15, Text: '치명', Class: '', Categorys: null, Tiers: null, EtcValues: null },
        { Value: 16, Text: '특화', Class: '', Categorys: [200000], Tiers: [4], EtcValues: [] },
      ],
    },
    {
      Value: 4,
      Text: '팔찌 옵션 수량',
      Tiers: [4],
      EtcSubs: [
        { Value: 2, Text: '부여 효과 수량', Class: '', Categorys: null, Tiers: null, EtcValues: null },
      ],
    },
    {
      Value: 7,
      Text: '아크 패시브',
      Tiers: [4],
      EtcSubs: [
        { Value: 71, Text: '추가 피해', Class: '', Categorys: [200011], Tiers: [4], EtcValues: [] },
      ],
    },
  ],
};

describe('market auction filter conversion', () => {
  it('builds an accessory request from category and option codes returned by auctions/options', () => {
    expect(buildAccessoryRequest({
      part: '목걸이',
      tier: 4,
      grade: '고대',
      quality: 80,
      tradeAllowCount: 2,
      options: [{ firstOption: 7, secondOption: 71, minValue: 2, maxValue: 3 }],
      sortCondition: 'ASC',
      pageNo: 2,
    }, options)).toEqual({
      CategoryCode: 200011,
      ItemTier: 4,
      ItemGrade: '고대',
      ItemGradeQuality: 80,
      ItemTradeAllowCount: 2,
      EtcOptions: [{ FirstOption: 7, SecondOption: 71, MinValue: 2, MaxValue: 3 }],
      PageNo: 2,
      Sort: 'BUY_PRICE',
      SortCondition: 'ASC',
    });
  });

  it('resolves bracelet stat codes when optional API filter arrays are null', () => {
    expect(buildBraceletRequest({
      tier: 4,
      grade: '고대',
      stats: [
        { name: '치명', minValue: 80, maxValue: 120 },
        { name: '특화', minValue: 90, maxValue: 110 },
      ],
      assignedEffectCount: 3,
      sortCondition: 'DESC',
      pageNo: 1,
    }, options)).toMatchObject({
      CategoryCode: 200020,
      EtcOptions: [
        { FirstOption: 1, SecondOption: 15, MinValue: 80, MaxValue: 120 },
        { FirstOption: 1, SecondOption: 16, MinValue: 90, MaxValue: 110 },
        { FirstOption: 4, SecondOption: 2, MinValue: 3, MaxValue: 3 },
      ],
      Sort: 'BUY_PRICE',
      SortCondition: 'DESC',
    });
  });
});
