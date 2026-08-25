import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { QUICK_MENU_ORDER_STORAGE_KEY } from './quickMenuOrder';
import HomeDashboardIntro from './HomeDashboardIntro';

const defaultVisibleTitles = ['주간 골드 계산', '재련 계산', '전투력 시뮬', '시세'];
const allTitles = [
  ...defaultVisibleTitles,
  '캐릭터 비교',
  '캐릭터 검색',
  '원정대',
  '결제 내역',
];

const renderIntro = () => render(
  <MemoryRouter>
    <HomeDashboardIntro
      activeEventCount={2}
      calendarGroupCount={3}
      loadingEvents={false}
      loadingCalendar={false}
    />
  </MemoryRouter>,
);

const renderedTitles = () => within(screen.getByRole('navigation', { name: /빠른 메뉴/ }))
  .getAllByRole('heading', { level: 3 })
  .map((heading) => heading.textContent);

const readStoredState = () => JSON.parse(
  window.localStorage.getItem(QUICK_MENU_ORDER_STORAGE_KEY) ?? 'null',
);

describe('HomeDashboardIntro', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'elementFromPoint');
  });

  it('renders only the four default visible menus in the requested order', () => {
    renderIntro();

    expect(renderedTitles()).toEqual(defaultVisibleTitles);
    const quickMenu = screen.getByRole('navigation', { name: '빠른 메뉴' });
    expect(within(quickMenu).getAllByRole('link')).toHaveLength(4);
    expect(within(quickMenu).getByRole('link', { name: /전투력 시뮬/ })).toHaveAttribute('href', '/spec-simulator');
  });

  it('shows all menus in edit mode and distinguishes visible and hidden cards', () => {
    renderIntro();
    userEvent.click(screen.getByRole('button', { name: '순서 편집' }));

    expect(renderedTitles()).toEqual(allTitles);
    expect(screen.getByRole('group', { name: '주간 골드 계산, 노출, 순서 편집' })).toHaveClass('border-la-gold/50');
    expect(screen.getByRole('group', { name: '캐릭터 비교, 미노출, 순서 편집' })).toHaveClass('opacity-55');
    expect(screen.getByRole('button', { name: '주간 골드 계산 미노출로 변경' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '캐릭터 비교 노출로 변경' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('restores the saved order and selected menus', () => {
    window.localStorage.setItem(QUICK_MENU_ORDER_STORAGE_KEY, JSON.stringify({
      order: ['/market', '/compare', '/simulation', '/enhancement', '/spec-simulator', '/character', '/expedition', '/spending'],
      visibleIds: ['/market', '/compare', '/simulation'],
    }));

    renderIntro();

    expect(renderedTitles()).toEqual(['시세', '캐릭터 비교', '주간 골드 계산']);
  });

  it.each([
    ['invalid JSON', '["/market"'],
    ['an invalid object', JSON.stringify({ order: ['/market'] })],
  ])('falls back to the default settings for %s', (_label, storedValue) => {
    window.localStorage.setItem(QUICK_MENU_ORDER_STORAGE_KEY, storedValue);

    renderIntro();

    expect(renderedTitles()).toEqual(defaultVisibleTitles);
  });

  it('toggles menu visibility and saves the selection', () => {
    renderIntro();
    userEvent.click(screen.getByRole('button', { name: '순서 편집' }));

    userEvent.click(screen.getByRole('button', { name: '캐릭터 비교 노출로 변경' }));
    userEvent.click(screen.getByRole('button', { name: '주간 골드 계산 미노출로 변경' }));
    userEvent.click(screen.getByRole('button', { name: '편집 완료' }));

    expect(renderedTitles()).toEqual(['재련 계산', '전투력 시뮬', '시세', '캐릭터 비교']);
    expect(readStoredState().visibleIds).toEqual([
      '/enhancement', '/spec-simulator', '/market', '/compare',
    ]);
  });

  it.each(['mouse', 'touch'] as const)('drags the card itself with a %s pointer', (pointerType) => {
    renderIntro();
    userEvent.click(screen.getByRole('button', { name: '순서 편집' }));
    const sourceCard = screen.getByRole('group', { name: '주간 골드 계산, 노출, 순서 편집' });
    const targetCard = screen.getByRole('group', { name: '재련 계산, 노출, 순서 편집' });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(targetCard),
    });

    fireEvent.pointerDown(sourceCard, { button: 0, pointerId: 1, pointerType });
    const editMenu = screen.getByRole('navigation', { name: '빠른 메뉴 편집' });
    fireEvent.pointerMove(editMenu, { clientX: 10, clientY: 10, pointerType });
    fireEvent.pointerMove(editMenu, { clientX: 10, clientY: 10, pointerType });
    fireEvent.pointerUp(editMenu);

    expect(renderedTitles().slice(0, 2)).toEqual(['재련 계산', '주간 골드 계산']);
    expect(readStoredState().visibleIds.slice(0, 2)).toEqual(['/enhancement', '/simulation']);
  });

  it('supports keyboard ordering without rendering arrow buttons', () => {
    renderIntro();
    userEvent.click(screen.getByRole('button', { name: '순서 편집' }));
    const card = screen.getByRole('group', { name: '주간 골드 계산, 노출, 순서 편집' });
    card.focus();

    fireEvent.keyDown(card, { key: 'ArrowRight', altKey: true });

    expect(renderedTitles().slice(0, 2)).toEqual(['재련 계산', '주간 골드 계산']);
    expect(screen.queryByRole('button', { name: /앞으로 이동|뒤로 이동/ })).not.toBeInTheDocument();
  });

  it('resets order and visibility to the default settings', () => {
    window.localStorage.setItem(QUICK_MENU_ORDER_STORAGE_KEY, JSON.stringify({
      order: ['/compare', '/market', '/enhancement', '/simulation'],
      visibleIds: ['/compare'],
    }));
    renderIntro();
    userEvent.click(screen.getByRole('button', { name: '순서 편집' }));

    userEvent.click(screen.getByRole('button', { name: '기본 설정으로 초기화' }));
    userEvent.click(screen.getByRole('button', { name: '편집 완료' }));

    expect(renderedTitles()).toEqual(defaultVisibleTitles);
    expect(window.localStorage.getItem(QUICK_MENU_ORDER_STORAGE_KEY)).toBeNull();
  });

  it('removes every card link while edit mode is active', () => {
    renderIntro();
    userEvent.click(screen.getByRole('button', { name: '순서 편집' }));

    expect(within(screen.getByRole('navigation', { name: '빠른 메뉴 편집' })).queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByText(/편집 모드. 4개 메뉴 노출 중/)).toBeInTheDocument();
  });
});
