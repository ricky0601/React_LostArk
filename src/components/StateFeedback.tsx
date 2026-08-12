import React, { useId } from 'react';
import GlassCard from './GlassCard';
import { SkeletonBlock } from './Loading';

export type StateFeedbackTone = 'loading' | 'empty' | 'error';

interface StateFeedbackAction {
  readonly label: string;
  readonly onClick: () => void;
}

interface StateFeedbackProps {
  readonly tone: StateFeedbackTone;
  readonly title: string;
  readonly description?: string;
  readonly action?: StateFeedbackAction;
  readonly compact?: boolean;
  readonly className?: string;
}

const toneStyles: Record<StateFeedbackTone, string> = {
  loading: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  empty: 'bg-gray-500/10 text-gray-500 dark:text-gray-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const toneRoles: Record<StateFeedbackTone, 'alert' | 'status'> = {
  loading: 'status',
  empty: 'status',
  error: 'alert',
};

const toneIconPaths: Record<StateFeedbackTone, string> = {
  loading: 'M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z',
  empty: 'M3.75 9.75h16.5m-16.5 0A2.25 2.25 0 016 7.5h12a2.25 2.25 0 012.25 2.25m-16.5 0v7.5A2.25 2.25 0 006 19.5h12a2.25 2.25 0 002.25-2.25v-7.5M9 13.5h6',
  error: 'M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.052 3.38c.866-1.5 3.03-1.5 3.896 0l7.355 12.746zM12 15.75h.008v.008H12v-.008z',
};

const joinClassNames = (...classes: Array<string | false | undefined>): string =>
  classes.filter(Boolean).join(' ');

export const StateFeedback: React.FC<StateFeedbackProps> = ({
  tone,
  title,
  description,
  action,
  compact = false,
  className,
}) => {
  const titleId = useId();

  return (
    <GlassCard className={joinClassNames('overflow-hidden', className)}>
      <section
        role={toneRoles[tone]}
        aria-labelledby={titleId}
        data-tone={tone}
        className={joinClassNames(
          'flex flex-col items-center text-center',
          compact ? 'gap-2 p-4' : 'gap-3 p-6',
        )}
      >
        <span
          aria-hidden="true"
          className={joinClassNames(
            'flex h-10 w-10 items-center justify-center rounded-full',
            toneStyles[tone],
          )}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={toneIconPaths[tone]} />
          </svg>
        </span>

        <div className="min-w-0 max-w-xl">
          <h2 id={titleId} className="break-words text-sm font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-1 break-words text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>

        {tone === 'loading' && (
          <div aria-hidden="true" className="w-20">
            <SkeletonBlock className="h-1.5 w-full" />
          </div>
        )}

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="min-h-10 rounded-lg bg-la-gold/15 px-4 py-2 text-xs font-bold text-la-gold-deep transition-colors hover:bg-la-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-la-gold"
          >
            {action.label}
          </button>
        )}
      </section>
    </GlassCard>
  );
};

export default StateFeedback;
