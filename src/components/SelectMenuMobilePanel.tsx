import React from 'react';

interface SelectMenuMobilePanelProps {
  readonly ariaLabel: string;
  readonly children: React.ReactNode;
  readonly listboxId: string;
  readonly onClose: () => void;
  readonly panelRef: React.RefObject<HTMLDivElement | null>;
  readonly title: string;
  readonly titleId: string;
}

export const SelectMenuMobilePanel: React.FC<SelectMenuMobilePanelProps> = ({
  ariaLabel,
  children,
  listboxId,
  onClose,
  panelRef,
  title,
  titleId,
}) => (
  <div className="fixed inset-0 z-[9999] flex items-end bg-black/40">
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-xl border border-b-0 border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-la-dark-card"
    >
      <div className="flex flex-none items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">
        <h2 id={titleId} className="min-w-0 break-words text-sm font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        <button
          type="button"
          aria-label={`${title} 닫기`}
          onClick={onClose}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        className="min-h-0 overflow-y-auto overscroll-contain p-2 pb-4 text-sm"
      >
        {children}
      </div>
    </div>
  </div>
);
