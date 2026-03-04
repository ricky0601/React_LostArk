import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Character from './pages/Character';
import Simulation from './pages/Simulation';
import Compare from './pages/Compare';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
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

export default App;
