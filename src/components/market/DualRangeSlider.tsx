import React from 'react';

type DualRangeSliderProps = {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly minValue: number;
  readonly maxValue: number;
  readonly onChange: (minValue: number, maxValue: number) => void;
};

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  label,
  min,
  max,
  minValue,
  maxValue,
  onChange,
}) => {
  const range = Math.max(max - min, 1);
  const left = ((minValue - min) / range) * 100;
  const right = 100 - ((maxValue - min) / range) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
        <span>수치 범위</span>
        <strong className="rounded-lg bg-la-gold/10 px-2 py-1 text-la-gold-deep dark:text-la-gold">
          {minValue} ~ {maxValue}
        </strong>
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gray-200 dark:bg-white/10" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-la-gold to-la-gold-light"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          aria-label={`${label} 최소값`}
          type="range"
          min={min}
          max={max}
          step="1"
          value={minValue}
          onChange={(event) => onChange(Math.min(Number(event.target.value), maxValue), maxValue)}
          className="dual-range-input"
        />
        <input
          aria-label={`${label} 최대값`}
          type="range"
          min={min}
          max={max}
          step="1"
          value={maxValue}
          onChange={(event) => onChange(minValue, Math.max(Number(event.target.value), minValue))}
          className="dual-range-input"
        />
      </div>
    </div>
  );
};

export default DualRangeSlider;
