/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:    { DEFAULT: '#050d1a', 800: '#091628', 700: '#0d2040', 600: '#112a54' },
        pitch:   { DEFAULT: '#00e676', 400: '#69ff9c', 600: '#00c853' },
        gold:    { DEFAULT: '#ffc400', 400: '#ffd740', 600: '#ff9d00' },
        scarlet: { DEFAULT: '#ff1744', 400: '#ff616f' },
        ice:     { DEFAULT: '#e8f4fd', 600: '#b0d4f1' },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'ping-slow':  'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'score-pop':  'scorePop 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' },                  to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scorePop: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.4)' } },
      },
    },
  },
  plugins: [],
}
