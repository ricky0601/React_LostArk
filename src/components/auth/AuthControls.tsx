import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type AuthControlsProps = {
  readonly variant?: 'desktop' | 'mobile';
  readonly showError?: boolean;
};

const getUserLabel = (metadata: Record<string, unknown> | undefined): string => {
  const candidates = [metadata?.global_name, metadata?.full_name, metadata?.name];
  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?? '로그인 사용자';
};

const getAvatarUrl = (metadata: Record<string, unknown> | undefined): string | null => {
  const avatarUrl = metadata?.avatar_url;
  return typeof avatarUrl === 'string' && avatarUrl.length > 0 ? avatarUrl : null;
};

export const AuthControls: React.FC<AuthControlsProps> = ({ variant = 'desktop', showError = true }) => {
  const { status, user, isBusy, errorMessage, errorScope, signInWithDiscord, signOut, clearError } = useAuth();
  if (status === 'unavailable') return null;

  const isMobile = variant === 'mobile';
  const buttonClass = isMobile
    ? 'inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40'
    : 'inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40';

  if (status === 'loading') {
    return (
      <span role="status" className="px-2 text-xs text-gray-500 dark:text-gray-400">
        로그인 확인 중
      </span>
    );
  }

  if (status === 'anonymous') {
    return (
      <div className={isMobile ? 'space-y-2 rounded-xl border border-gray-200/60 p-3 dark:border-white/10' : 'flex items-center gap-2'}>
        {showError && errorScope !== 'callback' && errorMessage && (
          <div role="alert" className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <span>{errorMessage}</span>
            <button type="button" onClick={clearError} className="underline">닫기</button>
          </div>
        )}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void signInWithDiscord()}
          className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60`}
        >
          {isBusy ? '연결 중...' : 'Discord 로그인'}
        </button>
      </div>
    );
  }

  const label = getUserLabel(user?.user_metadata);
  const avatarUrl = getAvatarUrl(user?.user_metadata);

  return (
    <div className={isMobile ? 'space-y-2 rounded-xl border border-gray-200/60 p-3 dark:border-white/10' : 'flex items-center gap-2'}>
      <div className="flex min-w-0 items-center gap-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            {label.slice(0, 1)}
          </span>
        )}
        <span className="max-w-28 truncate text-sm font-medium text-gray-700 dark:text-gray-200" title={label}>
          {label}
        </span>
      </div>
      {showError && errorScope !== 'callback' && errorMessage && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>}
      <Link
        to="/account"
        aria-label="계정 설정"
        title="계정 설정"
        className={`${isMobile ? 'inline-flex min-h-10 w-full items-center justify-center' : 'inline-flex h-9 w-9 items-center justify-center'} rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-la-gold/40 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white`}
      >
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => void signOut()}
        className={`${buttonClass} ${isMobile ? 'w-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'} disabled:cursor-wait disabled:opacity-60`}
      >
        {isBusy ? '로그아웃 중...' : '로그아웃'}
      </button>
    </div>
  );
};
