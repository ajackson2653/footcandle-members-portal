/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2a5680', dark: '#1e3f5f', tint: '#eef3f8' },
      },
    },
  },
  plugins: [],
}
