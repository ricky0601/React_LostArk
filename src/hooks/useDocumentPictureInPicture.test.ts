import { act, renderHook } from '@testing-library/react';
import { useDocumentPictureInPicture } from './useDocumentPictureInPicture';

interface FakePictureInPictureWindow {
  readonly window: Window;
  readonly close: ReturnType<typeof vi.fn>;
  readonly focus: ReturnType<typeof vi.fn>;
  dispatchPageHide(): void;
}

const createPictureInPictureWindow = (): FakePictureInPictureWindow => {
  const pipDocument = document.implementation.createHTMLDocument('');
  let pageHide: (() => void) | undefined;
  const close = vi.fn(() => pageHide?.());
  const focus = vi.fn();
  const pipWindow = {
    document: pipDocument,
    closed: false,
    close,
    focus,
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'pagehide') pageHide = listener;
    }),
  } as unknown as Window;
  return { window: pipWindow, close, focus, dispatchPageHide: () => pageHide?.() };
};

const setDocumentPictureInPicture = (value: unknown): void => {
  Object.defineProperty(window, 'documentPictureInPicture', {
    configurable: true,
    value,
  });
};

describe('useDocumentPictureInPicture', () => {
  afterEach(() => {
    setDocumentPictureInPicture(undefined);
    vi.restoreAllMocks();
  });

  it('opens an always-on-top document and creates a React portal root', async () => {
    const pip = createPictureInPictureWindow();
    const requestWindow = vi.fn().mockResolvedValue(pip.window);
    setDocumentPictureInPicture({ window: null, requestWindow });
    const hook = renderHook(() => useDocumentPictureInPicture());

    await act(() => hook.result.current.open());

    expect(requestWindow).toHaveBeenCalledWith({ width: 430, height: 720 });
    expect(hook.result.current.pictureInPictureWindow).toBe(pip.window);
    expect(hook.result.current.portalRoot?.id).toBe('raid-composition-mini-root');
    expect(pip.window.document.title).toBe('공대 편성 도우미');

    act(() => hook.result.current.close());
    expect(pip.close).toHaveBeenCalledOnce();
    expect(hook.result.current.portalRoot).toBeNull();
    hook.unmount();
  });

  it('supports feature-specific title, size, and portal root options', async () => {
    const pip = createPictureInPictureWindow();
    const requestWindow = vi.fn().mockResolvedValue(pip.window);
    setDocumentPictureInPicture({ window: null, requestWindow });
    const hook = renderHook(() => useDocumentPictureInPicture({
      width: 460,
      height: 700,
      title: '신청자 사사게 조회',
      rootId: 'raid-applicants-mini-root',
    }));

    await act(() => hook.result.current.open());

    expect(requestWindow).toHaveBeenCalledWith({ width: 460, height: 700 });
    expect(hook.result.current.portalRoot?.id).toBe('raid-applicants-mini-root');
    expect(pip.window.document.title).toBe('신청자 사사게 조회');
    hook.unmount();
  });

  it('reports unsupported browsers without requesting a window', async () => {
    setDocumentPictureInPicture(undefined);
    const hook = renderHook(() => useDocumentPictureInPicture());

    await act(() => hook.result.current.open());

    expect(hook.result.current.isSupported).toBe(false);
    expect(hook.result.current.error).toContain('Chrome 또는 Edge');
    hook.unmount();
  });

  it('removes the portal when the browser closes the mini window', async () => {
    const pip = createPictureInPictureWindow();
    setDocumentPictureInPicture({ window: null, requestWindow: vi.fn().mockResolvedValue(pip.window) });
    const hook = renderHook(() => useDocumentPictureInPicture());
    await act(() => hook.result.current.open());

    act(() => pip.dispatchPageHide());

    expect(hook.result.current.pictureInPictureWindow).toBeNull();
    expect(hook.result.current.portalRoot).toBeNull();
    hook.unmount();
  });
});
