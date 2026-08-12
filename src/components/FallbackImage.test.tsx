import { fireEvent, render, screen } from '@testing-library/react';
import FallbackImage from './FallbackImage';

describe('FallbackImage', () => {
  it('keeps the accessible image when loading succeeds', () => {
    render(
      <FallbackImage
        src="/images/character.webp"
        alt="테스트 캐릭터"
        width={128}
        height={128}
      />,
    );

    expect(screen.getByRole('img', { name: '테스트 캐릭터' }))
      .toHaveAttribute('src', '/images/character.webp');
  });

  it('replaces a failed image with an intentional fallback', () => {
    render(
      <FallbackImage
        src="/images/missing.webp"
        alt="테스트 레이드"
        width={480}
        height={224}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: '테스트 레이드' }));

    expect(screen.queryByRole('img', { name: '테스트 레이드' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '테스트 레이드 이미지 없음' })).toBeInTheDocument();
    expect(screen.getByText('이미지를 불러올 수 없습니다')).toBeInTheDocument();
  });

  it('does not force fallback dimensions from image width and height props', () => {
    render(
      <FallbackImage
        src="/images/missing.webp"
        alt="좁은 카드"
        width={480}
        height={224}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: '좁은 카드' }));

    const fallback = screen.getByRole('img', { name: '좁은 카드 이미지 없음' });
    expect(fallback).not.toHaveStyle({ width: '480px', height: '224px' });
  });
});
