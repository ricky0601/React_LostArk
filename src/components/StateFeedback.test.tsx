import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StateFeedback from './StateFeedback';

describe('StateFeedback', () => {
  it('announces loading state without marking the status node busy', () => {
    render(
      <StateFeedback
        tone="loading"
        title="시세를 불러오는 중"
        description="잠시만 기다려 주세요."
      />,
    );

    expect(screen.getByRole('status', { name: '시세를 불러오는 중' }))
      .not.toHaveAttribute('aria-busy');
  });

  it('renders an empty state action', async () => {
    const onAction = vi.fn();

    render(
      <StateFeedback
        tone="empty"
        title="표시할 결과가 없습니다"
        action={{ label: '다시 검색', onClick: onAction }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '다시 검색' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('uses alert semantics and wrapping-friendly text for errors', () => {
    render(
      <StateFeedback
        tone="error"
        title="조회에 실패했습니다"
        description="캐릭터 정보를 불러오지 못했습니다. 잠시 후 닉네임을 확인하고 다시 시도해 주세요."
      />,
    );

    const feedback = screen.getByRole('alert', { name: '조회에 실패했습니다' });
    expect(feedback).toHaveAttribute('data-tone', 'error');
    expect(screen.getByText(/캐릭터 정보를 불러오지 못했습니다/)).toHaveClass('break-words');
  });

  it('uses compact spacing when requested', () => {
    render(
      <StateFeedback
        tone="empty"
        title="결과 없음"
        compact
      />,
    );

    expect(screen.getByRole('status', { name: '결과 없음' })).toHaveClass('p-4');
  });
});
