import { render, screen } from '@testing-library/react';
import { SpecScoreEquipmentPanel } from './SpecScoreEquipmentPanel';
import { ARMLET_POWER_BY_LEVEL } from '../../data/specScore/lopecCoefficients';
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
const renderPanel = (normalLevel: number, mods: Partial<Record<'armlet', EquipMod>> = {}): HTMLImageElement => {
  const { container } = render(
    <SpecScoreEquipmentPanel
      visible={true}
      equipment={{ armlet: armletAt(normalLevel) }}
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

  it('shows the unsupported API level with its API grade', () => {
    // Given / When: +13은 ARMLET_SELECT_LEVELS에 없지만 표시는 원본을 따른다.
    const icon = renderPanel(13);

    // Then
    expect(screen.getByText('고대')).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', ARMLET_ICON);
  });
});
