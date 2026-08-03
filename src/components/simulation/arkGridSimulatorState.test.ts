import type { ArkGridData, ArkGridGem } from '../../types/lostark';
import {
  buildModifiedArkGrid,
  getArkGridGemState,
  parseArkGridGemEffects,
  resolveArkGridChaosOptionName,
} from './arkGridSimulatorState';

const gem = (tooltip: string): ArkGridGem => ({
  Grade: '고대',
  Icon: '',
  Index: 0,
  IsActive: true,
  Tooltip: tooltip,
});

describe('arkGridSimulatorState', () => {
  it('falls back to the first chaos option when the API sends a null core name', () => {
    // Given / When
    const optionName = resolveArkGridChaosOptionName(3, null);

    // Then
    expect(optionName).toBe('현란한 공격');
  });

  it('parses ark grid gem tooltip state', () => {
    // Given
    const tooltip = '필요 의지력 : 3<br>질서 포인트 : 5<br>[공격력] Lv.4<br>[추가 피해] Lv.2';

    // When
    const state = getArkGridGemState(gem(tooltip));

    // Then
    expect(state).toEqual({
      willpower: 3,
      corePoint: 5,
      effects: [
        { option: '공격력', level: 4 },
        { option: '추가 피해', level: 2 },
      ],
    });
  });

  it('keeps only dealer-supported effects when parsing gem options', () => {
    // Given
    const tooltip = '[공격력] Lv.4<br>[지원 효과] Lv.5<br>[보스 피해] Lv.2';

    // When
    const effects = parseArkGridGemEffects(tooltip);

    // Then
    expect(effects).toEqual([
      { option: '공격력', level: 4 },
      { option: '보스 피해', level: 2 },
    ]);
  });

  it('rebuilds ark grid point and effect levels from gem edits', () => {
    // Given
    const current: ArkGridData = {
      Effects: [
        { Name: '공격력', Level: 4, Tooltip: '' },
        { Name: '추가 피해', Level: 2, Tooltip: '' },
      ],
      Slots: [
        {
          Gems: [gem('필요 의지력 : 1<br>질서 포인트 : 5<br>[공격력] Lv.4<br>[추가 피해] Lv.2')],
          Grade: '고대',
          Icon: '',
          Index: 0,
          Name: '질서의 해 코어',
          Point: 10,
          Tooltip: '',
        },
      ],
    };

    // When
    const modified = buildModifiedArkGrid(current, {
      0: {
        gems: {
          0: {
            corePoint: 12,
            effects: [
              { option: '공격력', level: 6 },
              { option: '추가 피해', level: 2 },
            ],
          },
        },
      },
    });

    // Then
    expect(modified?.Slots?.[0]?.Point).toBe(12);
    expect(modified?.Effects).toEqual([
      { Name: '공격력', Level: 6, Tooltip: '' },
      { Name: '추가 피해', Level: 2, Tooltip: '' },
    ]);
  });
});
