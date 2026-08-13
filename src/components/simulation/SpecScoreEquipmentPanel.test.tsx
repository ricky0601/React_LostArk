import { fireEvent, render, screen } from '@testing-library/react';
import { SpecScoreEquipmentPanel } from './SpecScoreEquipmentPanel';
import { ARMLET_POWER_BY_LEVEL } from '../../data/specScore/equipmentPowerTables';
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
  it('keeps the API grade and icon while the armlet is untouched', () => {
    // Given: +9는 지원 레벨이라 계수 테이블에도 grade/icon이 있다.
    expect(ARMLET_POWER_BY_LEVEL[9].grade).not.toBe('고대');

    // When
    const icon = renderPanel(9);

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', ARMLET_ICON);
  });

  it('keeps the API grade when the same level is re-selected', () => {
    // Given / When: 값이 같은 재선택은 상태 변화가 아니다.
    const icon = renderPanel(9, { armlet: { normalLevel: 9 } });

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', ARMLET_ICON);
  });

  it('switches to the coefficient table once a different level is selected', () => {
    // Given / When
    const icon = renderPanel(9, { armlet: { normalLevel: 15 } });

    // Then
    expect(screen.getByText(ARMLET_POWER_BY_LEVEL[15].grade)).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', ARMLET_POWER_BY_LEVEL[15].icon);
  });

  it('shows the untouched supported +13 API level with its API grade', () => {
    // Given / When: 착용 중인 아이템은 지원 레벨이어도 원본 grade/icon을 따른다.
    const icon = renderPanel(13);

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', ARMLET_ICON);
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

  it('does not carry a stale promoted grade when selecting another armlet level', () => {
    // Given
    const onEquipmentChange = jest.fn();
    render(
      <SpecScoreEquipmentPanel
        visible={true}
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

  it('uses the promoted grade and icon from armlet power resolution', () => {
    // Given / When
    const icon = renderPanel(10, { armlet: { armletGrade: '전설' } }, '영웅');

    // Then
    expect(screen.getByText('전설')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', '/images/arms2.webp');
  });
});
