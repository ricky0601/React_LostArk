import { fireEvent, render, screen } from '@testing-library/react';
import DualRangeSlider from './DualRangeSlider';

describe('DualRangeSlider', () => {
  it('reports both handles and prevents them from crossing', () => {
    const onChange = vi.fn();
    render(
      <DualRangeSlider
        label="치명"
        min={0}
        max={120}
        minValue={40}
        maxValue={100}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('40 ~ 100')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: '치명 최소값' }), { target: { value: '90' } });
    fireEvent.change(screen.getByRole('slider', { name: '치명 최대값' }), { target: { value: '20' } });

    expect(onChange).toHaveBeenNthCalledWith(1, 90, 100);
    expect(onChange).toHaveBeenNthCalledWith(2, 40, 40);
  });
});
