import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecScoreCorePanel } from './SpecScoreCorePanel';
import { effect, engravings } from '../../utils/lopecSimulator.testUtils';
import type { StoneState } from '../../utils/polishState';

const stone: StoneState = {
  tier: '고대',
  engravings: [
    { name: '타격의 대가', level: 2 },
    { name: '저주받은 인형', level: 1 },
  ],
  raw: {
    Type: '어빌리티 스톤',
    Name: '테스트 스톤',
    Icon: 'https://example.com/stone.png',
    Grade: '고대',
    Tooltip: '{}',
  },
};

describe('SpecScoreCorePanel engraving selectors', () => {
  it('selects common engraving names and disables names already used elsewhere', async () => {
    // Given
    const onEngravingChange = vi.fn();

    render(
      <SpecScoreCorePanel
        visible={true}
        engravings={engravings([
          effect('원한', null, 4),
          effect('아드레날린', null, 3),
        ])}
        stone={stone}
        engravingMods={{}}
        stoneMods={{}}
        changedCount={0}
        summaryLabel="테스트"
        onEngravingChange={onEngravingChange}
        onStoneSlotChange={vi.fn()}
      />,
    );

    // When
    await userEvent.click(screen.getByRole('button', { name: '원한 각인 선택' }));
    const listbox = screen.getByRole('listbox', { name: '원한 각인 선택' });

    // Then
    expect(within(listbox).getByRole('option', { name: '아드레날린' })).toBeDisabled();
    expect(within(listbox).getByRole('option', { name: '타격의 대가' })).toBeEnabled();

    await userEvent.click(within(listbox).getByRole('option', { name: '돌격대장' }));

    expect(onEngravingChange).toHaveBeenCalledWith('원한', { Name: '돌격대장' });
  });
});
