import React, { useState } from 'react';

interface NicknameSearchBarProps {
  onSearch: (nickname: string) => void;
  placeholder?: string;
}

const NicknameSearchBar: React.FC<NicknameSearchBarProps> = ({
  onSearch,
  placeholder = '다른 캐릭터 검색',
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      onSearch(trimmed);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-xs mx-auto">
      <div className="relative flex-1">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg
                     bg-white/60 dark:bg-white/5
                     border border-gray-200/50 dark:border-white/10
                     text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                     focus:outline-none focus:ring-1 focus:ring-la-gold/40 focus:border-la-gold/40
                     transition-colors duration-200"
        />
      </div>
      <button
        type="submit"
        className="px-3 py-1.5 text-sm font-medium rounded-lg
                   bg-la-gold/15 text-la-gold-dark dark:text-la-gold
                   hover:bg-la-gold/25 active:bg-la-gold/30
                   transition-colors duration-200 flex-shrink-0"
      >
        검색
      </button>
    </form>
  );
};

export default NicknameSearchBar;
