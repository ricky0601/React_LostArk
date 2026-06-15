import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type SelectMenuVariant = 'gray' | 'purple';
type SelectMenuValue = string | number;

export interface SelectMenuOption {
  value: SelectMenuValue;
  label: string;
  disabled?: boolean;
}

interface SelectMenuProps {
  value?: SelectMenuValue;
  options: SelectMenuOption[];
  onChange: (value: SelectMenuValue | undefined) => void;
  ariaLabel: string;
  placeholder?: string;
  variant?: SelectMenuVariant;
  fullWidth?: boolean;
  compact?: boolean;
  clearable?: boolean;
  align?: 'left' | 'center';
  textAlign?: 'left' | 'center';
  className?: string;
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

const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const resolvedTextAlign = align ?? textAlign;

  const updateMenuPosition = useCallback((): void => {
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
    if (open) updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || listboxRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const handleSelect = (nextValue: SelectMenuValue | undefined): void => {
    onChange(nextValue);
    setOpen(false);
  };

  const menu = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
          className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 text-xs shadow-xl dark:border-white/10 dark:bg-[#151a21]"
        >
          {clearable && (
            <button
              type="button"
              role="option"
              aria-selected={value == null}
              onClick={() => handleSelect(undefined)}
              className={joinClassNames(
                'block w-full rounded-lg px-2 py-1.5 text-left text-gray-400 transition-colors hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/10',
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
                  'block w-full rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
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
        </div>,
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
        onClick={() => setOpen((prev) => !prev)}
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
