/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#fff8f1',
          100: '#ffe8d4',
          200: '#ffd3ad',
          300: '#ffb575',
          400: '#ff9545',
          500: '#f56e2f',
          600: '#d94f26',
          700: '#b93a1f',
          800: '#962f1f',
          900: '#7a2a1d',
        },
        gold: {
          100: '#fff6d7',
          300: '#ffd86a',
          500: '#f7b733',
          700: '#ca830d',
        },
        cream: '#fff8ef',
      },
      boxShadow: {
        soft: '0 10px 30px -15px rgba(120, 40, 25, 0.25)',
      },
    },
  },
  plugins: [],
}
