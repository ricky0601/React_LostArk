import React from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-la-dark transition-colors duration-300">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <GlassCard className="p-10 text-center animate-fade-in">
          <p className="text-la-gold-dark dark:text-la-gold font-bold text-sm mb-2">404</p>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            주소가 잘못되었거나 삭제된 페이지입니다.
          </p>
          <Link to="/" className="btn-gold inline-block">
            홈으로 돌아가기
          </Link>
        </GlassCard>
      </main>
    </div>
  );
};

export default NotFound;
