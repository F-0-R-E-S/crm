/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        glass: {
          ultra:  'rgba(255,255,255,0.03)',
          light:  'rgba(255,255,255,0.06)',
          med:    'rgba(255,255,255,0.09)',
          bright: 'rgba(255,255,255,0.14)',
        },
      },
      backdropBlur: {
        xs: '4px',
        '2xl': '40px',
        '3xl': '60px',
      },
    },
  },
  plugins: [],
}
