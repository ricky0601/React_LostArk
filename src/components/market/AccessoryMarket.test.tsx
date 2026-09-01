import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fetchAuctionItems } from '../../utils/api';
import AccessoryMarket from './AccessoryMarket';
import { getCachedAuctionOptions } from './marketOptionsCache';

vi.mock('../../utils/api', () => ({ fetchAuctionItems: vi.fn() }));
vi.mock('./marketOptionsCache', () => ({ getCachedAuctionOptions: vi.fn() }));

const mockedFetchAuctionItems = vi.mocked(fetchAuctionItems);
const mockedGetCachedAuctionOptions = vi.mocked(getCachedAuctionOptions);

const optionValue = (displayValue: string, value: number) => ({ DisplayValue: displayValue, Value: value, IsPercentage: true });
const options = {
  MaxItemLevel: 1700,
  ItemGradeQualities: [],
  Categories: [{
    Code: 200000,
    CodeName: '장신구',
    Subs: [
      { Code: 200010, CodeName: '목걸이', Subs: null },
      { Code: 200020, CodeName: '귀걸이', Subs: null },
      { Code: 200030, CodeName: '반지', Subs: null },
    ],
  }],
  ItemGrades: ['유물', '고대'],
  ItemTiers: [4],
  Classes: [],
  EtcOptions: [{
    Value: 7,
    Text: '연마 효과',
    Tiers: [4],
    EtcSubs: [
      { Value: 42, Text: '적에게 주는 피해 증가', Class: '', Categorys: [200010], Tiers: null, EtcValues: [optionValue('2.00%', 200), optionValue('1.20%', 120), optionValue('0.55%', 55)] },
      { Value: 41, Text: '추가 피해', Class: '', Categorys: [200010], Tiers: null, EtcValues: [optionValue('2.60%', 260), optionValue('1.60%', 160), optionValue('0.70%', 70)] },
      { Value: 53, Text: '공격력 +', Class: '', Categorys: [200010], Tiers: null, EtcValues: [optionValue('390', 390), optionValue('195', 195), optionValue('80', 80)] },
    ],
  }],
};

const auctionItem = {
  Name: '고대 목걸이',
  Grade: '고대',
  Tier: 4,
  Level: 1680,
  Icon: 'https://example.com/accessory.png',
  GradeQuality: 95,
  AuctionInfo: {
    StartPrice: 100,
    BuyPrice: 1000,
    BidPrice: 0,
    EndDate: '2099-01-01T00:00:00Z',
    BidCount: 0,
    BidStartPrice: 100,
    IsCompetitive: false,
    TradeAllowCount: 2,
  },
  Options: [
    { Type: 'ACCESSORY_UPGRADE', OptionName: '적에게 주는 피해 증가', OptionNameTripod: '', Value: 2, IsPenalty: false, ClassName: null, IsValuePercentage: true },
    { Type: 'ACCESSORY_UPGRADE', OptionName: '전투 중 생명력 회복량', OptionNameTripod: '', Value: 10, IsPenalty: false, ClassName: null, IsValuePercentage: false },
    { Type: 'ACCESSORY_UPGRADE', OptionName: '추가 피해', OptionNameTripod: '', Value: 2.6, IsPenalty: false, ClassName: null, IsValuePercentage: true },
    { Type: 'STAT', OptionName: '힘', OptionNameTripod: '', Value: 16000, IsPenalty: false, ClassName: null },
    { Type: 'STAT', OptionName: '민첩', OptionNameTripod: '', Value: 16000, IsPenalty: false, ClassName: null },
    { Type: 'STAT', OptionName: '지능', OptionNameTripod: '', Value: 16000, IsPenalty: false, ClassName: null },
    { Type: 'STAT', OptionName: '체력', OptionNameTripod: '', Value: 3500, IsPenalty: false, ClassName: null },
  ],
};

describe('AccessoryMarket', () => {
  beforeEach(() => {
    mockedFetchAuctionItems.mockReset();
    mockedGetCachedAuctionOptions.mockReset();
  });

  it('searches exact tier 4 honing grades with an optional third effect', async () => {
    mockedGetCachedAuctionOptions.mockResolvedValue(options);
    mockedFetchAuctionItems.mockResolvedValue({ PageNo: 1, PageSize: 10, TotalCount: 1, Items: [auctionItem] });

    render(<AccessoryMarket />);

    expect(await screen.findByRole('combobox', { name: '장신구 등급' })).toHaveValue('고대');
    expect(screen.queryByText('티어')).not.toBeInTheDocument();
    expect(within(screen.getByRole('combobox', { name: '장신구 옵션 2' })).getByRole('option', { name: '적에게 주는 피해 증가' })).toBeDisabled();
    expect(within(screen.getByRole('combobox', { name: '장신구 옵션 1' })).getByRole('option', { name: '추가 피해' })).toBeDisabled();
    const thirdOption = screen.getByRole('combobox', { name: '장신구 옵션 3' });
    expect(thirdOption).toHaveValue('');
    const firstSelectionInThird = within(thirdOption).getByRole('option', { name: '적에게 주는 피해 증가' });
    const secondSelectionInThird = within(thirdOption).getByRole('option', { name: '추가 피해' });
    expect(firstSelectionInThird).toBeDisabled();
    expect(firstSelectionInThird).toHaveStyle({ color: 'rgb(156, 163, 175)' });
    expect(secondSelectionInThird).toBeDisabled();
    expect(secondSelectionInThird).toHaveStyle({ color: 'rgb(156, 163, 175)' });
    expect(within(thirdOption).getByRole('option', { name: '공격력 +' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox', { name: '장신구 옵션 1 등급' }), { target: { value: '200' } });
    fireEvent.change(screen.getByRole('combobox', { name: '장신구 옵션 2 등급' }), { target: { value: '260' } });
    fireEvent.change(thirdOption, { target: { value: '7:53' } });
    fireEvent.change(screen.getByRole('combobox', { name: '장신구 옵션 3 등급' }), { target: { value: '390' } });
    fireEvent.click(screen.getByRole('button', { name: '장신구 검색' }));

    await waitFor(() => expect(mockedFetchAuctionItems).toHaveBeenCalledTimes(1));
    expect(mockedFetchAuctionItems).toHaveBeenCalledWith(expect.objectContaining({
      CategoryCode: 200010,
      ItemTier: 4,
      ItemGrade: '고대',
      EtcOptions: [
        { FirstOption: 7, SecondOption: 42, MinValue: 200, MaxValue: 200 },
        { FirstOption: 7, SecondOption: 41, MinValue: 260, MaxValue: 260 },
        { FirstOption: 7, SecondOption: 53, MinValue: 390, MaxValue: 390 },
      ],
    }));
    const results = await screen.findByRole('region', { name: '장신구 검색 결과' });
    expect(results).toHaveTextContent('전투 중 생명력 회복량 하');
    expect(within(results).getByText('힘\/민\/지 16,000')).toBeInTheDocument();
  });

  it('locks search filters while a request is loading', async () => {
    mockedGetCachedAuctionOptions.mockResolvedValue(options);
    mockedFetchAuctionItems.mockImplementation(() => new Promise(() => {}));

    render(<AccessoryMarket />);

    await screen.findByRole('combobox', { name: '장신구 등급' });
    fireEvent.click(screen.getByRole('button', { name: '장신구 검색' }));

    expect(screen.getByRole('tab', { name: '반지' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '장신구 등급' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '장신구 검색' })).toBeDisabled();
  });
});
