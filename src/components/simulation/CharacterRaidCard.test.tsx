import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { calculateCharacterGold, RAID_COLUMNS } from '../../data/raidGold';
import CharacterRaidCard from './CharacterRaidCard';
import { normalizeRaidSelection } from '../../utils/simulationKeys';

type RenderCardOptions = {
  readonly hasCustomRaids?: boolean;
  readonly onResetRaidSelection?: () => void;
  readonly itemLevel?: string;
  /** 지정하면 기본 선택(참여 가능 상위 3개) 대신 이 키를 선택 상태로 넘긴다. */
  readonly selectedRaidKeysOverride?: readonly string[];
};

const setViewportWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
};

beforeEach(() => {
  setViewportWidth(390);
  document.body.style.overflow = '';
});

afterEach(() => {
  document.body.style.overflow = '';
});

const renderCard = ({
  hasCustomRaids = false,
  onResetRaidSelection = jest.fn(),
  itemLevel = '1780.00',
  selectedRaidKeysOverride,
}: RenderCardOptions = {}) => {
  const result = calculateCharacterGold(itemLevel.split('.')[0], '버서커', itemLevel, 'img');
  const selectedRaidKeys =
    selectedRaidKeysOverride?.slice() ??
    result.selectedRaids.map((raid) => `${raid.raidName}::${raid.difficulty}`);
  const onRaidSelectionChange = jest.fn();

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
        onRaidSelectionChange={onRaidSelectionChange}
        onResetRaidSelection={onResetRaidSelection}
        hasCustomRaids={hasCustomRaids}
        allRaids={RAID_COLUMNS}
      />
    </MemoryRouter>,
  );

  return { onRaidSelectionChange, selectedRaidKeys };
};

describe('CharacterRaidCard raid simulation flow', () => {
  it('keeps character context and Belgardin selection semantics in the raid panel', async () => {
    const { onRaidSelectionChange, selectedRaidKeys } = renderCard();

    expect(screen.getByText('벨가르딘 (그림자)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '벨가르딘 (그림자) 레이드' }))
      .toHaveAttribute('src', '/images/raids/belgardin2.webp');
    expect(screen.getAllByText('나이트메어').length).toBeGreaterThan(1);
    expect(screen.getByText('75,000G')).toBeInTheDocument();
    expect(screen.getByText('코어 16')).toBeInTheDocument();

    fireEvent.error(screen.getByRole('img', { name: '1780' }));
    expect(screen.getByRole('img', { name: '1780 캐릭터 이미지 없음' })).toBeInTheDocument();

    await userEvent.click(screen.getByText('벨가르딘 (그림자)'));

    expect(screen.getByText('30,000G')).toBeInTheDocument();
    expect(screen.getByText('45,000G')).toBeInTheDocument();
    expect(screen.getAllByText('코어 4')).toHaveLength(2);
    expect(screen.getByText('더보기 9,600G')).toBeInTheDocument();
    expect(screen.getByText('더보기 14,400G')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '레이드 변경' }));

    expect(screen.getByRole('button', { name: '레이드 변경 패널 열림' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: '1780 레이드 변경' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByText('현재 선택 레이드')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /참여 가능 레이드/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /참여 불가 레이드/ })).toBeInTheDocument();

    // 최고 요구 레벨이 1780이므로 이 캐릭터는 전 레이드 참여 가능하고, 참여 불가 그룹은 접을 대상이 없다.
    expect(screen.getByRole('button', { name: /참여 가능 레이드/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '참여 불가 레이드 0개' })).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getAllByText('벨가르딘 (그림자)').length).toBeGreaterThan(1);
    expect(screen.getAllByRole('img', { name: '벨가르딘 (그림자) 레이드' })).toHaveLength(4);
    expect(screen.getByText('62,000G')).toBeInTheDocument();
    expect(screen.getAllByText('50,000G').length).toBeGreaterThan(1);

    await userEvent.click(screen.getByRole('checkbox', { name: /벨가르딘 \(그림자\) 나이트메어/ }));

    expect(onRaidSelectionChange).toHaveBeenCalledWith(
      selectedRaidKeys.filter((key) => key !== '벨가르딘 (그림자)::나이트메어'),
    );

    await userEvent.click(screen.getByRole('button', { name: '1780 레이드 변경 닫기' }));
    expect(screen.queryByRole('dialog', { name: '1780 레이드 변경' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('collapses the unavailable raid group by default and reopens it on demand', async () => {
    renderCard({ itemLevel: '1680.00' });

    await userEvent.click(screen.getByRole('button', { name: '레이드 변경' }));

    const unavailableToggle = screen.getByRole('button', { name: /^참여 불가 레이드 [1-9]/ });
    expect(screen.getByRole('button', { name: /참여 가능 레이드/ })).toHaveAttribute('aria-expanded', 'true');
    expect(unavailableToggle).toHaveAttribute('aria-expanded', 'false');

    const collapsedPanelId = unavailableToggle.getAttribute('aria-controls');
    expect(collapsedPanelId).not.toBeNull();
    expect(document.getElementById(collapsedPanelId as string)).toHaveAttribute('hidden');

    await userEvent.click(unavailableToggle);

    expect(unavailableToggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(collapsedPanelId as string)).not.toHaveAttribute('hidden');
  });

  it('keeps the unavailable raid group open when it already holds a checked raid', async () => {
    const result = calculateCharacterGold('1680', '버서커', '1680.00', 'img');
    const availableKeys = new Set(
      result.availableRaids.map((raid) => `${raid.raidName}::${raid.difficulty}`),
    );
    const unavailableRaid = RAID_COLUMNS.find(
      (raid) => !availableKeys.has(`${raid.raidName}::${raid.difficulty}`),
    );

    if (!unavailableRaid) {
      throw new TypeError('Expected at least one unavailable raid at item level 1680');
    }

    renderCard({
      itemLevel: '1680.00',
      selectedRaidKeysOverride: [`${unavailableRaid.raidName}::${unavailableRaid.difficulty}`],
      hasCustomRaids: true,
    });

    await userEvent.click(screen.getByRole('button', { name: '레이드 변경' }));

    // 접으면 사용자가 심어둔 체크 상태가 화면에서 사라지므로 펼친 상태로 시작해야 한다.
    expect(screen.getByRole('button', { name: /^참여 불가 레이드 [1-9]/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('portals the raid picker dialog outside the character glass card', async () => {
    renderCard();
    const openButton = screen.getByRole('button', { name: '레이드 변경' });
    const card = openButton.closest('.glass-card');

    if (!(card instanceof HTMLElement)) {
      throw new TypeError('Expected the raid change button to be inside a character glass card');
    }

    await userEvent.click(openButton);

    const dialog = screen.getByRole('dialog', { name: '1780 레이드 변경' });
    expect(document.body).toContainElement(dialog);
    expect(card).not.toContainElement(dialog);
  });

  it('closes the mobile raid picker with Escape, restores focus, and traps Tab at both edges', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    renderCard();
    const openButton = screen.getByRole('button', { name: '레이드 변경' });

    await userEvent.click(openButton);

    const dialog = screen.getByRole('dialog', { name: '1780 레이드 변경' });
    const closeButton = screen.getByRole('button', { name: '1780 레이드 변경 닫기' });
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(document.activeElement).toBe(closeButton);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: '1780 레이드 변경' })).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('aria-hidden');
    expect(document.activeElement).toBe(openButton);

    await userEvent.click(openButton);

    const reopenedDialog = screen.getByRole('dialog', { name: '1780 레이드 변경' });
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), a[href]';
    const focusables = Array.from(reopenedDialog.querySelectorAll<HTMLElement>(focusableSelector));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (!first || !last) {
      throw new TypeError('Expected the raid picker to expose focusable controls');
    }

    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(document.activeElement).toBe(first);

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(last);

    await userEvent.tab();
    expect(document.activeElement).toBe(first);

    await userEvent.click(screen.getByRole('button', { name: '1780 레이드 변경 닫기' }));
    expect(root).not.toHaveAttribute('aria-hidden');
    expect(document.activeElement).toBe(openButton);

    document.body.removeChild(root);
  });

  it('keeps the raid picker inline inside the character card on desktop', async () => {
    setViewportWidth(1024);
    renderCard();
    const openButton = screen.getByRole('button', { name: '레이드 변경' });
    const card = openButton.closest('.glass-card');

    if (!(card instanceof HTMLElement)) {
      throw new TypeError('Expected the raid change button to be inside a character glass card');
    }

    await userEvent.click(openButton);

    expect(card).toContainElement(screen.getByRole('dialog', { name: '1780 레이드 변경' }));
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps an open desktop raid picker open during an ordinary desktop resize', async () => {
    setViewportWidth(1024);
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: '레이드 변경' }));

    setViewportWidth(1280);
    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('dialog', { name: '1780 레이드 변경' })).toBeInTheDocument();
  });

  it('closes multiple desktop raid pickers before a mobile breakpoint transition can stack modals', async () => {
    setViewportWidth(1024);
    renderCard();
    renderCard();

    const openButtons = screen.getAllByRole('button', { name: '레이드 변경' });
    await userEvent.click(openButtons[0]);
    await userEvent.click(openButtons[1]);
    expect(screen.getAllByRole('dialog', { name: '1780 레이드 변경' })).toHaveLength(2);

    setViewportWidth(390);
    fireEvent(window, new Event('resize'));

    expect(screen.queryAllByRole('dialog', { name: '1780 레이드 변경' })).toHaveLength(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('resets a custom selection without losing the open panel context', async () => {
    const onResetRaidSelection = jest.fn();
    renderCard({ hasCustomRaids: true, onResetRaidSelection });

    await userEvent.click(screen.getByRole('button', { name: '레이드 변경' }));
    await userEvent.click(screen.getByRole('button', { name: '기본 선택으로 초기화' }));

    expect(onResetRaidSelection).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: '1780 레이드 변경' })).toBeInTheDocument();
  });

  it('keeps only one Belgardin difficulty selected when adding a second one', () => {
    const currentKeys = ['벨가르딘 (그림자)::나이트메어'];
    const nextKeys = ['벨가르딘 (그림자)::나이트메어', '벨가르딘 (그림자)::하드'];

    expect(normalizeRaidSelection(currentKeys, nextKeys)).toEqual(['벨가르딘 (그림자)::하드']);
  });

  it('uses the current default raid selection when adding a first custom difficulty', () => {
    const currentKeys = [
      '벨가르딘 (그림자)::나이트메어',
      '세르카 (그림자)::나이트메어',
      '지평의 성당 (어비스)::1750',
    ];
    const nextKeys = [...currentKeys, '벨가르딘 (그림자)::하드'];

    expect(normalizeRaidSelection(currentKeys, nextKeys)).toEqual([
      '세르카 (그림자)::나이트메어',
      '지평의 성당 (어비스)::1750',
      '벨가르딘 (그림자)::하드',
    ]);
  });
});
