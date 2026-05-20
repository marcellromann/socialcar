/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4FFD6',
          100: '#E8FFB3',
          400: '#C2FF4D',
          500: '#00CC00',
          600: '#88CC00',
          700: '#669900',
          900: '#335500',
        },
        page: '#060801',
        card: '#0E1108',
        elevated: '#161A0E',
        outline: '#1F2415',
      },
      fontFamily: {
        sans: ['var(--font-barlow)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-barlow-condensed)', 'var(--font-barlow)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        mobile: '480px',
      },
      height: {
        'screen-mobile': '100dvh',
      },
    },
  },
  plugins: [],
};
