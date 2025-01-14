import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Character from './pages/Character';
import Simulation from './pages/Simulation';
import './styles/global.css';
import './styles/reset.css';

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // localStorage에서 다크 모드 상태를 읽어옴 (기본값은 false)
    return localStorage.getItem('isDarkMode') === 'true';
  });

  useEffect(() => {
    // 다크 모드 상태가 변경되면 body 클래스에 'dark' 추가/제거
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    // 다크 모드 상태를 localStorage에 저장
    localStorage.setItem('isDarkMode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  return (
    <Router>
      <div className="app-container">
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/character" element={<Character />} />
            <Route path="/simulation" element={<Simulation />} />
          </Routes>
        </main>
        <button onClick={toggleDarkMode} className="dark-mode-toggle">
          {isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
        </button>
      </div>
    </Router>
  );
};

export default App;
