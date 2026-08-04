import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { calculateCharacterGold, RAID_COLUMNS } from '../../data/raidGold';
import CharacterRaidCard from './CharacterRaidCard';

describe('CharacterRaidCard raid simulation flow', () => {
  it('renders Belgardin from raid data in default selection and the raid picker', async () => {
    const result = calculateCharacterGold('1780', '버서커', '1780.00', 'img');
    const selectedRaidKeys = result.selectedRaids.map((raid) => `${raid.raidName}::${raid.difficulty}`);

    render(
      <MemoryRouter>
        <CharacterRaidCard
          result={result}
          index={0}
          formatGold={(gold) => gold.toLocaleString()}
          bonusSelections={new Set()}
          onToggleBonus={jest.fn()}
          onToggleAllCharBonus={jest.fn()}
          isAllCharBonusSelected={false}
          characterBonusCost={0}
          coreData={{ base: 16, bonus: 0 }}
          completedRaids={new Set()}
          onToggleComplete={jest.fn()}
          selectedRaidKeys={selectedRaidKeys}
          onRaidSelectionChange={jest.fn()}
          onResetRaidSelection={jest.fn()}
          hasCustomRaids={false}
          allRaids={RAID_COLUMNS}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('벨가르딘 (그림자)')).toBeInTheDocument();
    expect(screen.getAllByText('나이트메어').length).toBeGreaterThan(1);
    expect(screen.getByText('75,000G')).toBeInTheDocument();
    expect(screen.getByText('코어 16')).toBeInTheDocument();

    await userEvent.click(screen.getByText('벨가르딘 (그림자)'));

    expect(screen.getByText('30,000G')).toBeInTheDocument();
    expect(screen.getByText('45,000G')).toBeInTheDocument();
    expect(screen.getAllByText('코어 4')).toHaveLength(2);
    expect(screen.getByText('더보기 9,600G')).toBeInTheDocument();
    expect(screen.getByText('더보기 14,400G')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '레이드 변경' }));

    expect(screen.getAllByText('벨가르딘 (그림자)').length).toBeGreaterThan(1);
    expect(screen.getByText('62,000G')).toBeInTheDocument();
    expect(screen.getAllByText('50,000G').length).toBeGreaterThan(1);
  });
});
