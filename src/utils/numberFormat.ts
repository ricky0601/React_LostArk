export const roundToTwoDecimals = (value: number): number =>
  Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
