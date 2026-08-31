import { fireEvent, render, screen } from '@testing-library/react';
import type { MaterialType } from '../../../data/enhancement';
import MaterialScreenCapture from './MaterialScreenCapture';
import { useMaterialScreenCapture } from './useMaterialScreenCapture';

vi.mock('./useMaterialScreenCapture', () => ({
  useMaterialScreenCapture: vi.fn(),
}));

const mockedUseMaterialScreenCapture = vi.mocked(useMaterialScreenCapture);
const start = vi.fn();
const stop = vi.fn();
const reset = vi.fn();

const renderCapture = (onApply = vi.fn()) => render(
  <MaterialScreenCapture
    icons={{ 수호석: '/guardian.png' }}
    targetMaterials={['수호석']}
    onApply={onApply}
  />,
);

describe('MaterialScreenCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseMaterialScreenCapture.mockReturnValue({
      status: 'idle',
      error: null,
      results: [],
      scanCount: 0,
      start,
      stop,
      reset,
    });
  });

  it('starts screen capture without offering a file upload', () => {
    renderCapture();

    fireEvent.click(screen.getByRole('button', { name: 'Lost Ark 화면에서 자동 불러오기' }));

    expect(start).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/파일/)).not.toBeInTheDocument();
  });

  it('includes fate shards for top-bar or honing-window recognition', () => {
    render(
      <MaterialScreenCapture
        icons={{ 수호석: '/guardian.png' }}
        targetMaterials={['수호석', '운명의 파편']}
        onApply={vi.fn()}
      />,
    );

    expect(mockedUseMaterialScreenCapture).toHaveBeenCalledWith(expect.objectContaining({
      targetMaterials: ['수호석', '운명의 파편'],
    }));
    expect(screen.getByText(/운명의 파편은 게임 상단 바를 먼저 확인하고.*소지 금액 첫 번째 값을 읽습니다/)).toBeInTheDocument();
  });

  it('shows recognized materials while sharing and lets the user stop', () => {
    mockedUseMaterialScreenCapture.mockReturnValue({
      status: 'sharing',
      error: null,
      results: [
        {
          material: '운명의 파괴석 결정' as MaterialType,
          quantity: 950870,
          confidence: 0.65,
          needsReview: true,
        },
      ],
      scanCount: 2,
      start,
      stop,
      reset,
    });
    renderCapture();

    expect(screen.getByText('인식 결과 확인')).toBeInTheDocument();
    expect(screen.getByText('운명의 파괴석 결정')).toHaveTextContent('확인 필요');
    expect(screen.getByText('950,870')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '화면 공유 중지' }));
    expect(stop).toHaveBeenCalledOnce();
  });

  it('does not apply a capped honing value unless the user accepts it', () => {
    const onApply = vi.fn();
    mockedUseMaterialScreenCapture.mockReturnValue({
      status: 'review',
      error: null,
      results: [
        {
          material: '파괴석' as MaterialType,
          quantity: 9999,
          confidence: 0.95,
          needsReview: true,
          needsTooltip: true,
          source: 'honing',
        },
        {
          material: '돌파석' as MaterialType,
          quantity: 879,
          confidence: 0.9,
          needsReview: false,
          source: 'honing',
        },
      ],
      scanCount: 1,
      start,
      stop,
      reset,
    });
    renderCapture(onApply);

    expect(screen.getByText('파괴석')).toHaveTextContent('툴팁 확인 필요');
    fireEvent.click(screen.getByRole('button', { name: '보유 재료에 적용' }));

    expect(onApply).toHaveBeenCalledWith({ 돌파석: 879 });
  });

  it('does not allow an unchanged capped value to be applied after re-including it', () => {
    mockedUseMaterialScreenCapture.mockReturnValue({
      status: 'review',
      error: null,
      results: [{
        material: '파괴석' as MaterialType,
        quantity: 9999,
        confidence: 0.95,
        needsReview: true,
        needsTooltip: true,
        source: 'honing',
      }],
      scanCount: 1,
      start,
      stop,
      reset,
    });
    renderCapture();

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('9999로 잘려 표시된 재료는 실제 수량을 입력하거나 적용 대상에서 제외해 주세요.')).toBeInTheDocument();
    expect(screen.queryByText(/수량은 0 이상/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보유 재료에 적용' })).toBeDisabled();
  });

  it('allows review and applies only accepted corrected results', () => {
    const onApply = vi.fn();
    mockedUseMaterialScreenCapture.mockReturnValue({
      status: 'review',
      error: null,
      results: [
        { material: '수호석' as MaterialType, quantity: 1200, confidence: 0.92, needsReview: false },
        { material: '파괴석' as MaterialType, quantity: 0, confidence: 0.4, needsReview: true },
      ],
      scanCount: 3,
      start,
      stop,
      reset,
    });
    renderCapture(onApply);

    fireEvent.change(screen.getByLabelText('수호석 인식 수량'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: '보유 재료에 적용' }));

    expect(onApply).toHaveBeenCalledWith({ 수호석: 1500 });
    expect(reset).toHaveBeenCalledOnce();
  });
});
