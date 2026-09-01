import { fetchAuctionOptions, fetchMarketOptions } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  fetchAuctionOptions: vi.fn(),
  fetchMarketOptions: vi.fn(),
}));

const mockedFetchAuctionOptions = vi.mocked(fetchAuctionOptions);
const mockedFetchMarketOptions = vi.mocked(fetchMarketOptions);

beforeEach(() => {
  vi.resetModules();
  mockedFetchAuctionOptions.mockReset();
  mockedFetchMarketOptions.mockReset();
});

describe('market option cache', () => {
  it('shares one pending auction options request across market tabs', async () => {
    const response = { Categories: [] };
    mockedFetchAuctionOptions.mockResolvedValue(response as never);
    const { getCachedAuctionOptions } = await import('./marketOptionsCache');

    const [first, second] = await Promise.all([getCachedAuctionOptions(), getCachedAuctionOptions()]);

    expect(first).toBe(response);
    expect(second).toBe(response);
    expect(mockedFetchAuctionOptions).toHaveBeenCalledTimes(1);
  });

  it('clears a failed request so auction options can be retried', async () => {
    mockedFetchAuctionOptions
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ Categories: [] } as never);
    const { getCachedAuctionOptions } = await import('./marketOptionsCache');

    await expect(getCachedAuctionOptions()).rejects.toThrow('temporary failure');
    await expect(getCachedAuctionOptions()).resolves.toMatchObject({ Categories: [] });
    expect(mockedFetchAuctionOptions).toHaveBeenCalledTimes(2);
  });

  it('shares one pending market options request for avatar searches', async () => {
    mockedFetchMarketOptions.mockResolvedValue({ Categories: [] } as never);
    const { getCachedMarketOptions } = await import('./marketOptionsCache');

    await Promise.all([getCachedMarketOptions(), getCachedMarketOptions()]);

    expect(mockedFetchMarketOptions).toHaveBeenCalledTimes(1);
  });
});
