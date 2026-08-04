/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'la-gold': '#F5A623',
        'la-gold-light': '#FFD080',
        'la-gold-dark': '#C47F17',
        // 라이트 모드 소형 텍스트용. la-gold-dark(#C47F17)는 흰 배경에서 약 3.3:1이라
        // 14px 미만 텍스트의 WCAG AA(4.5:1)를 넘지 못한다. 이 값은 약 5.9:1.
        'la-gold-deep': '#8A5A0F',
        'la-dark': '#0D1117',
        'la-dark-card': '#161B22',
        'la-dark-surface': '#1C2128',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'gold-glow': '0 0 20px rgba(245, 166, 35, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
