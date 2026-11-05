/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontWeight: {
      300: '300', 400: '400', 500: '500', 600: '600',
      700: '700', 800: '800', 900: '900',
      thin: '100', light: '300', normal: '400',
      medium: '500', semibold: '600', bold: '700',
      extrabold: '800', black: '900',
    },
    extend: {
      colors: {
        surface: '#f5f5f0',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
