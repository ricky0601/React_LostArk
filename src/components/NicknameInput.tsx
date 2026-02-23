import React, { useState } from 'react';
import { LS_NICKNAME } from '../utils/api';

interface NicknameInputProps {
  title: string;
  description: string;
  buttonText: string;
  onSubmit: (nickname: string) => void;
}

const NicknameInput: React.FC<NicknameInputProps> = ({ title, description, buttonText, onSubmit }) => {
  const [input, setInput] = useState<string>(() => {
    return localStorage.getItem(LS_NICKNAME) || '';
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      localStorage.setItem(LS_NICKNAME, trimmed);
      onSubmit(trimmed);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
      <div className="glass-card p-8 md:p-12 max-w-md w-full text-center animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-la-gold to-la-gold-light bg-clip-text text-transparent mb-2">
            {title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="캐릭터 닉네임"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input-glass text-center text-lg"
            autoFocus
          />
          <button type="submit" className="btn-gold w-full text-lg">
            {buttonText}
          </button>
        </form>
      </div>
    </main>
  );
};

export default NicknameInput;
