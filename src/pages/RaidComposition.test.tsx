import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RaidCompositionMini from '../components/raid-composition/RaidCompositionMini';
import { createInitialRoster, updateRosterSlot } from '../components/raid-composition/roster';
import { SlotRow } from './RaidComposition';

const noop = vi.fn();

describe('raid composition slot controls', () => {
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

  it('gives each mini fixed checkbox a slot-unique accessible name', () => {
    render(<RaidCompositionMini
      roster={createInitialRoster()}
      setRoster={noop}
      status="idle"
      error={null}
      framesScanned={0}
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
  });
});
