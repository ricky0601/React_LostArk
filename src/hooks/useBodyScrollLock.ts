import { useEffect } from 'react';

export const useBodyScrollLock = (locked: boolean): void => {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    const scrollY = window.scrollY;
    const root = document.getElementById('root');
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverflow = document.body.style.overflow;

    // iOS Safari blocks background rubber-band scrolling only when the body is fixed.
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    root?.setAttribute('aria-hidden', 'true');

    return () => {
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.style.overflow = previousBodyOverflow;
      root?.removeAttribute('aria-hidden');
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
};
