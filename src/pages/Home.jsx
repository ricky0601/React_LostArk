import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

const Home = () => {
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      // 캐릭터 이름을 query parameter로 넘기며 이동
      navigate(`/character?nickname=${nickname}`);
    }
  };

  return (
    <div className="home-container">
      <h1>LostArk 골드 시뮬레이터</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button type="submit">캐릭터 조회</button>
      </form>
    </div>
  );
};

export default Home;
