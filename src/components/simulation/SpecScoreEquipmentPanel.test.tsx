import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SpecScoreEquipmentPanel } from './SpecScoreEquipmentPanel';
import { ARMLET_POWER_BY_LEVEL, ARMLET_SELECT_LEVELS } from '../../data/specScore/equipmentPowerTables';
import { resolveArmletIconUrl } from '../../data/specScore/armletIcons';
import { equipment } from '../../utils/lopecSimulator.testUtils';
import type { EquipMod } from './specScoreSimulatorTypes';

const ARMLET_ICON = 'https://example.com/armlet.png';

const armletAt = (normalLevel: number, grade = '고대') =>
  equipment('armlet', {
    normalLevel,
    tier: grade,
    raw: {
      Type: '완갑',
      Name: `+${normalLevel} 운명의 전율 완갑`,
      Icon: ARMLET_ICON,
      Grade: grade,
      Tooltip: '{}',
    },
  });

/** 패널을 렌더링하고 완갑 아이콘 엘리먼트를 돌려준다. alt=""라 role=img로는 조회되지 않는다. */
const renderPanel = (
  normalLevel: number,
  mods: Partial<Record<'armlet', EquipMod>> = {},
  grade = '고대',
): HTMLImageElement => {
  const { container } = render(
    <SpecScoreEquipmentPanel
      visible={true}
      characterClassName="바드"
      equipment={{ armlet: armletAt(normalLevel, grade) }}
      equipmentMods={mods}
      equipmentCount={1}
      changedCount={0}
      summaryLabel="테스트"
      onEquipmentChange={jest.fn()}
      onApplyBulkEquipment={jest.fn()}
    />,
  );

  const icon = container.querySelector('img');
  if (!icon) throw new Error('Missing armlet icon');
  return icon;
};

describe('SpecScoreEquipmentPanel armlet grade source', () => {
  it('offers every armlet level from +0 through +25 exactly once', () => {
    renderPanel(15);

    fireEvent.click(screen.getByRole('button', { name: '완갑 레벨 15' }));

    const labels = screen.getAllByRole('option').map((option) => option.textContent);
    expect(labels).toEqual(ARMLET_SELECT_LEVELS.map((level) => (level === -1 ? '미착용' : String(level))));
    expect(new Set(labels).size).toBe(ARMLET_SELECT_LEVELS.length);
  });

  it('uses the class-specific first-grade icon while the armlet is unequipped', () => {
    const icon = renderPanel(-1, {}, '미착용');

    expect(icon).toHaveAttribute('src', resolveArmletIconUrl('바드', '미착용'));
    expect(icon).toHaveClass('opacity-45', 'grayscale');
  });

  it('keeps the API grade and uses the class-specific icon while the armlet is untouched', () => {
    // Given: +9는 지원 레벨이라 계수 테이블에도 grade/icon이 있다.
    expect(ARMLET_POWER_BY_LEVEL[9].grade).not.toBe('고대');

    // When
    const icon = renderPanel(9);

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', resolveArmletIconUrl('바드', '고대'));
  });

  it('keeps the API grade when the same level is re-selected', () => {
    // Given / When: 값이 같은 재선택은 상태 변화가 아니다.
    const icon = renderPanel(9, { armlet: { normalLevel: 9 } });

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', resolveArmletIconUrl('바드', '고대'));
  });

  it('switches to the coefficient table once a different level is selected', () => {
    // Given / When
    const icon = renderPanel(9, { armlet: { normalLevel: 15 } });

    // Then
    expect(screen.getByText(ARMLET_POWER_BY_LEVEL[15].grade)).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', resolveArmletIconUrl('바드', '전설'));
  });

  it('shows the untouched supported +13 API level with its API grade', () => {
    // Given / When: 착용 중인 아이템은 지원 레벨이어도 원본 grade/icon을 따른다.
    const icon = renderPanel(13);

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', resolveArmletIconUrl('바드', '고대'));
  });

  it.each([
    [10, '영웅', '전설'],
    [15, '전설', '유물'],
    [20, '유물', '고대'],
  ] as const)('shows the limit-break button at +%i %s', (normalLevel, grade, nextGrade) => {
    // Given / When
    renderPanel(normalLevel, {}, grade);

    // Then
    expect(screen.getByRole('button', { name: `완갑 ${nextGrade} 등급 한계돌파` })).toBeInTheDocument();
  });

  it.each([
    [10, '전설'],
    [15, '유물'],
    [20, '고대'],
    [9, '영웅'],
  ] as const)('hides the limit-break button at +%i %s', (normalLevel, grade) => {
    // Given / When
    renderPanel(normalLevel, {}, grade);

    // Then
    expect(screen.queryByRole('button', { name: /한계돌파/ })).not.toBeInTheDocument();
  });

  it('sends only the next armlet grade when limit-breaking', () => {
    // Given
    const onEquipmentChange = jest.fn();
    render(
      <SpecScoreEquipmentPanel
        visible={true}
        characterClassName="바드"
        equipment={{ armlet: armletAt(10, '영웅') }}
        equipmentMods={{}}
        equipmentCount={1}
        changedCount={0}
        summaryLabel="테스트"
        onEquipmentChange={onEquipmentChange}
        onApplyBulkEquipment={jest.fn()}
      />,
    );

    // When
    fireEvent.click(screen.getByRole('button', { name: '완갑 전설 등급 한계돌파' }));

    // Then
    expect(onEquipmentChange).toHaveBeenCalledWith('armlet', { armletGrade: '전설' });
    expect(onEquipmentChange.mock.calls[0]?.[1]).not.toHaveProperty('normalLevel');
  });

  it('moves focus to the stable armlet level control and announces the limit break', async () => {
    // Given
    const StatefulPanel = () => {
      const [mods, setMods] = useState<Partial<Record<'armlet', EquipMod>>>({});
      return (
        <SpecScoreEquipmentPanel
          visible={true}
          characterClassName="바드"
          equipment={{ armlet: armletAt(10, '영웅') }}
          equipmentMods={mods}
          equipmentCount={1}
          changedCount={0}
          summaryLabel="테스트"
          onEquipmentChange={(_, patch) => {
            setMods((previous) => ({ armlet: { ...previous.armlet, ...patch } }));
          }}
          onApplyBulkEquipment={jest.fn()}
        />
      );
    };
    render(<StatefulPanel />);
    const limitBreakButton = screen.getByRole('button', { name: '완갑 전설 등급 한계돌파' });
    limitBreakButton.focus();

    // When
    fireEvent.click(limitBreakButton);

    // Then
    expect(screen.getByRole('status')).toHaveTextContent('완갑 전설 등급 한계돌파가 적용되었습니다');
    await waitFor(() => expect(screen.getByRole('button', { name: '완갑 레벨 10' })).toHaveFocus());
  });

  it('renders the next armlet grade with contrast-safe text classes', () => {
    // Given / When
    renderPanel(10, {}, '영웅');

    // Then
    const button = screen.getByRole('button', { name: '완갑 전설 등급 한계돌파' });
    const nextGrade = within(button).getByText('전설');
    expect(nextGrade).toHaveClass('text-gray-700', 'dark:text-gray-200');
    expect(nextGrade).not.toHaveClass('opacity-70');
  });

  it('does not carry a stale promoted grade when selecting another armlet level', () => {
    // Given
    const onEquipmentChange = jest.fn();
    render(
      <SpecScoreEquipmentPanel
        visible={true}
        characterClassName="바드"
        equipment={{ armlet: armletAt(10, '영웅') }}
        equipmentMods={{ armlet: { armletGrade: '전설' } }}
        equipmentCount={1}
        changedCount={0}
        summaryLabel="테스트"
        onEquipmentChange={onEquipmentChange}
        onApplyBulkEquipment={jest.fn()}
      />,
    );

    // When
    fireEvent.click(screen.getByRole('button', { name: '완갑 레벨 10' }));
    fireEvent.click(screen.getByRole('option', { name: '11' }));

    // Then
    expect(onEquipmentChange).toHaveBeenCalledWith('armlet', { normalLevel: 11 });
  });

  it('uses the promoted grade and class-specific icon', () => {
    // Given / When
    const icon = renderPanel(10, { armlet: { armletGrade: '전설' } }, '영웅');

    // Then
    expect(screen.getByText('전설')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', resolveArmletIconUrl('바드', '전설'));
  });
});
