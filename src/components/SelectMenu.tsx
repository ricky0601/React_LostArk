import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SelectMenuMobilePanel } from './SelectMenuMobilePanel';

type SelectMenuVariant = 'gray' | 'purple';
type SelectMenuValue = string | number;

export interface SelectMenuOption {
  readonly value: SelectMenuValue;
  readonly label: string;
  readonly disabled?: boolean;
}

interface SelectMenuProps {
  readonly value?: SelectMenuValue;
  readonly options: readonly SelectMenuOption[];
  readonly onChange: (value: SelectMenuValue | undefined) => void;
  readonly ariaLabel: string;
  readonly panelTitle?: string;
  readonly placeholder?: string;
  readonly variant?: SelectMenuVariant;
  readonly fullWidth?: boolean;
  readonly compact?: boolean;
  readonly clearable?: boolean;
  readonly align?: 'left' | 'center';
  readonly textAlign?: 'left' | 'center';
  readonly className?: string;
}

const joinClassNames = (...classes: Array<string | false | undefined>): string =>
  classes.filter(Boolean).join(' ');

const variantClass: Record<SelectMenuVariant, string> = {
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15',
  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/35',
};

const activeOptionClass: Record<SelectMenuVariant, string> = {
  gray: 'bg-la-gold/15 text-la-gold-dark dark:text-la-gold',
  purple: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
};

const MOBILE_BREAKPOINT = 640;

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  panelTitle,
  placeholder = '선택',
  variant = 'gray',
  fullWidth = false,
  compact = false,
  clearable = false,
  align,
  textAlign = 'left',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [mobileViewport, setMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const panelTitleId = useId();
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const resolvedTextAlign = align ?? textAlign;
  const resolvedPanelTitle = panelTitle ?? ariaLabel;

  const closeMenu = useCallback((): void => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const updateMenuPosition = useCallback((): void => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setMenuStyle({});
      return;
    }

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportPadding = 8;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding);
    const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft);

    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left,
      minWidth: rect.width,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updateMenuPosition();
    if (mobileViewport) {
      const panel = panelRef.current;
      const focusTarget = panel?.querySelector<HTMLButtonElement>(
        '[role="option"][aria-selected="true"]:not(:disabled)',
      ) ?? panel?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)')
        ?? panel?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      focusTarget?.focus();
    }
  }, [mobileViewport, open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    const handleResize = (): void => {
      setMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
      updateMenuPosition();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [closeMenu, open, updateMenuPosition]);

  useEffect(() => {
    if (!open || !mobileViewport || typeof document === 'undefined') return;

    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root?.setAttribute('aria-hidden', 'true');

    const focusableSelector = 'button:not([disabled]), [role="option"]:not(:disabled)';
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      root?.removeAttribute('aria-hidden');
    };
  }, [mobileViewport, open]);

  const handleSelect = (nextValue: SelectMenuValue | undefined): void => {
    onChange(nextValue);
    closeMenu();
  };

  const optionButtons = (
    <>
      {clearable && (
        <button
          type="button"
          role="option"
          aria-selected={value == null}
          onClick={() => handleSelect(undefined)}
          className={joinClassNames(
            'block w-full rounded-lg text-left text-gray-400 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-500 dark:hover:bg-white/10',
            mobileViewport ? 'min-h-10 px-3 py-2' : 'px-2 py-1.5',
            resolvedTextAlign === 'center' && 'text-center',
          )}
        >
          {placeholder}
        </button>
      )}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="option"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => handleSelect(option.value)}
            className={joinClassNames(
              'block w-full rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 disabled:cursor-not-allowed disabled:opacity-40',
              mobileViewport ? 'min-h-10 px-3 py-2' : 'px-2 py-1.5',
              active
                ? activeOptionClass[variant]
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10',
              resolvedTextAlign === 'center' && 'text-center',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </>
  );

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
        mobileViewport ? (
          <SelectMenuMobilePanel
            ariaLabel={ariaLabel}
            listboxId={listboxId}
            onClose={closeMenu}
            panelRef={panelRef}
            title={resolvedPanelTitle}
            titleId={panelTitleId}
          >
            {optionButtons}
          </SelectMenuMobilePanel>
        ) : (
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={menuStyle}
            className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 text-xs shadow-xl dark:border-white/10 dark:bg-la-dark-card"
          >
            {optionButtons}
          </div>
        ),
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={joinClassNames('relative inline-block', fullWidth && 'w-full', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          setMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
          setOpen((prev) => !prev);
        }}
        className={joinClassNames(
          'inline-flex items-center justify-between gap-1 rounded-lg text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-la-gold/30',
          compact ? 'px-2 py-1' : 'px-2 py-1.5',
          fullWidth && 'w-full',
          resolvedTextAlign === 'center' && 'text-center',
          variantClass[variant],
        )}
      >
        <span className={joinClassNames('min-w-0 truncate', resolvedTextAlign === 'center' && 'flex-1')}>{displayLabel}</span>
        <span aria-hidden="true" className="text-[10px] opacity-70">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {menu}
    </div>
  );
};

export default SelectMenu;
