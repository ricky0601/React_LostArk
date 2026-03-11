import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Character from './pages/Character';
import Simulation from './pages/Simulation';
import Compare from './pages/Compare';
import ThemeToggle from './components/ThemeToggle';
import { PwaChunkProvider, usePwaChunk } from './context/PwaChunkContext';

const ChunkErrorBanner: React.FC = () => {
  const { chunkErrorOccurred } = usePwaChunk();
  if (!chunkErrorOccurred) return null;
  return (
    <div className="sticky top-0 z-50 px-4 py-2 text-center text-sm bg-amber-500/90 dark:bg-amber-600/90 text-white font-medium">
      새 버전이 배포되었습니다. 아래로 당겨 새로고침해 주세요.
    </div>
  );
};

const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('isDarkMode');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    localStorage.setItem('isDarkMode', String(isDarkMode));
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
          <Route path="/compare" element={<Compare />} />
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
