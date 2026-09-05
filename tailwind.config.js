export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        canvas: '#f7f3ec',
        surface: '#fffdf9',
        ink: {
          DEFAULT: '#1b1712',
          soft: '#4a4038',
          muted: '#7d7167',
        },
        line: '#e6ddcf',
        clay: {
          50: '#fdf3ec',
          100: '#f8e2d2',
          200: '#efc3a5',
          300: '#e29c72',
          400: '#d1743f',
          500: '#b4531f',
          600: '#8f3f16',
          700: '#6d3113',
        },
        indigo: {
          500: '#3b4a7a',
          600: '#2c3860',
          700: '#1f2846',
        },
        leaf: '#3f7d55',
        amberw: '#c98a1b',
        alert: '#b2382b',
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,23,18,0.04), 0 12px 28px -20px rgba(27,23,18,0.35)',
        lift: '0 18px 40px -24px rgba(27,23,18,0.45)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
};
