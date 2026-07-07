/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { inter: ['Inter', 'sans-serif'] },
      colors: {
        royal: { DEFAULT: '#2B4ACB', dark: '#1f37a0', light: '#EEF1FB' },
      },
    },
  },
  plugins: [],
}
