/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@shadcn/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mundial: {
          navy:    '#0A192F', // Deep Navy Background
          gold:    '#FFD700', // Trophy Gold
          red:     '#E31B23', // Passion Red
          navyLight: '#112240',
          goldDark:  '#B8860B',
        },
        field: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FFD700', // Overriding with Mundial Gold
          600: '#d97706',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(251,191,36,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(251,191,36,0)' },
        },
      },
    },
  },
  plugins: [],
}
