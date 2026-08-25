import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

test('renders the service notices and policy link', () => {
  renderFooter();

  expect(screen.getByText('© 2026 로아끼욧. All rights reserved.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/policy');
  expect(screen.getByText('본 사이트는 Smilegate RPG 및 STOVE의 공식 서비스가 아닙니다.')).toBeInTheDocument();
  expect(screen.getByText('게임 데이터는 LOST ARK Open API를 기반으로 제공됩니다.')).toBeInTheDocument();
});

test('opens the Discord invitation in a new tab', () => {
  renderFooter();

  const discordLink = screen.getByRole('link', { name: 'Discord' });
  expect(discordLink).toHaveAttribute('href', 'https://discord.gg/xRgvcwt6W');
  expect(discordLink).toHaveAttribute('target', '_blank');
  expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
});
