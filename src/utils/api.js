const API_KEY = process.env.REACT_APP_API_KEY;

export const fetchData = async () => {
  try {
    const response = await fetch(`https://api.example.com/data?key=${API_KEY}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
};