import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import RaidCompositionMini from '../components/raid-composition/RaidCompositionMini';
import {
  createInitialRoster,
  updateRosterBuild,
  updateRosterSlot,
  type RaidRosterSlot,
} from '../components/raid-composition/roster';
import RaidCompositionPage, { CaptureProgress, SlotRow } from './RaidComposition';

const boundaryState = vi.hoisted(() => ({
  roster: [] as readonly RaidRosterSlot[],
  captureError: null as string | null,
  pipError: null as string | null,
}));

vi.mock('../components/raid-composition/useRaidScreenCapture', async () => {
  const ReactModule = await import('react');
  return {
    useRaidScreenCapture: () => {
      const [roster, setRoster] = ReactModule.useState(boundaryState.roster);
      return {
        roster,
        setRoster,
        framesScanned: 0,
        lastScanAt: null,
        status: boundaryState.captureError ? 'error' : 'idle',
        error: boundaryState.captureError,
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
        autoArkPassiveLookup: false,
        setAutoArkPassiveLookup: vi.fn(),
      };
    },
  };
});

vi.mock('../hooks/useDocumentPictureInPicture', () => ({
  useDocumentPictureInPicture: () => ({
    isSupported: true,
    pictureInPictureWindow: null,
    portalRoot: null,
    error: boundaryState.pipError,
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

const noop = vi.fn();
const renderPage = () => render(
  <ThemeProvider><MemoryRouter><RaidCompositionPage /></MemoryRouter></ThemeProvider>,
);

const withSlot = (
  roster: readonly RaidRosterSlot[],
  slot: number,
  className: string,
  nickname: string,
): readonly RaidRosterSlot[] => updateRosterSlot(roster, `slot-${slot}`, { className, nickname });

beforeEach(() => {
  boundaryState.roster = createInitialRoster();
  boundaryState.captureError = null;
  boundaryState.pipError = null;
});

describe('raid composition slot controls', () => {
  it('keeps the analysis count outside the recognition live region', () => {
    render(<CaptureProgress recognizedCount={3} framesScanned={12} />);

    expect(screen.getByText('3/8명 확인')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(/12회 분석/)).not.toHaveAttribute('aria-live');
  });

  it('gives the main fixed checkbox a slot-unique name and exposes build/manual recognition controls', () => {
    const slot = updateRosterSlot(createInitialRoster(), 'slot-0', {
      className: '바드',
      nickname: '수동닉',
    })[0];
    const onChange = vi.fn();
    const onBuildChange = vi.fn();
    const onEnableAutoRecognition = vi.fn();

    render(<SlotRow
      slot={slot}
      party={1}
      dragging={false}
      onChange={onChange}
      onDragStart={noop}
      onDragEnd={noop}
      onMoveParty={noop}
      onBuildChange={onBuildChange}
      onEnableAutoRecognition={onEnableAutoRecognition}
    />);

    expect(screen.getByRole('checkbox', { name: '1파티 · 인식 1 고정' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '1파티 · 인식 1 빌드' }), {
      target: { value: '진실된 용맹' },
    });
    expect(onBuildChange).toHaveBeenCalledWith('slot-0', '진실된 용맹');
    fireEvent.change(screen.getByRole('spinbutton', { name: '1파티 · 인식 1 전투력' }), {
      target: { value: '123456' },
    });
    expect(onChange).toHaveBeenCalledWith('slot-0', { combatPower: 123456 });
    fireEvent.click(screen.getByRole('button', { name: '자동 인식으로 전환' }));
    expect(onEnableAutoRecognition).toHaveBeenCalledWith('slot-0');
  });

  it('shows party-local member numbers instead of global recognition indexes', () => {
    const slot = createInitialRoster()[4];

    render(<SlotRow
      slot={slot}
      party={2}
      dragging={false}
      onChange={noop}
      onDragStart={noop}
      onDragEnd={noop}
      onMoveParty={noop}
      onBuildChange={noop}
      onEnableAutoRecognition={noop}
    />);

    expect(screen.getByText('2파티 · 1번')).toBeInTheDocument();
  });

  it('renders the full page, applies a recommendation, and moves members between actual party lists', () => {
    let roster = createInitialRoster();
    [
      ['바드', '바드닉'], ['도화가', '도화가닉'], ['기상술사', '기상닉'], ['소서리스', '소서닉'],
      ['워로드', '워로드닉'], ['블레이드', '블레이드닉'], ['데모닉', '데모닉닉'], ['호크아이', '호크닉'],
    ].forEach(([className, nickname], slot) => { roster = withSlot(roster, slot, className, nickname); });
    roster = updateRosterBuild(roster, 'slot-0', '절실한 구원');
    roster = updateRosterBuild(roster, 'slot-1', '만개');
    boundaryState.roster = roster;

    renderPage();
    const firstParty = screen.getByRole('region', { name: '1파티 슬롯' });
    expect(within(firstParty).getAllByRole('combobox', { name: /직업/ }).map((select) => (select as HTMLSelectElement).value))
      .toEqual(expect.arrayContaining(['바드', '도화가']));

    fireEvent.click(screen.getByRole('button', { name: '위 교환을 파티에 적용' }));

    const firstClasses = within(screen.getByRole('region', { name: '1파티 슬롯' }))
      .getAllByRole('combobox', { name: /직업/ }).map((select) => (select as HTMLSelectElement).value);
    const secondClasses = within(screen.getByRole('region', { name: '2파티 슬롯' }))
      .getAllByRole('combobox', { name: /직업/ }).map((select) => (select as HTMLSelectElement).value);
    expect(firstClasses.filter((value) => ['바드', '도화가'].includes(value))).toHaveLength(1);
    expect(secondClasses.filter((value) => ['바드', '도화가'].includes(value))).toHaveLength(1);
  });

  it('shows a best-effort recommendation when manual builds leave only one supporter', () => {
    let roster = createInitialRoster();
    [
      ['바드', '바드닉'], ['도화가', '도화가닉'], ['기상술사', '기상닉'], ['소서리스', '소서닉'],
      ['워로드', '워로드닉'], ['블레이드', '블레이드닉'], ['데모닉', '데모닉닉'], ['호크아이', '호크닉'],
    ].forEach(([className, nickname], slot) => { roster = withSlot(roster, slot, className, nickname); });
    roster = updateRosterBuild(roster, 'slot-0', '절실한 구원');
    roster = updateRosterBuild(roster, 'slot-1', '회귀');
    boundaryState.roster = roster;

    renderPage();

    expect(screen.getByText('적용 후 파티 구성 보기')).toBeInTheDocument();
    expect(screen.queryByText('각 파티에 서포터를 1명씩 배치해 주세요')).not.toBeInTheDocument();
  });

  it('explains unresolved roles before suggesting supporter placement', () => {
    let roster = createInitialRoster();
    [
      ['바드', '바드닉'], ['도화가', '도화가닉'], ['기상술사', '기상닉'], ['소서리스', '소서닉'],
      ['워로드', '워로드닉'], ['블레이드', '블레이드닉'], ['데모닉', '데모닉닉'], ['호크아이', '호크닉'],
    ].forEach(([className, nickname], slot) => { roster = withSlot(roster, slot, className, nickname); });
    boundaryState.roster = roster;

    renderPage();

    expect(screen.getByText('역할 또는 빌드가 아직 확정되지 않았습니다')).toBeInTheDocument();
    expect(screen.getByText(/빌드를 선택하거나 아크패시브 자동 확인/)).toBeInTheDocument();
    expect(screen.queryByText('각 파티에 서포터를 1명씩 배치해 주세요')).not.toBeInTheDocument();
  });

  it('announces capture and picture-in-picture errors immediately', () => {
    boundaryState.captureError = '캡처 오류 메시지';
    boundaryState.pipError = 'PiP 오류 메시지';
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('인식 오류');
    expect(screen.getAllByRole('alert').map(({ textContent }) => textContent)).toEqual([
      '캡처 오류 메시지',
      'PiP 오류 메시지',
    ]);
  });

  it('gives mini fixed checkboxes and review indicators accessible names', () => {
    render(<RaidCompositionMini
      roster={createInitialRoster()}
      setRoster={noop}
      status="sharing"
      error="미니 캡처 오류"
      framesScanned={3}
      autoArkPassiveLookup={false}
      setAutoArkPassiveLookup={noop}
      strategy="balanced"
      setStrategy={noop}
      currentEvaluation={null}
      recommendation={null}
      start={async () => {}}
      stop={async () => {}}
      close={noop}
    />);

    expect(screen.getByRole('checkbox', { name: '미니 창 1파티 인식 1번 슬롯 고정' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '미니 창 2파티 인식 5번 슬롯 고정' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('검토 필요')).toHaveLength(8);
    expect(screen.getByRole('alert')).toHaveTextContent('미니 캡처 오류');
    expect(screen.getByRole('status')).toHaveTextContent('화면 공유 중');
    expect(screen.getByText(/3회 분석/)).not.toHaveAttribute('aria-live');
  });
});
