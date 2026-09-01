import {
  fetchAuctionOptions,
  fetchMarketOptions,
  type AuctionOptionsResponse,
  type MarketOptionsResponse,
} from '../../utils/api';

let auctionOptionsPromise: Promise<AuctionOptionsResponse> | null = null;
let marketOptionsPromise: Promise<MarketOptionsResponse> | null = null;

export const getCachedAuctionOptions = (): Promise<AuctionOptionsResponse> => {
  if (!auctionOptionsPromise) {
    auctionOptionsPromise = fetchAuctionOptions().catch((error) => {
      auctionOptionsPromise = null;
      throw error;
    });
  }
  return auctionOptionsPromise;
};

export const getCachedMarketOptions = (): Promise<MarketOptionsResponse> => {
  if (!marketOptionsPromise) {
    marketOptionsPromise = fetchMarketOptions().catch((error) => {
      marketOptionsPromise = null;
      throw error;
    });
  }
  return marketOptionsPromise;
};
