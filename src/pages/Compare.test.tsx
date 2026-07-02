import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Compare from './Compare';
import type { CharacterProfile } from '../types/lostark';
import {
  fetchArkGrid,
  fetchEngravings,
  fetchEquipment,
  fetchGems,
  fetchProfile,
} from '../utils/api';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => ({ pathname: '/compare' }),
  }),
  { virtual: true },
);

jest.mock('../components/NavBar', () => () => <div>NavBar</div>);
jest.mock('../components/PullToRefresh', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../components/GlassCard', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);

jest.mock('../utils/api', () => ({
  fetchProfile: jest.fn(),
  fetchEquipment: jest.fn(),
  fetchGems: jest.fn(),
  fetchEngravings: jest.fn(),
  fetchArkGrid: jest.fn(),
}));

const mockedFetchProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const mockedFetchEquipment = fetchEquipment as jest.MockedFunction<typeof fetchEquipment>;
const mockedFetchGems = fetchGems as jest.MockedFunction<typeof fetchGems>;
const mockedFetchEngravings = fetchEngravings as jest.MockedFunction<typeof fetchEngravings>;
const mockedFetchArkGrid = fetchArkGrid as jest.MockedFunction<typeof fetchArkGrid>;

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

describe('Compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProfile.mockImplementation(async (name) => {
      if (name === '정상캐릭터') return validProfile;
      return null as unknown as CharacterProfile;
    });
    mockedFetchEquipment.mockResolvedValue([]);
    mockedFetchGems.mockResolvedValue(null as never);
    mockedFetchEngravings.mockResolvedValue(null as never);
    mockedFetchArkGrid.mockResolvedValue(null as never);
  });

  it('한쪽 캐릭터 프로필이 null이면 부분 실패 메시지를 표시하고 비교 섹션을 렌더링하지 않는다', async () => {
    render(<Compare />);

    fireEvent.change(screen.getByPlaceholderText('캐릭터 닉네임'), { target: { value: '정상캐릭터' } });
    fireEvent.change(screen.getByPlaceholderText('비교할 캐릭터'), { target: { value: 'ㅎㅎㅎ' } });
    fireEvent.click(screen.getByRole('button', { name: '비교하기' }));

    expect(await screen.findByText('"ㅎㅎㅎ" 캐릭터를 조회하지 못해 비교할 수 없습니다. 닉네임을 확인해주세요.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('기본 정보')).not.toBeInTheDocument());
  });
});
