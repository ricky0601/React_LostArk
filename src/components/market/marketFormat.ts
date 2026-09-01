export const formatGold = (value?: number | null): string =>
  value == null || value <= 0 ? '-' : `${value.toLocaleString()}G`;
