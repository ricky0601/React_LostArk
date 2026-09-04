import { fireEvent, render, screen } from '@testing-library/react';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('keeps only the most recently opened tooltip visible', () => {
    render(
      <>
        <Tooltip label="첫 번째" content="첫 번째 내용"><span>첫 번째</span></Tooltip>
        <Tooltip label="두 번째" content="두 번째 내용"><span>두 번째</span></Tooltip>
      </>,
    );

    fireEvent.mouseEnter(screen.getByLabelText('첫 번째'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('첫 번째 내용');

    fireEvent.mouseEnter(screen.getByLabelText('두 번째'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('두 번째 내용');
    expect(screen.queryByText('첫 번째 내용')).not.toBeInTheDocument();
  });

  it('exposes a button role and links the tooltip through aria-describedby', () => {
    render(<Tooltip label="무기 찬란한 검 상급 3 / 품질 90" content="상세"><span>+25</span></Tooltip>);
    const trigger = screen.getByRole('button', { name: '무기 찬란한 검 상급 3 / 품질 90' });

    expect(trigger).not.toHaveAttribute('aria-describedby');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.focus(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
  });

  it('prevents mouse clicks from pinning a hover tooltip', () => {
    render(<Tooltip label="보석" content="보석 정보"><span>보석</span></Tooltip>);
    expect(fireEvent.mouseDown(screen.getByLabelText('보석'))).toBe(false);
  });

  it('closes a hover tooltip with Escape from the document', () => {
    render(<Tooltip label="젬 정보" content="공격력 Lv.3"><span>젬</span></Tooltip>);

    fireEvent.mouseEnter(screen.getByLabelText('젬 정보'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('공격력 Lv.3');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggles on touch pointer input', () => {
    render(<Tooltip label="보석 정보" content="피해 증가"><span>보석</span></Tooltip>);
    const trigger = screen.getByLabelText('보석 정보');

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('피해 증가');

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders a non-focusable display trigger without button semantics', () => {
    render(<Tooltip label="무기 정보" content="상세" focusable={false}><span>+25</span></Tooltip>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('[tabindex]')).toBeNull();
  });

  it('supports focus, Enter, Space, and blur keyboard paths', () => {
    render(<Tooltip label="각인 정보" content="원한 Lv.3"><span>원한</span></Tooltip>);
    const trigger = screen.getByLabelText('각인 정보');

    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
