import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Enhancement from './Enhancement';
import {
  AEGIR_WEAPON_STEPS,
  ARMLET_STEPS,
  calcExpectedAttempts,
  getCeiling,
} from '../data/enhancement';
import type { CharacterProfile, EquipmentItem } from '../types/lostark';
import {
  fetchEquipment,
  fetchMarketItems,
  fetchMarketOptions,
  fetchProfile,
} from '../utils/api';

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/GlassCard', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

vi.mock('../utils/api', () => ({
  fetchEquipment: vi.fn(),
  fetchMarketItems: vi.fn(),
  fetchMarketOptions: vi.fn(),
  fetchProfile: vi.fn(),
}));

const mockedFetchEquipment = vi.mocked(fetchEquipment);
const mockedFetchMarketItems = vi.mocked(fetchMarketItems);
const mockedFetchMarketOptions = vi.mocked(fetchMarketOptions);
const mockedFetchProfile = vi.mocked(fetchProfile);

const profile: CharacterProfile = {
  CharacterImage: '',
  CharacterName: '테스트캐릭터',
  CharacterClassName: '바드',
  CharacterLevel: 70,
  ItemAvgLevel: '1,700.00',
  ItemMaxLevel: '1,700.00',
  ServerName: '루페온',
  Title: null,
  GuildName: null,
  ExpeditionLevel: 300,
  PvpGradeName: '',
  TownLevel: null,
  TownName: '',
  UsingSkillPoint: 0,
  TotalSkillPoint: 0,
  Stats: [],
  Tendencies: [],
  CombatPower: null,
};

const equipment = (type: string, level: number): EquipmentItem => ({
  Type: type,
  Name: `+${level} 테스트 ${type}`,
  Icon: '',
  Grade: '고대',
  Tooltip: '{}',
});

const chooseTarget = (slot: string, target: number): void => {
  fireEvent.click(screen.getByRole('button', { name: `${slot} 일반 재련 목표 선택` }));
  fireEvent.click(screen.getByRole('option', { name: `${target}강` }));
};

const setViewportWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe('Enhancement armlet calculations', () => {
  beforeEach(() => {
    setViewportWidth(1024);
    vi.clearAllMocks();
    mockedFetchMarketOptions.mockResolvedValue({ Categories: [] });
    mockedFetchMarketItems.mockResolvedValue({ PageNo: 1, PageSize: 10, TotalCount: 0, Items: [] });
    mockedFetchProfile.mockResolvedValue(profile);
  });

  it('groups each equipment label, current level and target before lookup', () => {
    render(<Enhancement />);

    for (const slot of ['무기', '완갑', '투구', '어깨', '상의', '하의', '장갑']) {
      const group = screen.getByRole('group', { name: `${slot} 재련 설정` });
      expect(within(group).getByText(slot)).toBeInTheDocument();
      expect(within(group).getByText('—')).toBeInTheDocument();
      expect(within(group).getByRole('button', { name: `${slot} 일반 재련 목표 선택` })).toBeEnabled();
    }
  });

  it('reserves readable equipment columns and touch targets through tablet widths', () => {
    render(<Enhancement />);

    const group = screen.getByRole('group', { name: '무기 재련 설정' });
    expect(group.parentElement).toHaveClass('grid-cols-2', 'sm:grid-cols-4', 'lg:grid-cols-7');
    const trigger = within(group).getByRole('button', { name: '무기 일반 재련 목표 선택' });
    expect(trigger.parentElement).toHaveClass('[&>button]:min-h-11', 'lg:[&>button]:min-h-0');
  });

  it('keeps a missing armlet unequipped after character lookup', async () => {
    mockedFetchEquipment.mockResolvedValue([equipment('무기', 10)]);

    render(<Enhancement />);

    fireEvent.change(screen.getByPlaceholderText('캐릭터명 입력'), { target: { value: '테스트캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await screen.findByText('종합 아이템 레벨');
    const armletCard = screen.getByText('완갑').closest('div');

    expect(armletCard).toHaveTextContent('—');
    expect(armletCard).not.toHaveTextContent('+0');
  });

  it('names each looked-up slot once for assistive technology', async () => {
    mockedFetchEquipment.mockResolvedValue([
      { ...equipment('무기', 10), Icon: 'https://example.com/weapon.png' },
    ]);
    render(<Enhancement />);
    fireEvent.change(screen.getByPlaceholderText('캐릭터명 입력'), { target: { value: '테스트캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('종합 아이템 레벨');

    const weaponGroup = screen.getByRole('group', { name: '무기 재련 설정' });
    expect(weaponGroup.querySelector('img[src="https://example.com/weapon.png"]')).toHaveAttribute('alt', '');
    expect(within(weaponGroup).queryByRole('img', { name: '무기' })).not.toBeInTheDocument();
    expect(within(weaponGroup).getAllByText('무기')).toHaveLength(1);
  });

  it('reserves icon and advanced-level rows so slot targets align across cards', async () => {
    mockedFetchEquipment.mockResolvedValue([
      { ...equipment('무기', 10), Icon: 'https://example.com/weapon.png' },
      { ...equipment('완갑', 0), Icon: 'https://example.com/armlet.png' },
    ]);
    render(<Enhancement />);
    fireEvent.change(screen.getByPlaceholderText('캐릭터명 입력'), { target: { value: '테스트캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('종합 아이템 레벨');

    const armlet = screen.getByRole('group', { name: '완갑 재련 설정' });
    expect(armlet.querySelector('[data-slot-spacer="advanced-level"]')).toHaveAttribute('aria-hidden', 'true');
    const helmet = screen.getByRole('group', { name: '투구 재련 설정' });
    expect(helmet.querySelector('[data-slot-spacer="icon"]')).toHaveAttribute('aria-hidden', 'true');
    expect(helmet.querySelector('[data-slot-spacer="advanced-level"]')).toHaveAttribute('aria-hidden', 'true');
    const weapon = screen.getByRole('group', { name: '무기 재련 설정' });
    expect(weapon.querySelector('[data-slot-spacer]')).not.toBeInTheDocument();
  });

  it('does not reserve empty rows before any character lookup', () => {
    render(<Enhancement />);
    expect(document.querySelector('[data-slot-spacer]')).not.toBeInTheDocument();
  });

  it('keeps bulk and slot target context in mobile panels', async () => {
    setViewportWidth(390);
    mockedFetchEquipment.mockResolvedValue([
      equipment('무기', 10),
      equipment('완갑', 0),
    ]);

    render(<Enhancement />);

    fireEvent.change(screen.getByPlaceholderText('캐릭터명 입력'), { target: { value: '테스트캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('종합 아이템 레벨');

    const weaponGroup = screen.getByRole('group', { name: '무기 재련 설정' });
    expect(within(weaponGroup).getByText('+10')).toBeInTheDocument();
    expect(within(weaponGroup).getByRole('button', { name: '무기 일반 재련 목표 선택' })).toBeInTheDocument();
    fireEvent.click(within(weaponGroup).getByRole('button', { name: '무기 상급 재련 목표 선택' }));
    expect(screen.getByRole('dialog', { name: '무기 상급 재련 목표' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: '20단계' }));
    expect(within(weaponGroup).getByRole('button', { name: '무기 상급 재련 목표 선택' })).toHaveTextContent('20단계');

    fireEvent.click(screen.getByRole('button', { name: '일반 재련 일괄 목표 선택' }));
    expect(screen.getByRole('dialog', { name: '일반 재련 일괄 목표' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '일반 재련 일괄 목표 닫기' }));

    fireEvent.click(screen.getByRole('button', { name: '완갑 일반 재련 목표 선택' }));
    expect(screen.getByRole('dialog', { name: '완갑 일반 재련 목표' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '완갑 일반 재련 목표 닫기' }));

    fireEvent.click(screen.getByRole('button', { name: '상급 재련 일괄 목표 선택' }));
    expect(screen.getByRole('dialog', { name: '상급 재련 일괄 목표' })).toBeInTheDocument();
  });

  it('applies bulk targets within equipment groups and keeps targets clearable', async () => {
    mockedFetchEquipment.mockResolvedValue([equipment('무기', 10), equipment('완갑', 0)]);
    render(<Enhancement />);
    fireEvent.change(screen.getByPlaceholderText('캐릭터명 입력'), { target: { value: '테스트캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('종합 아이템 레벨');

    fireEvent.click(screen.getByRole('button', { name: '일반 재련 일괄 목표 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '11강' }));
    const weapon = within(screen.getByRole('group', { name: '무기 재련 설정' }));
    const armlet = within(screen.getByRole('group', { name: '완갑 재련 설정' }));
    expect(weapon.getByRole('button', { name: '무기 일반 재련 목표 선택' })).toHaveTextContent('11강');
    expect(armlet.getByRole('button', { name: '완갑 일반 재련 목표 선택' })).toHaveTextContent('11강');

    fireEvent.click(screen.getByRole('button', { name: '상급 재련 일괄 목표 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '20단계' }));
    expect(weapon.getByRole('button', { name: '무기 상급 재련 목표 선택' })).toHaveTextContent('20단계');
    expect(armlet.queryByRole('button', { name: '완갑 상급 재련 목표 선택' })).not.toBeInTheDocument();

    fireEvent.click(weapon.getByRole('button', { name: '무기 일반 재련 목표 선택' }));
    fireEvent.click(screen.getByRole('option', { name: '일반 목표' }));
    expect(weapon.getByRole('button', { name: '무기 일반 재련 목표 선택' })).toHaveTextContent('일반 목표');
    expect(weapon.getByRole('button', { name: '무기 상급 재련 목표 선택' })).toHaveTextContent('20단계');
  });

  it('offers a retry action when the character lookup fails', async () => {
    mockedFetchEquipment.mockRejectedValue(new Error('lookup failed'));

    render(<Enhancement />);

    const input = screen.getByPlaceholderText('캐릭터명 입력');
    fireEvent.change(input, { target: { value: '없는캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    const failure = await screen.findByRole('alert', { name: '캐릭터 강화 현황 조회에 실패했습니다' });
    expect(failure).toHaveTextContent('캐릭터를 찾을 수 없습니다');

    fireEvent.click(screen.getByRole('button', { name: '닉네임 다시 입력' }));

    expect(
      screen.queryByRole('alert', { name: '캐릭터 강화 현황 조회에 실패했습니다' }),
    ).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('refetches material prices from the failure state', async () => {
    mockedFetchEquipment.mockResolvedValue([equipment('무기', 10)]);
    mockedFetchMarketOptions.mockRejectedValueOnce(new Error('market down'));

    render(<Enhancement />);

    const failure = await screen.findByRole('alert', { name: '재료 시세 조회에 실패했습니다' });
    expect(failure).toHaveTextContent('가격 조회 실패');
    expect(mockedFetchMarketOptions).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '시세 다시 조회' }));

    await waitFor(() => expect(mockedFetchMarketOptions).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByRole('alert', { name: '재료 시세 조회에 실패했습니다' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('applies breath and ceiling to the armlet calculation', async () => {
    mockedFetchEquipment.mockResolvedValue([
      equipment('무기', 10),
      equipment('완갑', 0),
    ]);

    render(<Enhancement />);

    fireEvent.change(screen.getByPlaceholderText('캐릭터명 입력'), { target: { value: '테스트캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('종합 아이템 레벨');

    chooseTarget('완갑', 1);
    chooseTarget('무기', 11);
    await screen.findByText('일반 재련 설정');

    const orderedSections = [
      screen.getByText('캐릭터 강화 현황'),
      screen.getByText('일반 재련 설정'),
      screen.getByText(/강화 견적 합계/),
      screen.getByText('보유 재료 입력'),
      screen.getByText(/예상 총 비용/),
      screen.getByRole('button', { name: '단계 별 비용' }),
    ];
    orderedSections.slice(0, -1).forEach((current, index) => {
      expect(current.compareDocumentPosition(orderedSections[index + 1]))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    const stepCostsButton = screen.getByRole('button', { name: '단계 별 비용' });
    expect(stepCostsButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(stepCostsButton);
    expect(stepCostsButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(stepCostsButton);

    const bookOn = screen.queryByRole('button', { name: '책 ON' });
    if (bookOn) fireEvent.click(bookOn);
    const breathOff = screen.queryByRole('button', { name: '숨결 OFF' });
    if (breathOff) fireEvent.click(breathOff);

    expect(screen.getByRole('button', { name: '숨결 ON' })).toBeInTheDocument();
    const ceilingButton = screen.getByRole('button', { name: '장기백' });
    expect(ceilingButton).toBeEnabled();
    fireEvent.click(ceilingButton);

    await waitFor(() => expect(ceilingButton).toHaveClass('bg-red-500/20'));
    const slotSummary = screen.getByText('슬롯별 예상 비용').parentElement;
    expect(slotSummary).not.toBeNull();
    if (!slotSummary) return;

    const armletRow = within(slotSummary).getByText('완갑').closest('tr');
    const weaponRow = within(slotSummary).getByText('무기').closest('tr');
    expect(armletRow).toHaveTextContent(`${getCeiling(ARMLET_STEPS[0], false, true).toFixed(1)}트`);
    expect(weaponRow).toHaveTextContent(`${getCeiling(AEGIR_WEAPON_STEPS[0], false, true).toFixed(1)}트`);
  });
});
