import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecScoreCategoryTabs } from './SpecScoreCategoryTabs';
import type { SpecScoreCategory } from './specScoreSimulatorTypes';

const categories = [
  { id: 'all', label: '전체', changedCount: 2, summaryLabel: '총 2개 변경' },
  { id: 'gear', label: '보석 & 장비', count: 17, changedCount: 1, summaryLabel: '11보석 · 6장비' },
] satisfies readonly SpecScoreCategory[];

test('renders section summaries and calls category change with native button behavior', async () => {
  const onCategoryChange = jest.fn();

  render(
    <SpecScoreCategoryTabs
      categories={categories}
      activeCategory="all"
      onCategoryChange={onCategoryChange}
    />,
  );

  expect(screen.getByText('총 2개 변경')).toBeInTheDocument();
  expect(screen.getByText('변경 1')).toBeInTheDocument();
  expect(screen.getByText('11보석 · 6장비')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /보석 & 장비/ }));

  expect(onCategoryChange).toHaveBeenCalledWith('gear');
});
