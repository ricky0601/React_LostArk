import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Character from './pages/Character';
import Simulation from './pages/Simulation';
import SpecSimulator from './pages/SpecSimulator';
import Expedition from './pages/Expedition';
import Compare from './pages/Compare';
import Enhancement from './pages/Enhancement';
import Spending from './pages/Spending';
import ThemeToggle from './components/ThemeToggle';
import { PwaChunkProvider, usePwaChunk } from './context/PwaChunkContext';
import { safeLocalStorage } from './utils/safeStorage';

const ChunkErrorBanner: React.FC = () => {
  const { chunkErrorOccurred, clearChunkError } = usePwaChunk();
  if (!chunkErrorOccurred) return null;

  const handleReload = () => {
    clearChunkError();
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-500/95 px-4 py-2 text-white shadow-md dark:bg-amber-600/95">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 text-center text-sm font-medium sm:flex-row">
        <span>새 버전이 배포되었습니다. 안정적인 사용을 위해 새로고침해 주세요.</span>
        <button
          type="button"
          onClick={handleReload}
          className="min-h-9 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          새로고침
        </button>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = safeLocalStorage.getItem('isDarkMode');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    safeLocalStorage.setItem('isDarkMode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = (): void => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <Router>
      <div className="min-h-screen font-[Pretendard,sans-serif] bg-gray-50 dark:bg-la-dark transition-colors duration-300">
        <ChunkErrorBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/character" element={<Character />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/spec-simulator" element={<SpecSimulator />} />
          <Route path="/expedition" element={<Expedition />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/enhancement" element={<Enhancement />} />
          <Route path="/spending" element={<Spending />} />
        </Routes>
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
      </div>
    </Router>
  );
};

const App: React.FC = () => (
  <PwaChunkProvider>
    <AppContent />
  </PwaChunkProvider>
);

export default App;
