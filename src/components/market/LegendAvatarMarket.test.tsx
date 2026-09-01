import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fetchMarketItems } from '../../utils/api';
import { getCachedMarketOptions } from './marketOptionsCache';
import LegendAvatarMarket from './LegendAvatarMarket';

vi.mock('../../utils/api', () => ({ fetchMarketItems: vi.fn() }));
vi.mock('./marketOptionsCache', () => ({ getCachedMarketOptions: vi.fn() }));

const mockedFetchMarketItems = vi.mocked(fetchMarketItems);
const mockedGetCachedMarketOptions = vi.mocked(getCachedMarketOptions);

const parts = [
  { Code: 30001, CodeName: '무기', Subs: null },
  { Code: 30002, CodeName: '머리', Subs: null },
  { Code: 30003, CodeName: '상의', Subs: null },
  { Code: 30004, CodeName: '하의', Subs: null },
];

describe('LegendAvatarMarket', () => {
  beforeEach(() => {
    mockedFetchMarketItems.mockReset();
    mockedGetCachedMarketOptions.mockReset();
  });

  it('loads the four legendary avatar parts only after search is pressed', async () => {
    mockedGetCachedMarketOptions.mockResolvedValue({
      Categories: [{ Code: 30000, CodeName: '아바타', Subs: parts }],
      ItemGrades: ['전설'],
      ItemTiers: [],
      Classes: ['슬레이어'],
    });
    mockedFetchMarketItems.mockImplementation(async (_name, categoryCode) => ({
      PageNo: 1,
      PageSize: 10,
      TotalCount: 1,
      Items: [{
        Id: categoryCode,
        Name: `아바타 ${categoryCode}`,
        Grade: '전설',
        Icon: 'https://example.com/avatar.png',
        BundleCount: 1,
        TradeRemainCount: null,
        YDayAvgPrice: null,
        RecentPrice: 900,
        CurrentMinPrice: 1000,
      }],
    }));

    render(<LegendAvatarMarket />);

    expect(await screen.findByRole('combobox', { name: '전설 아바타 직업' })).toHaveValue('슬레이어');
    expect(mockedFetchMarketItems).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '아바타 검색' }));

    await waitFor(() => expect(mockedFetchMarketItems).toHaveBeenCalledTimes(4));
    expect(mockedFetchMarketItems.mock.calls.map((call) => call[1])).toEqual([30001, 30002, 30003, 30004]);
    expect(await screen.findByText('아바타 30004')).toBeInTheDocument();
  });

  it('locks the class selector while a search is loading', async () => {
    mockedGetCachedMarketOptions.mockResolvedValue({
      Categories: [{ Code: 30000, CodeName: '아바타', Subs: parts }],
      ItemGrades: ['전설'],
      ItemTiers: [],
      Classes: ['버서커', '바드'],
    });
    mockedFetchMarketItems.mockImplementation(() => new Promise(() => {}));

    render(<LegendAvatarMarket />);

    await screen.findByRole('combobox', { name: '전설 아바타 직업' });
    fireEvent.click(screen.getByRole('button', { name: '아바타 검색' }));

    expect(screen.getByRole('combobox', { name: '전설 아바타 직업' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '아바타 검색' })).toBeDisabled();
  });
});
