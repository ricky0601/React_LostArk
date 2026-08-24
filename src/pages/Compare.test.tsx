import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Compare from './Compare';
import type { CharacterProfile, EquipmentItem } from '../types/lostark';
import {
  fetchArkGrid,
  fetchEngravings,
  fetchEquipment,
  fetchGems,
  fetchProfile,
} from '../utils/api';

vi.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => ({ pathname: '/compare' }),
  }),
  { virtual: true },
);

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../components/GlassCard', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

vi.mock('../utils/api', () => ({
  fetchProfile: vi.fn(),
  fetchEquipment: vi.fn(),
  fetchGems: vi.fn(),
  fetchEngravings: vi.fn(),
  fetchArkGrid: vi.fn(),
}));

const mockedFetchProfile = vi.mocked(fetchProfile);
const mockedFetchEquipment = vi.mocked(fetchEquipment);
const mockedFetchGems = vi.mocked(fetchGems);
const mockedFetchEngravings = vi.mocked(fetchEngravings);
const mockedFetchArkGrid = vi.mocked(fetchArkGrid);

const validProfile: CharacterProfile = {
  CharacterImage: '',
  CharacterName: '정상캐릭터',
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

const equipment = (type: string, name: string): EquipmentItem => ({
  Type: type,
  Name: name,
  Icon: 'https://example.com/icon.png',
  Grade: '고대',
  Tooltip: '{}',
});

describe('Compare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchProfile.mockImplementation(async (name) => {
      if (name === '정상캐릭터' || name === '비교캐릭터') return { ...validProfile, CharacterName: name };
      return null as unknown as CharacterProfile;
    });
    mockedFetchEquipment.mockResolvedValue([]);
    mockedFetchGems.mockResolvedValue(null as never);
    mockedFetchEngravings.mockResolvedValue(null as never);
    mockedFetchArkGrid.mockResolvedValue(null as never);
  });

  it('explains why comparison is disabled until both nicknames are entered', () => {
    render(<Compare />);

    const compareButton = screen.getByRole('button', { name: '비교하기' });
    expect(compareButton).toBeDisabled();
    expect(screen.getByText('비교하려면 두 캐릭터 닉네임을 모두 입력해 주세요.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('캐릭터 닉네임'), { target: { value: '정상캐릭터' } });
    expect(screen.getByText('비교할 캐릭터 닉네임을 한쪽 더 입력해 주세요.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('비교할 캐릭터'), { target: { value: '비교캐릭터' } });
    expect(compareButton).toBeEnabled();
    expect(screen.queryByText(/비교하려면|한쪽 더 입력/)).not.toBeInTheDocument();
  });

  it('한쪽 캐릭터 프로필이 null이면 부분 실패 메시지를 표시하고 비교 섹션을 렌더링하지 않는다', async () => {
    render(<Compare />);

    fireEvent.change(screen.getByPlaceholderText('캐릭터 닉네임'), { target: { value: '정상캐릭터' } });
    fireEvent.change(screen.getByPlaceholderText('비교할 캐릭터'), { target: { value: 'ㅎㅎㅎ' } });
    fireEvent.click(screen.getByRole('button', { name: '비교하기' }));

    expect(await screen.findByText('"ㅎㅎㅎ" 캐릭터를 조회하지 못해 비교할 수 없습니다. 닉네임을 확인해주세요.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('기본 정보')).not.toBeInTheDocument());
  });

  it('완갑 장비를 장비 비교 섹션에 표시한다', async () => {
    mockedFetchEquipment.mockImplementation(async (name) => (
      name === '정상캐릭터'
        ? [equipment('완갑', '+9 운명의 전율 완갑')]
        : []
    ));

    render(<Compare />);

    fireEvent.change(screen.getByPlaceholderText('캐릭터 닉네임'), { target: { value: '정상캐릭터' } });
    fireEvent.change(screen.getByPlaceholderText('비교할 캐릭터'), { target: { value: '비교캐릭터' } });
    fireEvent.click(screen.getByRole('button', { name: '비교하기' }));

    expect(await screen.findByText('+9 운명의 전율 완갑')).toBeInTheDocument();
    expect(screen.getByText('완갑')).toBeInTheDocument();
  });
});
