import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Market, { EngravingRanking, GemRanking } from './Market';
import { fetchAuctionItems, fetchMarketItems } from '../utils/api';

jest.mock('../components/NavBar', () => () => <div>NavBar</div>);

jest.mock('../utils/api', () => ({
  fetchAuctionItems: jest.fn(),
  fetchMarketItems: jest.fn(),
}));

const mockedFetchAuctionItems = fetchAuctionItems as jest.MockedFunction<typeof fetchAuctionItems>;
const mockedFetchMarketItems = fetchMarketItems as jest.MockedFunction<typeof fetchMarketItems>;

describe('Market ranking states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses shared feedback for loading and empty rankings', () => {
    const { rerender } = render(
      <EngravingRanking
        state={{ status: 'loading', items: [], fetchedAt: null, failedCount: 0 }}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('유물 각인서 시세를 불러오는 중입니다');

    rerender(
      <GemRanking
        state={{ status: 'success', items: [], fetchedAt: null, failedCount: 0 }}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('표시할 보석 시세가 없습니다')).toBeInTheDocument();
  });

  it('offers retry from the shared error feedback', () => {
    const onRetry = jest.fn();

    render(
      <EngravingRanking
        state={{ status: 'error', items: [], fetchedAt: null, failedCount: 0 }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요');
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps compact mobile price and change labels together', () => {
    render(
      <EngravingRanking
        state={{
          status: 'success',
          fetchedAt: null,
          failedCount: 0,
          items: [{
            rank: 1,
            name: '원한',
            itemName: '원한 각인서',
            icon: 'https://example.com/engraving.png',
            price: 12000,
            yDayAvgPrice: 10000,
          }],
        }}
        onRetry={jest.fn()}
      />,
    );

    const mobileRow = screen.getByRole('group', { name: '원한 각인서 모바일 시세' });
    expect(within(mobileRow).getByText('최저가')).toBeInTheDocument();
    expect(within(mobileRow).getByText('전일 평균')).toBeInTheDocument();
    expect(within(mobileRow).getByText('변동')).toBeInTheDocument();
    expect(within(mobileRow).getByText('12,000G')).toBeInTheDocument();
  });

  it('retries the page-level ranking request after an initial failure', async () => {
    mockedFetchAuctionItems.mockResolvedValue({ PageNo: 0, PageSize: 1, TotalCount: 0, Items: [] });
    mockedFetchMarketItems
      .mockRejectedValueOnce(new Error('market unavailable'))
      .mockResolvedValueOnce({
        PageNo: 1,
        PageSize: 50,
        TotalCount: 1,
        Items: [{
          Id: 1,
          Name: '유물 원한 각인서',
          Grade: '유물',
          Icon: 'https://example.com/engraving.png',
          BundleCount: 1,
          TradeRemainCount: null,
          YDayAvgPrice: 1000,
          RecentPrice: 1200,
          CurrentMinPrice: 1200,
        }],
      });

    render(<Market />);

    const retryButton = await screen.findByRole('button', { name: '다시 불러오기' });
    expect(screen.getByRole('alert')).toHaveTextContent('유물 각인서 시세를 불러오지 못했습니다');
    expect(mockedFetchMarketItems).toHaveBeenCalledTimes(1);

    fireEvent.click(retryButton);

    await waitFor(() => expect(mockedFetchMarketItems).toHaveBeenCalledTimes(2));
    expect(await screen.findAllByText('유물 원한 각인서')).toHaveLength(2);
  });
});
