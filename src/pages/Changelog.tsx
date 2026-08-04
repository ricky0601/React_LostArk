import React from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import {
  CHANGELOG,
  CHANGELOG_TAG_LABEL,
  formatChangelogDate,
  type ChangelogTag,
} from '../data/changelog';

const TAG_CLASS: Readonly<Record<ChangelogTag, string>> = {
  added: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  improved: 'border-la-gold/25 bg-la-gold/10 text-la-gold-deep dark:text-la-gold',
  fixed: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400',
};

const Changelog: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">업데이트 내역</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            로아끼욧에 추가되거나 개선된 내용을 정리했습니다.
          </p>
        </header>

        {CHANGELOG.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">아직 등록된 업데이트 내역이 없습니다.</p>
          </GlassCard>
        ) : (
          <ol className="flex flex-col gap-4">
            {CHANGELOG.map((entry) => (
              <li key={entry.id}>
                <GlassCard className="p-5 animate-fade-in">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <time
                      dateTime={entry.date}
                      className="text-xs font-bold text-la-gold-deep dark:text-la-gold"
                    >
                      {formatChangelogDate(entry.date)}
                    </time>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">{entry.title}</h2>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2">
                    {entry.items.map((item) => (
                      <li key={item.text} className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${TAG_CLASS[item.tag]}`}
                        >
                          {CHANGELOG_TAG_LABEL[item.tag]}
                        </span>
                        <span className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-gray-500 transition-colors hover:text-la-gold-deep dark:text-gray-400 dark:hover:text-la-gold"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Changelog;
