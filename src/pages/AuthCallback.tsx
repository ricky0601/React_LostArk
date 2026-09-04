import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { status, errorMessage, isBusy, signInWithDiscord } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [navigate, status]);

  const isLoading = status === 'loading' || status === 'authenticated';

  return (
    <div>
      <NavBar />
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12">
        <section className="w-full rounded-2xl border border-gray-200/70 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Discord 로그인</h1>
          {isLoading ? (
            <p role="status" className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              로그인 정보를 확인하고 있습니다...
            </p>
          ) : (
            <>
              <p role={errorMessage ? 'alert' : undefined} className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {errorMessage ?? (status === 'unavailable'
                  ? '현재 환경에는 로그인 기능이 설정되어 있지 않습니다.'
                  : '로그인이 완료되지 않았습니다. 다시 시도해 주세요.')}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {status !== 'unavailable' && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void signInWithDiscord()}
                    className="min-h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    Discord 로그인 다시 시도
                  </button>
                )}
                <Link to="/" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15">
                  홈으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AuthCallback;
