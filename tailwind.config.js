/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#C0392B',
          dark:    '#96281B',
          light:   '#fdf2f1',
        },
                brand: {
          50:  '#fdf2f1',
          500: '#C0392B',
          600: '#a52f23',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
