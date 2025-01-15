import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/global.css';

const Simulation = () => {
    const { state } = useLocation();
    const nickname = state?.nickname;
    const server = state?.server; // 넘어온 server 값
    const [characterNames, setCharacterNames] = useState([]); // 원정대 캐릭터 이름을 배열로 저장
    const [characterInfo, setCharacterInfo] = useState([]); // 각 캐릭터 정보를 저장
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // 닉네임이나 서버가 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!nickname || !server) {
            alert('잘못된 접근입니다.');
            navigate('/');
        }
    }, [nickname, server, navigate]);

    // 원정대 캐릭터 정보 불러오기
    useEffect(() => {
        if (nickname) {
            setLoading(true);
            const API_KEY = process.env.REACT_APP_API_KEY;
            const url = `https://developer-lostark.game.onstove.com/characters/${nickname}/siblings`;

            const options = {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    authorization: `bearer ${API_KEY}`,
                },
            };

            fetch(url, options)
                .then((response) => response.json())
                .then((data) => {
                    // 서버 값과 일치하는 캐릭터들만 필터링
                    if (Array.isArray(data)) {
                        const filteredCharacters = data.filter((character) => character.ServerName === server);
                        setCharacterNames(filteredCharacters);
                    } else {
                        setError('원정대 캐릭터 정보를 불러올 수 없습니다.');
                    }
                    setLoading(false);
                })
                .catch((err) => {
                    console.error(err);
                    setError('캐릭터 정보를 불러오는 데 실패했습니다.');
                    setLoading(false);
                });
        }
    }, [nickname, server]); // server 의존성 추가

    // 각 원정대 캐릭터의 상세 정보 가져오기
    const fetchCharacterInfo = async (characterName) => {
        const API_KEY = process.env.REACT_APP_API_KEY;
        const url = `https://developer-lostark.game.onstove.com/armories/characters/${characterName}/profiles`;

        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                authorization: `bearer ${API_KEY}`,
            },
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            console.log('Fetched character data:', data);

            // data가 null 또는 유효한 데이터를 확인 후 리턴
            if (data && data.CharacterName) {
                return data;  // 유효한 데이터만 반환
            } else {
                console.error(`${characterName}의 정보가 유효하지 않습니다.`);
                return null; // 유효하지 않은 데이터는 null 반환
            }
        } catch (err) {
            console.error(err);
            return null; // 실패 시 null 반환
        }
    };

    // 캐릭터 정보 가져오기
    useEffect(() => {
        const fetchAllCharacterInfo = async () => {
            if (characterNames.length > 0) {
                setLoading(true);
                const characterDataPromises = characterNames.map((character) =>
                    fetchCharacterInfo(character.CharacterName)
                );
                const characterData = await Promise.all(characterDataPromises);
                setCharacterInfo(characterData);
                setLoading(false);
            }
        };
        fetchAllCharacterInfo();
    }, [characterNames]); // characterNames 의존성 추가

    return (
        <div className="character-container">
            <h1>{nickname}님의 원정대 캐릭터 정보</h1>

            {loading ? (
                <p>로딩 중...</p>
            ) : error ? (
                <p>{error}</p>
            ) : characterNames.length > 0 ? (
                <div>
                    <h3>원정대 캐릭터 목록:</h3>
                    <ul>
                        {characterInfo.length > 0 ? (
                            characterInfo.map((character, index) => (
                                <li key={index}>
                                    {character ? (
                                        <>
                                            <h4>{characterNames[index].CharacterName}</h4>
                                            <p>클래스: {character.CharacterClassName}</p>
                                            <p>전투 레벨: {character.CharacterLevel}</p>
                                            <p>아이템 레벨: {character.ItemAvgLevel}</p>
                                            <img
                                                src={character.CharacterImage}
                                                alt={character.CharacterName}
                                                className="char_img"
                                            />
                                        </>
                                    ) : (
                                        <p>정보를 불러오는 데 실패했습니다.</p>
                                    )}
                                </li>
                            ))
                        ) : (
                            <p>원정대 캐릭터가 없습니다.</p>
                        )}
                    </ul>
                </div>
            ) : (
                <p>원정대 캐릭터가 없습니다.</p>
            )}
        </div>
    );
};

export default Simulation;
