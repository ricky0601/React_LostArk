import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSupabaseBrowserClient } from '../lib/supabase';
import { fetchLokkiDataScope, syncLokkiProfile, type LokkiDataScopeSummary } from '../lib/lokkiAccount';

const DELETE_CONFIRM_TEXT = '삭제';

const formatIsoTimestamp = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { status, user, session } = useAuth();
  const [scope, setScope] = useState<LokkiDataScopeSummary | null>(null);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const isAuthenticated = status === 'authenticated' && user != null && client != null;

  const loadScope = useCallback(async () => {
    if (!client || !user) return;
    setIsScopeLoading(true);
    try {
      setScope(await fetchLokkiDataScope(client, user.id));
    } finally {
      setIsScopeLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    void loadScope();
    setProfileMessage(null);
    // 최초 로그인 이후 Discord 프로필 변경을 반영한다. 실패해도 화면 기능은 계속된다.
    if (client && user) void syncLokkiProfile(client, user);
  }, [client, user, loadScope]);

  useEffect(() => {
    if (status === 'anonymous') navigate('/', { replace: true });
  }, [navigate, status]);

  const handleProfileRefresh = async () => {
    if (!client || !user) return;
    setProfileMessage(null);
    const synced = await syncLokkiProfile(client, user);
    await loadScope();
    setProfileMessage(synced ? 'Discord 프로필 정보를 갱신했습니다.' : '프로필을 갱신하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  };

  const handleDelete = async () => {
    if (!session?.access_token) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch('/api/account-delete', {
        method: 'POST',
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        // 계정이 삭제되어 세션이 무효화됐다. 상태를 확실히 초기화하기 위해 앱을 다시 적재한다.
        window.location.replace('/');
        return;
      }
      setDeleteError(
        response.status === 401
          ? '로그인 세션이 만료되었습니다. 다시 로그인한 뒤 삭제를 진행해 주세요.'
          : '계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } catch {
      setDeleteError('계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'unavailable') {
    return (
      <div>
        <main className="mx-auto max-w-xl px-4 py-12">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">계정 설정</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            현재 환경에는 로그인 기능이 설정되어 있지 않습니다.
          </p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <main className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-4 py-12">
          <p role="status" className="text-sm text-gray-500 dark:text-gray-400">로그인 정보를 확인하는 중...</p>
        </main>
      </div>
    );
  }

  const displayName = scope?.profile?.display_name ?? '로그인 사용자';
  const avatarUrl = scope?.profile?.avatar_url;
  const discordLinked = scope?.profile?.discord_id != null;

  return (
    <div>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">계정 설정</h1>
        <section aria-labelledby="account-profile-heading" className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 id="account-profile-heading" className="text-base font-bold text-gray-900 dark:text-white">프로필</h2>
          <div className="mt-4 flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {displayName.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={displayName}>{displayName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Discord 연동 {discordLinked ? '완료' : '대기 중'} · 가입 {formatIsoTimestamp(scope?.profile?.created_at)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleProfileRefresh()}
              className="min-h-10 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
            >
              Discord 프로필 정보 갱신
            </button>
            {profileMessage && <p role="status" className="text-xs text-gray-600 dark:text-gray-300">{profileMessage}</p>}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            표시 이름과 프로필 이미지는 Discord 계정 정보를 따르며, 로그인할 때 자동으로 갱신됩니다.
          </p>
        </section>

        <section aria-labelledby="account-data-heading" className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 id="account-data-heading" className="text-base font-bold text-gray-900 dark:text-white">저장 중인 데이터</h2>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {isScopeLoading ? '불러오는 중...' : scope ? `마지막 갱신: ${formatIsoTimestamp(scope.lastUpdatedAt) || '정보 없음'}` : '정보를 불러오지 못했습니다.'}
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-300">프로필 (표시 이름, 프로필 이미지)</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{scope ? 1 : 0}건</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-300">원정대 대표 캐릭터</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{scope?.rosterCount ?? 0}건</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-300">캐릭터 목록</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{scope?.characterCount ?? 0}건</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-300">주간 활동 기록</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{scope?.weeklyStateCount ?? 0}건</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            로스트아크 계정 정보·STOVE 토큰·결제 원본 로그는 저장하지 않습니다. 캐릭터 데이터는 공개 API 조회 결과만 저장합니다.
          </p>
        </section>

        <section aria-labelledby="account-delete-heading" className="rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-500/30 dark:bg-red-500/10">
          <h2 id="account-delete-heading" className="text-base font-bold text-red-700 dark:text-red-300">계정 삭제</h2>
          <p className="mt-2 text-sm text-red-700/90 dark:text-red-300/90">
            로그인 정보와 저장된 모든 데이터가 영구 삭제되며 되돌릴 수 없습니다.
          </p>
          {!isDeleteConfirmOpen ? (
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="mt-4 min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
            >
              계정 삭제
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <label htmlFor="delete-confirm-input" className="block text-sm text-red-700 dark:text-red-300">
                계속하려면 <strong>삭제</strong>를 입력해 주세요.
              </label>
              <input
                id="delete-confirm-input"
                value={deleteConfirmInput}
                onChange={(event) => setDeleteConfirmInput(event.target.value)}
                autoComplete="off"
                className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-red-500/40 dark:bg-white/10 dark:text-white"
              />
              {deleteError && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeleting || deleteConfirmInput !== DELETE_CONFIRM_TEXT}
                  onClick={() => void handleDelete()}
                  className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isDeleting ? '삭제 중...' : '계정 영구 삭제'}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setDeleteConfirmInput('');
                    setDeleteError(null);
                  }}
                  className="min-h-10 rounded-lg bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15 disabled:opacity-60"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          궁금한 점은 <Link to="/policy" className="underline">개인정보처리방침</Link>을 참고해 주세요.
        </p>
      </main>
    </div>
  );
};

export default AccountSettings;
