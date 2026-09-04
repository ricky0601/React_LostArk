import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Expedition from './Expedition';
import type { CharacterProfile } from '../types/lostark';
import { fetchArkGrid, fetchArkPassive, fetchEngravings, fetchGems, fetchProfile, fetchSiblings } from '../utils/api';

const mockSetSearchParams = vi.fn();
let mockCurrentSearchParams = new URLSearchParams('nickname=원정대장');

vi.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useLocation: () => ({ pathname: '/expedition' }),
    useSearchParams: () => [mockCurrentSearchParams, mockSetSearchParams],
  }),
  { virtual: true },
);

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));
vi.mock('../components/PullToRefresh', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

vi.mock('../utils/api', () => ({
  fetchProfile: vi.fn(),
  fetchSiblings: vi.fn(),
  fetchEquipment: vi.fn().mockResolvedValue([]),
  fetchArkPassive: vi.fn().mockResolvedValue({ IsArkPassive: false, Points: null, Effects: null }),
  fetchArkGrid: vi.fn().mockResolvedValue({ Slots: null, Effects: null }),
  fetchGems: vi.fn().mockResolvedValue({ Gems: null, Effects: null }),
  fetchEngravings: vi.fn().mockResolvedValue({ Engravings: null, Effects: null, ArkPassiveEffects: null }),
  LS_NICKNAME: 'lostark_nickname',
}));

const mockedFetchProfile = vi.mocked(fetchProfile);
const mockedFetchSiblings = vi.mocked(fetchSiblings);
const mockedFetchGems = vi.mocked(fetchGems);
const mockedFetchArkGrid = vi.mocked(fetchArkGrid);
const mockedFetchEngravings = vi.mocked(fetchEngravings);
const mockedFetchArkPassive = vi.mocked(fetchArkPassive);

const profile: CharacterProfile = {
  CharacterImage: 'https://example.com/expedition.png',
  CharacterName: '원정대장',
  CharacterClassName: '슬레이어',
  CharacterLevel: 70,
  ItemAvgLevel: '1,710.00',
  ItemMaxLevel: '1,710.00',
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

describe('Expedition route state affordances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockCurrentSearchParams = new URLSearchParams('nickname=원정대장');
    mockSetSearchParams.mockImplementation((nextInit) => {
      mockCurrentSearchParams = new URLSearchParams(nextInit);
    });
  });

  it('loads the character image and combat power in React StrictMode', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue({ ...profile, CombatPower: '123,456' });

    render(<StrictMode><Expedition /></StrictMode>);

    expect(await screen.findByRole('img', { name: '원정대장' })).toHaveAttribute('src', profile.CharacterImage);
    expect(await screen.findByText('전투력 123,456')).toBeInTheDocument();
  });

  it('shows an intentional fallback when a character card image fails', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Expedition />);

    const image = await screen.findByRole('img', { name: '원정대장' });
    fireEvent.error(image);

    expect(screen.getByRole('img', { name: '원정대장 이미지 없음' })).toBeInTheDocument();
  });

  it('explains a failed search and offers a next action', async () => {
    mockedFetchSiblings.mockRejectedValue(new Error('rate limited'));

    render(<Expedition />);

    expect(await screen.findByRole('alert')).toHaveTextContent('요청이 많거나 서버 응답이 지연될 수 있습니다');
    expect(screen.getByRole('button', { name: '닉네임 다시 입력' })).toBeInTheDocument();
  });

  it('returns to nickname input and clears query params after reset action', async () => {
    mockedFetchSiblings.mockRejectedValue(new Error('rate limited'));

    render(<Expedition />);

    await userEvent.click(await screen.findByRole('button', { name: '닉네임 다시 입력' }));

    expect(mockSetSearchParams).toHaveBeenCalledWith({});
    expect(await screen.findByRole('button', { name: '원정대 조회' })).toBeInTheDocument();
  });

  it('shows the empty branch when siblings lookup succeeds with no characters', async () => {
    mockedFetchSiblings.mockResolvedValue([]);

    render(<Expedition />);

    expect(await screen.findByText('원정대 캐릭터가 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('원정대 캐릭터가 없습니다');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the sibling row visible when its profile lookup fails', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '부캐1', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,600.00', ItemMaxLevel: '1,600.00' },
    ]);
    mockedFetchProfile.mockRejectedValue(new Error('profile unavailable'));

    render(<Expedition />);

    expect(await screen.findByRole('alert')).toHaveTextContent('조회된 정보는 계속 표시됩니다');
    expect(screen.getAllByText('부캐1').length).toBeGreaterThan(0);
  });

  it('sanitizes API markup and renders detail images', async () => {
    mockedFetchGems.mockResolvedValueOnce({
      Gems: [
        { Slot: 0, Name: "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석</FONT></P>", Icon: '/gem.png', Level: 8, Grade: '고대', Tooltip: '' },
        { Slot: 1, Name: "<P ALIGN='CENTER'><FONT COLOR='#FA5D00'>8레벨 광휘의 보석 (귀속)</FONT></P>", Icon: '/bound-gem.png', Level: 8, Grade: '고대', Tooltip: '' },
      ],
      Effects: {
        Description: '',
        Skills: [{ GemSlot: 0, Name: '블러디 러스트', Description: ['피해량 40% 증가'], Option: '피해 증가', Icon: '/skill.png', Tooltip: '' }],
      },
    });
    mockedFetchArkGrid.mockResolvedValueOnce({
      Slots: [
        { Index: 0, Icon: '/ancient-core.png', Name: '질서의 해', Point: 19, Grade: '고대', Tooltip: '', Gems: null },
        { Index: 1, Icon: '/relic-core.png', Name: '질서의 달', Point: 17, Grade: '유물', Tooltip: '', Gems: null },
      ],
      Effects: null,
    });
    mockedFetchEngravings.mockResolvedValueOnce({
      Engravings: null,
      Effects: null,
      ArkPassiveEffects: [{ AbilityStoneLevel: 2, Grade: '유물', Level: 3, Name: '원한', Description: '보스 등급 이상 몬스터에게 주는 피해가 20% 증가한다.' }],
    });
    mockedFetchArkPassive.mockResolvedValueOnce({
      IsArkPassive: true,
      Title: '심판자',
      Points: [
        { Name: '진화', Value: 140, Tooltip: '', Description: '6랭크 25레벨' },
        { Name: '깨달음', Value: 101, Tooltip: '', Description: '6랭크 27레벨' },
        { Name: '도약', Value: 70, Tooltip: '', Description: '6랭크 25레벨' },
      ],
      Effects: [
        { Name: '진화', Description: "<FONT color='#F1D594'>진화</FONT> 1티어 <FONT color='#F1D594'>치명 Lv.29</FONT>", Icon: '/evolution.png' },
        { Name: '깨달음', Description: "<FONT color='#83E9FF'>깨달음</FONT> 1티어 <FONT color='#83E9FF'>빛의 기사 Lv.3</FONT>", Icon: '/passive.png' },
      ],
    });
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Expedition />);

    expect((await screen.findAllByText('원정대장')).length).toBeGreaterThan(0);
    await waitFor(() => expect(mockedFetchGems).toHaveBeenCalledWith('원정대장', expect.objectContaining({ signal: expect.any(AbortSignal) })));
    expect(screen.getByText('아크그리드 코어').parentElement).toHaveTextContent('고대 1');
    expect(screen.getByText('아크그리드 코어').parentElement).toHaveTextContent('유물 1');
    expect(screen.getByText('거래 가능 보석').parentElement).toHaveTextContent('1개');
    expect(screen.getByText('귀속 보석').parentElement).toHaveTextContent('1개');
    expect(screen.queryByText('전체 캐릭터')).not.toBeInTheDocument();
    expect(screen.queryByText('표시 캐릭터')).not.toBeInTheDocument();
    expect(screen.queryByText('평균 레벨')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '상세 보기' }));
    const gemTrigger = await screen.findByLabelText('블러디 러스트 8레벨 보석 정보');
    expect(gemTrigger).toHaveTextContent(/^8$/);
    expect(screen.queryByText(/<P ALIGN/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '블러디 러스트' })).toHaveAttribute('src', '/gem.png');
    await userEvent.hover(gemTrigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('블러디 러스트');
    expect(screen.getByRole('tooltip')).toHaveTextContent('피해량 40% 증가');
    expect(screen.getByRole('img', { name: '원한' })).toHaveAttribute('src', expect.stringContaining('Buff_71.png'));
    await userEvent.hover(screen.getByLabelText('원한 각인 효과'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('보스 등급 이상 몬스터에게 주는 피해가 20% 증가한다.');
    expect(screen.getByRole('tooltip')).toHaveTextContent('어빌리티 스톤 Lv.2');
    expect(screen.getByRole('tab', { name: '진화' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('img', { name: '치명' })).toHaveAttribute('src', '/evolution.png');
    expect(screen.queryByText('빛의 기사 Lv.3')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: '깨달음' }));
    expect(screen.getByRole('img', { name: '빛의 기사' })).toHaveAttribute('src', '/passive.png');
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('빛의 기사 Lv.3')).toBeInTheDocument();
  });

  it('keeps partial core totals visible when another character fails', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '캐릭1', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,700.00', ItemMaxLevel: '1,700.00' },
      { ServerName: '루페온', CharacterName: '캐릭2', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,690.00', ItemMaxLevel: '1,690.00' },
    ]);
    mockedFetchProfile.mockImplementation(async (name) => ({ ...profile, CharacterName: name }));
    mockedFetchArkGrid
      .mockResolvedValueOnce({ Slots: [{ Index: 0, Icon: '', Name: '코어', Point: 19, Grade: '고대', Tooltip: '', Gems: null }], Effects: null })
      .mockRejectedValueOnce(new Error('grid unavailable'));

    render(<Expedition />);

    const summary = (await screen.findByText('아크그리드 코어')).parentElement;
    await waitFor(() => expect(summary).toHaveTextContent('고대 1'));
    expect(summary).toHaveTextContent('일부 조회 실패');
  });

  it('shows a profile failure in grid view instead of a loading placeholder', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '부캐1', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,600.00', ItemMaxLevel: '1,600.00' },
    ]);
    mockedFetchProfile.mockRejectedValue(new Error('profile unavailable'));

    render(<Expedition />);

    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('radio', { name: /그리드/ }));
    expect(screen.getByText(/전투력 조회 실패/)).toBeInTheDocument();
  });

  it('excludes deselected failures and retries them only through the retry action', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '부캐1', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,600.00', ItemMaxLevel: '1,600.00' },
    ]);
    mockedFetchProfile.mockRejectedValue(new Error('profile unavailable'));

    render(<Expedition />);

    expect(await screen.findByRole('alert')).toHaveTextContent('1개 캐릭터');
    const characterCheckbox = screen.getByRole('checkbox', { name: '부캐1' });
    await userEvent.click(characterCheckbox);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.click(characterCheckbox);
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledTimes(2));
  });

  it('aborts the previous expedition request when a new nickname is searched', async () => {
    let firstSignal: AbortSignal | undefined;
    mockedFetchSiblings
      .mockImplementationOnce((_name, options) => {
        firstSignal = options?.signal ?? undefined;
        return new Promise(() => undefined);
      })
      .mockResolvedValueOnce([]);

    render(<Expedition />);
    await waitFor(() => expect(mockedFetchSiblings).toHaveBeenCalledTimes(1));
    await userEvent.type(screen.getByPlaceholderText('다른 원정대 검색'), '새캐릭터');
    await userEvent.click(screen.getByRole('button', { name: '검색' }));

    await waitFor(() => expect(mockedFetchSiblings).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
  });

  it('limits concurrent character requests', async () => {
    const names = ['캐릭1', '캐릭2', '캐릭3', '캐릭4'];
    const resolveProfiles: Array<() => void> = [];
    mockedFetchSiblings.mockResolvedValue(names.map((CharacterName) => ({
      ServerName: '루페온', CharacterName, CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,600.00', ItemMaxLevel: '1,600.00',
    })));
    mockedFetchProfile.mockImplementation((name) => new Promise((resolve) => {
      resolveProfiles.push(() => resolve({ ...profile, CharacterName: name }));
    }));

    render(<Expedition />);

    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledTimes(3));
    expect(mockedFetchProfile).toHaveBeenCalledTimes(3);
    resolveProfiles[0]();
    await waitFor(() => expect(mockedFetchProfile).toHaveBeenCalledTimes(4));
  });

  it('persists per-server collapse across remounts', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    const first = render(<Expedition />);
    expect(await first.findByRole('checkbox', { name: '루페온 서버 전체 선택' })).toBeInTheDocument();
    await userEvent.click(first.getByRole('button', { name: /루페온.*접기/ }));
    expect(first.queryByRole('checkbox', { name: '원정대장' })).not.toBeInTheDocument();
    expect(first.getByRole('button', { name: /루페온.*펼치기/ })).toBeInTheDocument();
    first.unmount();

    render(<Expedition />);
    expect(await screen.findByRole('button', { name: /루페온.*펼치기/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: '원정대장' })).not.toBeInTheDocument();
  });

  it('does not refetch engravings when collapsing and re-expanding details', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Expedition />);
    await userEvent.click(await screen.findByRole('button', { name: '상세 보기' }));
    await waitFor(() => expect(mockedFetchEngravings).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    await userEvent.click(await screen.findByRole('button', { name: '상세 보기' }));
    expect(await screen.findByRole('button', { name: '상세 닫기' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockedFetchEngravings).toHaveBeenCalledTimes(1);
  });

  it('forces an engravings refetch when retrying from expanded details', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);
    mockedFetchEngravings.mockRejectedValueOnce(new Error('engravings unavailable'));

    render(<Expedition />);
    await userEvent.click(await screen.findByRole('button', { name: '상세 보기' }));
    await waitFor(() => expect(mockedFetchEngravings).toHaveBeenCalledTimes(1));
    await userEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(mockedFetchEngravings).toHaveBeenCalledTimes(2));
  });

  it('moves view-mode radio selection with arrow keys and roving tabindex', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Expedition />);
    const card = await screen.findByRole('radio', { name: /카드/ });
    const grid = screen.getByRole('radio', { name: /그리드/ });
    expect(card).toHaveAttribute('aria-checked', 'true');
    expect(card).toHaveAttribute('tabindex', '0');
    expect(grid).toHaveAttribute('tabindex', '-1');
    card.focus();
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    expect(grid).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(grid);
    expect(grid).toHaveAttribute('tabindex', '0');
  });

  it('moves ark passive tabs with arrow keys', async () => {
    mockedFetchArkPassive.mockResolvedValueOnce({
      IsArkPassive: true,
      Points: [
        { Name: '진화', Value: 140, Tooltip: '', Description: '6랭크 25레벨' },
        { Name: '깨달음', Value: 101, Tooltip: '', Description: '6랭크 27레벨' },
        { Name: '도약', Value: 70, Tooltip: '', Description: '6랭크 25레벨' },
      ],
      Effects: [],
    });
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '원정대장', CharacterLevel: 70, CharacterClassName: '슬레이어', ItemAvgLevel: '1,710.00', ItemMaxLevel: '1,710.00' },
    ]);
    mockedFetchProfile.mockResolvedValue(profile);

    render(<Expedition />);
    await userEvent.click(await screen.findByRole('button', { name: '상세 보기' }));
    const evolution = await screen.findByRole('tab', { name: '진화' });
    expect(evolution).toHaveAttribute('aria-selected', 'true');
    evolution.focus();
    fireEvent.keyDown(evolution, { key: 'ArrowRight' });
    const enlightenment = screen.getByRole('tab', { name: '깨달음' });
    expect(enlightenment).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(enlightenment);
  });

  it('shows siblings from every server and allows switching views', async () => {
    mockedFetchSiblings.mockResolvedValue([
      { ServerName: '루페온', CharacterName: '루페온캐릭', CharacterLevel: 70, CharacterClassName: '바드', ItemAvgLevel: '1,700.00', ItemMaxLevel: '1,700.00' },
      { ServerName: '카단', CharacterName: '카단캐릭', CharacterLevel: 70, CharacterClassName: '도화가', ItemAvgLevel: '1,680.00', ItemMaxLevel: '1,680.00' },
    ]);
    mockedFetchProfile.mockImplementation(async (name) => ({ ...profile, CharacterName: name }));

    render(<Expedition />);

    expect(await screen.findByRole('heading', { name: '루페온' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '카단' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '표시할 캐릭터 접기' }));
    expect(screen.queryByRole('checkbox', { name: '루페온 서버 전체 선택' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '표시할 캐릭터 펼치기' }));
    expect(screen.getByRole('checkbox', { name: '루페온 서버 전체 선택' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /테이블/ }));
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });
});
