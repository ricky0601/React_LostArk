import { roundToTwoDecimals } from './numberFormat';

describe('roundToTwoDecimals', () => {
  it('rounds floating point values that sit just below the visible cent boundary', () => {
    expect(roundToTwoDecimals(4971.999999999999)).toBe(4972);
  });

  it('keeps API combat power decimals unchanged', () => {
    expect(roundToTwoDecimals(1234.56)).toBe(1234.56);
  });
});
