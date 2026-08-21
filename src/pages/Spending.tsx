import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import { STOVE_SCRIPT } from '../data/stoveScript';

const STEPS = [
  {
    num: '①',
    title: '로스트아크 홈페이지 로그인',
    desc: '아래 버튼으로 로스트아크 홈페이지에 접속한 뒤 로그인하세요.',
    action: (
      <a
        href="https://lostark.game.onstove.com/Main"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-la-gold/20 hover:bg-la-gold/30 text-la-gold-dark dark:text-la-gold rounded-lg text-sm font-medium transition-colors"
      >
        로스트아크 홈페이지 →
      </a>
    ),
  },
  {
    num: '②',
    title: '개발자 도구 열기',
    desc: (
      <>
        키보드 <kbd className="inline-block max-w-full break-all whitespace-normal rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">F12</kbd> 를 눌러 개발자 도구를 여세요.
        상단 탭에서 <strong>Console</strong>을 선택하세요.
      </>
    ),
  },
  {
    num: '③',
    title: '스크립트 복사',
    desc: '아래 버튼을 눌러 스크립트를 클립보드에 복사하세요.',
  },
  {
    num: '④',
    title: '붙여넣기 후 실행',
    desc: (
      <>
        Console 입력창에 붙여넣기{' '}
        <kbd className="inline-block max-w-full break-all whitespace-normal rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">Ctrl+V</kbd>{' '}
        후 <kbd className="inline-block max-w-full break-all whitespace-normal rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">Enter</kbd>를 누르세요.
        <br />
        <span className="text-amber-600 dark:text-amber-400">붙여넣기가 안 되면 입력창에 <kbd className="inline-block max-w-full break-all whitespace-normal rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">allow pasting</kbd> 을 먼저 입력하세요.</span>
      </>
    ),
  },
  {
    num: '⑤',
    title: '결과 확인',
    desc: '수집이 완료되면 연도별·카테고리별 결제 내역 모달이 화면에 표시됩니다.',
  },
];

const Spending: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(STOVE_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-la-dark">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            내 로아 결제 내역 조회
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stove 스토어 콘솔에서 스크립트를 직접 실행하는 방식입니다
          </p>
        </div>

        {/* 안내 배너 */}
        <section
          role="note"
          aria-labelledby="spending-pc-guidance-title"
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
        >
          <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-1.5a9 9 0 11-18 0 9 9 0 0118 0zM12 16.5h.008v.008H12V16.5z" />
          </svg>
          <div className="min-w-0">
            <h2 id="spending-pc-guidance-title" className="break-keep font-bold">PC 브라우저에서 진행해 주세요</h2>
            <ul className="mt-2 list-none space-y-1 break-keep leading-relaxed">
            <li>모바일에서는 개발자 도구를 사용할 수 없어 스크립트를 실행할 수 없습니다.</li>
            <li>본인 계정 정보만 조회되며 외부 서버로 전송되지 않습니다.</li>
            <li>로스트아크 홈페이지에 로그인된 상태에서 실행해야 합니다.</li>
            <li>결제 수단 합계는 <strong>스토브 통합</strong> 기준으로 표시됩니다.</li>
            </ul>
          </div>
        </section>

        {/* 단계별 안내 */}
        <GlassCard className="p-4 space-y-5">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400">사용 방법</h2>
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4">
              <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-la-gold/20 text-la-gold-dark dark:text-la-gold text-sm font-bold">
                {step.num}
              </span>
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                <p className="break-words text-sm leading-relaxed text-gray-500 dark:text-gray-400">{step.desc}</p>
                {step.action}
                {i === 2 && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      copied
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-la-gold/20 hover:bg-la-gold/30 text-la-gold-dark dark:text-la-gold'
                    }`}
                  >
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={copied ? 'M4.5 12.75l6 6 9-13.5' : 'M8.25 7.5V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0120.25 6v7.5A2.25 2.25 0 0118 15.75h-1.5m-8.25-8.25h-2.25A2.25 2.25 0 003.75 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25V15'} />
                    </svg>
                    {copied ? '복사됨' : '스크립트 복사'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </GlassCard>

        {/* 스크립트 미리보기 */}
        <GlassCard className="p-4">
          <button
            type="button"
            onClick={() => setShowScript((v) => !v)}
            aria-expanded={showScript}
            aria-controls="spending-script-preview"
            className="flex items-center justify-between w-full"
          >
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              스크립트 미리보기
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {showScript ? '▲' : '▼'}
            </span>
          </button>
          {showScript && (
            <div id="spending-script-preview" className="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg">
              <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all bg-gray-900 p-4 text-xs leading-relaxed text-gray-300">
                {STOVE_SCRIPT}
              </pre>
            </div>
          )}
        </GlassCard>

      </main>
    </div>
  );
};

export default Spending;
