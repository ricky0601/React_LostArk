import { fireEvent, render, screen } from '@testing-library/react';
import Spending from './Spending';

vi.mock('../components/NavBar', () => ({ default: () => <div>NavBar</div> }));

describe('Spending mobile guidance', () => {
  it('makes the PC-only requirement and script wrapping explicit', () => {
    render(<Spending />);

    expect(screen.getByRole('heading', { name: 'PC 브라우저에서 진행해 주세요' })).toBeInTheDocument();
    expect(screen.getByText('allow pasting')).toHaveClass('break-all');

    fireEvent.click(screen.getByRole('button', { name: /스크립트 미리보기/ }));

    const preview = screen.getByText(/analyzeLostArkFinal/);
    expect(preview).toHaveClass('max-w-full', 'whitespace-pre-wrap', 'break-all');
  });
});
