import { render, screen } from '@testing-library/react';
import Policy from './Policy';

vi.mock('../components/NavBar', () => ({ default: () => <nav>Navigation</nav> }));

test('describes the information handled by the service', () => {
  render(<Policy />);

  expect(screen.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '1. 처리하는 정보와 이용 목적' })).toBeInTheDocument();
  expect(screen.getByText(/캐릭터 닉네임을 처리합니다/)).toBeInTheDocument();
  expect(screen.getByText(/Vercel Analytics를 통해 처리될 수 있습니다/)).toBeInTheDocument();
  expect(screen.getByText('시행일: 2026년 8월 25일')).toBeInTheDocument();
});
