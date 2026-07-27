import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecScoreSummary } from './SpecScoreSummary';

test('shows combat cockpit context and mobile delta summary when values changed', async () => {
  const onReset = jest.fn();

  render(
    <SpecScoreSummary
      sim={{ current: 1000000, simulated: 1012500, delta: 12500 }}
      hasMods={true}
      deltaColor="text-green-600"
      currentItemLevel={1700}
      simulatedItemLevel={1702.5}
      itemLevelDelta={2.5}
      changedCount={3}
      nextActionLabel="상승 세팅 우선 확인"
      onReset={onReset}
    />,
  );

  const mobileSummary = screen.getByLabelText('모바일 전투력 변화 요약');

  expect(screen.getByText('전투력 콕핏')).toBeInTheDocument();
  expect(screen.getByText('변경 3개')).toBeInTheDocument();
  expect(mobileSummary).toHaveTextContent('변경 3개');
  expect(screen.getAllByText('상승 세팅 우선 확인')).toHaveLength(2);
  expect(mobileSummary).toHaveTextContent('+12,500.00');

  await userEvent.click(screen.getAllByRole('button', { name: '초기화' })[0]);

  expect(onReset).toHaveBeenCalledTimes(1);
});
