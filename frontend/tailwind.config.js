/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00E87A',
          50:  '#e6fff2',
          100: '#b3ffe0',
          200: '#66ffba',
          300: '#00ff8a',
          400: '#00f07d',
          500: '#00E87A',
          600: '#00c065',
          700: '#009950',
          800: '#00733c',
          900: '#004d28',
        },
        spotr: {
          black: '#0D0D0F',
          white: '#F4F4F0',
        },
      },
      fontFamily: {
        display: ['var(--font-barlow-condensed)', 'sans-serif'],
        sans:    ['var(--font-barlow)', 'sans-serif'],
        mono:    ['var(--font-space-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
