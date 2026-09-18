import { useCallback, useEffect, useRef, useState } from 'react';

interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
}

interface DocumentPictureInPictureApi {
  readonly window: Window | null;
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
}

type WindowWithDocumentPictureInPicture = Window & {
  readonly documentPictureInPicture?: DocumentPictureInPictureApi;
};

const getApi = (): DocumentPictureInPictureApi | undefined => (
  (window as WindowWithDocumentPictureInPicture).documentPictureInPicture
);

const copyStyles = (targetDocument: Document): void => {
  Array.from(document.styleSheets).forEach((styleSheet) => {
    try {
      const style = targetDocument.createElement('style');
      style.textContent = Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join('\n');
      targetDocument.head.appendChild(style);
    } catch {
      if (!styleSheet.href) return;
      const link = targetDocument.createElement('link');
      link.rel = 'stylesheet';
      link.href = styleSheet.href;
      targetDocument.head.appendChild(link);
    }
  });
};

export interface DocumentPictureInPictureState {
  readonly isSupported: boolean;
  readonly pictureInPictureWindow: Window | null;
  readonly portalRoot: HTMLElement | null;
  readonly error: string | null;
  readonly open: () => Promise<void>;
  readonly close: () => void;
}

export const useDocumentPictureInPicture = (): DocumentPictureInPictureState => {
  const [pictureInPictureWindow, setPictureInPictureWindow] = useState<Window | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const classObserverRef = useRef<MutationObserver | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const pendingOpenRef = useRef<Promise<void> | null>(null);

  const close = useCallback(() => {
    generationRef.current += 1;
    classObserverRef.current?.disconnect();
    classObserverRef.current = null;
    const pipWindow = pipWindowRef.current ?? getApi()?.window;
    pipWindowRef.current = null;
    if (pipWindow && !pipWindow.closed) pipWindow.close();
    if (mountedRef.current) {
      setPictureInPictureWindow(null);
      setPortalRoot(null);
    }
  }, []);

  const open = useCallback((): Promise<void> => {
    if (pendingOpenRef.current) return pendingOpenRef.current;
    const api = getApi();
    if (!api) {
      setError('미니 창은 데스크톱 Chrome 또는 Edge에서 사용할 수 있습니다.');
      return Promise.resolve();
    }
    if (api.window && !api.window.closed) {
      api.window.focus();
      return Promise.resolve();
    }

    setError(null);
    const generation = ++generationRef.current;
    const request = (async () => {
      try {
        const pipWindow = await api.requestWindow({ width: 430, height: 720 });
        if (!mountedRef.current || generation !== generationRef.current) {
          if (!pipWindow.closed) pipWindow.close();
          return;
        }
        pipWindowRef.current = pipWindow;
        pipWindow.document.title = '공대 편성 도우미';
        pipWindow.document.documentElement.lang = document.documentElement.lang || 'ko';
        pipWindow.document.documentElement.className = document.documentElement.className;
        pipWindow.document.body.className = 'm-0 bg-gray-50 font-[Pretendard,sans-serif] text-gray-900 dark:bg-la-dark dark:text-white';
        copyStyles(pipWindow.document);

        const root = pipWindow.document.createElement('div');
        root.id = 'raid-composition-mini-root';
        pipWindow.document.body.appendChild(root);

        classObserverRef.current?.disconnect();
        classObserverRef.current = new MutationObserver(() => {
          pipWindow.document.documentElement.className = document.documentElement.className;
        });
        classObserverRef.current.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        pipWindow.addEventListener('pagehide', () => {
          if (generation !== generationRef.current) return;
          classObserverRef.current?.disconnect();
          classObserverRef.current = null;
          pipWindowRef.current = null;
          if (mountedRef.current) {
            setPictureInPictureWindow(null);
            setPortalRoot(null);
          }
        }, { once: true });
        setPictureInPictureWindow(pipWindow);
        setPortalRoot(root);
      } catch (openError) {
        if (!mountedRef.current || generation !== generationRef.current) return;
        setError(openError instanceof DOMException && openError.name === 'NotAllowedError'
          ? '사용자 동작으로 미니 창을 열어 주세요.'
          : '미니 창을 열지 못했습니다. 다시 시도해 주세요.');
      }
    })();
    pendingOpenRef.current = request;
    const clearPending = () => {
      if (pendingOpenRef.current === request) pendingOpenRef.current = null;
    };
    void request.then(clearPending, clearPending);
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      classObserverRef.current?.disconnect();
      classObserverRef.current = null;
      const pipWindow = pipWindowRef.current ?? getApi()?.window;
      pipWindowRef.current = null;
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
  }, []);

  return {
    isSupported: getApi() != null,
    pictureInPictureWindow,
    portalRoot,
    error,
    open,
    close,
  };
};
