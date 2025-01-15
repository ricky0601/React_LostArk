import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../styles/char.css';

const Character = () => {
  const [characterData, setCharacterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { search } = useLocation();
  const nickname = new URLSearchParams(search).get('nickname');
  const server = "";

  useEffect(() => {
    const API_KEY = process.env.REACT_APP_API_KEY;

    const searchCharacter = async (name) => {
      try {
        const URL = 'https://developer-lostark.game.onstove.com';
        const headers = {
          'accept': 'application/json',
          'authorization': `bearer ${API_KEY}`,
        };
  
        const response = await fetch(`${URL}/armories/characters/${name}/profiles`, { headers });
        const data = await response.json();
        return data;
      } catch (err) {
        console.error(err);
        throw err;
      }
    };
  
    const fetchData = async () => {
      if (nickname) {
        setLoading(true);
        setError(null);
        try {
          const characterData = await searchCharacter(nickname);
          console.log(characterData);
          setCharacterData(characterData);
        } catch (err) {
          setError('캐릭터 정보를 가져오는 중 오류가 발생했습니다.');
        }
        setLoading(false);
      }
    };
  
    fetchData();
  }, [nickname , server]); // 의존성 배열을 비워두어도 됨

  return (
    <div className="character-container">
      <header className="navigation">
        <nav>
          <Link to="/" className="nav-link">🏠 홈으로</Link>
          <Link 
            to="/simulation" 
            state={characterData ? { nickname: nickname, server: characterData.ServerName } : null}
            className={`nav-link ${!characterData ? 'disabled' : ''}`}  // 데이터 없으면 비활성화
          >
            💰 골드 시뮬레이션
          </Link>
        </nav>
      </header>

      <h1>캐릭터 정보</h1>
      {loading ? (
        <p>로딩 중...</p>
      ) : error ? (
        <p>{error}</p>
      ) : characterData ? (
        <div className="character-info">
          <img src={characterData.CharacterImage} alt={characterData.CharacterName} className='char_img'/>
          <p>캐릭터 이름: {characterData.CharacterName}</p>
          <p>클래스: {characterData.CharacterClassName}</p>
          <p>전투 레벨: {characterData.CharacterLevel}</p>
          <p>아이템 레벨: {characterData.ItemAvgLevel}</p>
        </div>
      ) : (
        <p>캐릭터 정보를 불러오는 데 실패했습니다.</p>
      )}
    </div>
  );
};

export default Character;
