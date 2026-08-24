import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GemData } from '../../types/lostark';
import { SpecScoreGemPanel } from './SpecScoreGemPanel';

const glowGemData: GemData = {
  Gems: [
    {
      Grade: '고대',
      Icon: 'https://example.com/gem.png',
      Level: 10,
      Name: '10레벨 광휘의 보석',
      Slot: 1,
      Tooltip: '아군 공격력 강화 효과 증가',
    },
  ],
  Effects: {
    Description: '',
    Skills: [
      {
        Description: '',
        GemSlot: 1,
        Icon: 'https://example.com/skill.png',
        Name: '테스트 스킬',
        Option: '',
        Tooltip: '',
      },
    ],
  },
};

describe('SpecScoreGemPanel glow gem selector', () => {
  it('falls back unsupported glow tooltip types to damage', async () => {
    // Given
    render(
      <SpecScoreGemPanel
        visible={true}
        gems={glowGemData}
        gemMods={{}}
        changedCount={0}
        summaryLabel="테스트"
        onGemChange={vi.fn()}
        onApplyBulkGems={vi.fn()}
      />,
    );

    // When
    const typeButton = screen.getByRole('button', { name: '테스트 스킬 타입' });
    await userEvent.click(typeButton);

    // Then
    expect(typeButton).toHaveTextContent('겁화');
    const listbox = screen.getByRole('listbox', { name: '테스트 스킬 타입' });
    expect(within(listbox).getByRole('option', { name: '겁화' })).toBeEnabled();
    expect(within(listbox).getByRole('option', { name: '작열' })).toBeEnabled();
    expect(within(listbox).queryByRole('option', { name: '지원' })).not.toBeInTheDocument();
  });
});
