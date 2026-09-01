import { render, screen, within } from '@testing-library/react';
import AuctionResults, { getAuctionGradeImageStyle } from './AuctionResults';
import type { AuctionItem } from '../../utils/api';

const item: AuctionItem = {
  Name: '고대 목걸이',
  Grade: '고대',
  Tier: 4,
  Level: 0,
  Icon: 'https://example.com/accessory.png',
  GradeQuality: 95,
  AuctionInfo: {
    StartPrice: 1000,
    BuyPrice: null,
    BidPrice: 1500,
    EndDate: '2020-01-01T00:00:00Z',
    BidCount: 1,
    BidStartPrice: 1000,
    IsCompetitive: true,
    TradeAllowCount: 2,
  },
  Options: [
    { Type: 'STAT', OptionName: '체력', OptionNameTripod: '', Value: 3470, IsPenalty: false, ClassName: null },
    { Type: 'STAT', OptionName: '민첩', OptionNameTripod: '', Value: 16241, IsPenalty: false, ClassName: null },
    {
      Type: 'ARK_PASSIVE',
      OptionName: '깨달음',
      OptionNameTripod: '',
      Value: 9,
      IsPenalty: false,
      ClassName: null,
      IsValuePercentage: false,
    },
    { Type: 'STAT', OptionName: '힘', OptionNameTripod: '', Value: 16241, IsPenalty: false, ClassName: null },
    { Type: 'ACCESSORY_UPGRADE', OptionName: '전투 중 생명력 회복량', OptionNameTripod: '', Value: 10, IsPenalty: false, ClassName: null, IsValuePercentage: false },
    { Type: 'ACCESSORY_UPGRADE', OptionName: '공격력 ', OptionNameTripod: '', Value: 1.55, IsPenalty: false, ClassName: null, IsValuePercentage: true },
    { Type: 'ACCESSORY_UPGRADE', OptionName: '무기 공격력', OptionNameTripod: '', Value: 480, IsPenalty: false, ClassName: null, IsValuePercentage: false },
    {
      Type: 'ACCESSORY_UPGRADE',
      OptionName: '추가 피해',
      OptionNameTripod: '',
      Value: 2.6,
      IsPenalty: false,
      ClassName: null,
      IsValuePercentage: true,
    },
    { Type: 'STAT', OptionName: '지능', OptionNameTripod: '', Value: 16241, IsPenalty: false, ClassName: null },
  ],
};

describe('AuctionResults', () => {
  it('uses the bracelet grade color for relic and ancient image backgrounds', () => {
    expect(getAuctionGradeImageStyle('유물')).toMatchObject({
      background: 'linear-gradient(135deg, #48220b, #a24006)',
      borderColor: '#a24006',
    });
    expect(getAuctionGradeImageStyle('고대')).toMatchObject({
      background: 'linear-gradient(135deg, #3d3325, #dcc999)',
      borderColor: '#dcc999',
    });
  });

  it('renders core accessory fields and handles nullable price and expired listings', () => {
    render(
      <AuctionResults
        kind="장신구"
        state="success"
        items={[item]}
        error=""
        pageNo={1}
        pageSize={10}
        totalCount={1}
        sortCondition="ASC"
        onPageChange={vi.fn()}
      />,
    );

    const results = screen.getByRole('region', { name: '장신구 검색 결과' });
    expect(within(results).getByText('고대 목걸이')).toBeInTheDocument();
    expect(results.querySelector('img')).toHaveStyle({ background: 'linear-gradient(135deg, #3d3325, #dcc999)' });
    expect(within(results).getByText('품질 95')).toHaveClass('text-[#ce43fc]');
    const honingTiers = within(results).getAllByText('상');
    expect(honingTiers).toHaveLength(2);
    honingTiers.forEach((honingTier) => expect(honingTier).toHaveStyle({ color: 'rgb(251, 160, 38)' }));
    expect(honingTiers[0].parentElement).toHaveTextContent('공격력% 상');
    expect(honingTiers[1].parentElement).toHaveTextContent('추가 피해 상');
    expect(honingTiers[1].parentElement).not.toHaveStyle({ color: 'rgb(251, 160, 38)' });
    expect(within(results).getByText('중')).toHaveStyle({ color: 'rgb(117, 4, 251)' });
    expect(within(results).queryByText(/1.55%|2.6%|깨달음|^힘 |^민첩 |^지능 /)).not.toBeInTheDocument();
    const optionTexts = Array.from(honingTiers[0].parentElement?.parentElement?.children ?? []).map((element) => element.textContent);
    expect(optionTexts).toEqual(['전투 중 생명력 회복량 하', '공격력% 상', '무기 공격력+ 중', '추가 피해 상', '힘/민/지 16,241', '체력 3,470']);
    expect(within(results).getByText('2회')).toBeInTheDocument();
    expect(within(results).getAllByText('만료')).toHaveLength(2);
    expect(within(results).getByText('1,500G')).toBeInTheDocument();
    expect(within(results).getByText('-')).toBeInTheDocument();
  });

  it('applies Lost Ark grade colors to tier 4 ancient bracelet stats in the result list', () => {
    const bracelet: AuctionItem = {
      ...item,
      Name: '찬란한 구원자의 팔찌',
      Options: [
        { Type: 'BRACELET_RANDOM_SLOT', OptionName: '부여 효과 수량', OptionNameTripod: '', Value: 3, IsPenalty: false, ClassName: null },
        { Type: 'STAT', OptionName: '치명', OptionNameTripod: '', Value: 84, IsPenalty: false, ClassName: '' },
        { Type: 'STAT', OptionName: '특화', OptionNameTripod: '', Value: 85, IsPenalty: false, ClassName: '' },
        { Type: 'STAT', OptionName: '신속', OptionNameTripod: '', Value: 103, IsPenalty: false, ClassName: '' },
        { Type: 'STAT', OptionName: '제압', OptionNameTripod: '', Value: 120, IsPenalty: false, ClassName: '' },
      ],
    };

    render(
      <AuctionResults
        kind="팔찌"
        state="success"
        items={[bracelet]}
        error=""
        pageNo={1}
        pageSize={10}
        totalCount={1}
        sortCondition="ASC"
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('치명 84')).toHaveStyle({ color: 'rgb(97, 189, 109)' });
    expect(screen.getByText('특화 85')).toHaveStyle({ color: 'rgb(44, 130, 201)' });
    expect(screen.getByText('신속 103')).toHaveStyle({ color: 'rgb(117, 4, 251)' });
    expect(screen.getByText('제압 120')).toHaveStyle({ color: 'rgb(251, 160, 38)' });
    expect(screen.getByText('부여 효과 3개')).toBeInTheDocument();
    expect(screen.getAllByText(/^(치명|특화|신속|제압|부여 효과)/).map((element) => element.textContent)).toEqual([
      '치명 84',
      '특화 85',
      '신속 103',
      '제압 120',
      '부여 효과 3개',
    ]);
  });
});
