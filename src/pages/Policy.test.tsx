import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Policy from './Policy';

vi.mock('../components/NavBar', () => ({ default: () => <nav>Navigation</nav> }));

test('describes the information handled by the service', () => {
  render(
    <MemoryRouter>
      <Policy />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '1. 처리하는 정보와 이용 목적' })).toBeInTheDocument();
  expect(screen.getByText(/캐릭터 닉네임을 처리합니다/)).toBeInTheDocument();
  expect(screen.getByText(/Vercel Analytics를 통해 처리될 수 있습니다/)).toBeInTheDocument();
  expect(screen.getByText('시행일: 2026년 9월 4일')).toBeInTheDocument();
});

test('describes account data storage and deletion', () => {
  render(
    <MemoryRouter>
      <Policy />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: '2. 회원 계정 정보의 저장과 삭제' })).toBeInTheDocument();
  expect(screen.getByText(/주간 활동 기록은 회원 데이터베이스에 저장됩니다/)).toBeInTheDocument();
  expect(screen.getByText(/계정 설정 화면에서 언제든지 확인할 수 있습니다/)).toBeInTheDocument();
  expect(screen.getByText(/STOVE 토큰/)).toBeInTheDocument();
  expect(screen.getByText(/영구 삭제됩니다/)).toBeInTheDocument();
});
