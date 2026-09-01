import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fetchAuctionItems } from '../../utils/api';
import { getCachedAuctionOptions } from './marketOptionsCache';
import BraceletMarket from './BraceletMarket';

vi.mock('../../utils/api', () => ({ fetchAuctionItems: vi.fn() }));
vi.mock('./marketOptionsCache', () => ({ getCachedAuctionOptions: vi.fn() }));

const mockedFetchAuctionItems = vi.mocked(fetchAuctionItems);
const mockedGetCachedAuctionOptions = vi.mocked(getCachedAuctionOptions);

const options = {
  MaxItemLevel: 1700,
  ItemGradeQualities: [],
  Categories: [{ Code: 200000, CodeName: '장신구', Subs: [{ Code: 200040, CodeName: '팔찌', Subs: null }] }],
  ItemGrades: ['유물', '고대'],
  ItemTiers: [4],
  Classes: [],
  EtcOptions: [
    {
      Value: 2,
      Text: '전투 특성',
      Tiers: [4],
      EtcSubs: [
        { Value: 15, Text: '치명', Class: '', Categorys: null, Tiers: null, EtcValues: null },
        { Value: 16, Text: '특화', Class: '', Categorys: null, Tiers: null, EtcValues: null },
      ],
    },
    {
      Value: 4,
      Text: '팔찌 옵션 수량',
      Tiers: [4],
      EtcSubs: [{ Value: 2, Text: '부여 효과 수량', Class: '', Categorys: null, Tiers: null, EtcValues: null }],
    },
  ],
};

describe('BraceletMarket', () => {
  beforeEach(() => {
    mockedFetchAuctionItems.mockReset();
    mockedGetCachedAuctionOptions.mockReset();
  });

  it('searches tier 4 with the default dual ranges and assigned effect count', async () => {
    mockedGetCachedAuctionOptions.mockResolvedValue(options);
    mockedFetchAuctionItems.mockResolvedValue({ PageNo: 1, PageSize: 10, TotalCount: 0, Items: [] });

    render(<BraceletMarket />);

    expect(await screen.findByRole('combobox', { name: '팔찌 등급' })).toHaveValue('고대');
    expect(screen.getAllByRole('slider')).toHaveLength(4);
    expect(screen.queryByText('티어')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '팔찌 검색' }));

    await waitFor(() => expect(mockedFetchAuctionItems).toHaveBeenCalledTimes(1));
    expect(mockedFetchAuctionItems).toHaveBeenCalledWith(expect.objectContaining({
      CategoryCode: 200040,
      ItemTier: 4,
      ItemGrade: '고대',
      EtcOptions: [
        { FirstOption: 2, SecondOption: 15, MinValue: 0, MaxValue: 120 },
        { FirstOption: 2, SecondOption: 16, MinValue: 0, MaxValue: 120 },
        { FirstOption: 4, SecondOption: 2, MinValue: 3, MaxValue: 3 },
      ],
    }));
  });

  it('locks search filters while a request is loading', async () => {
    mockedGetCachedAuctionOptions.mockResolvedValue(options);
    mockedFetchAuctionItems.mockImplementation(() => new Promise(() => {}));

    render(<BraceletMarket />);

    await screen.findByRole('combobox', { name: '팔찌 등급' });
    fireEvent.click(screen.getByRole('button', { name: '팔찌 검색' }));

    expect(screen.getByRole('combobox', { name: '팔찌 등급' })).toBeDisabled();
    screen.getAllByRole('slider').forEach((slider) => expect(slider).toBeDisabled());
    expect(screen.getByRole('button', { name: '팔찌 검색' })).toBeDisabled();
  });
});
