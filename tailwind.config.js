/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'mono-dark': '#1a1a1a',
          'mono-medium': '#4a4a4a',
          'mono-light': '#e0e0e0',
          'mono-accent': '#b0b0b0',
          'mono-hover': '#6a6a6a',
          'dark-bg': '#1a1a1a',
          'mid-gray': '#4a4a4a',
          'light-text': '#e0e0e0',
          'accent-text': '#b0b0b0',
          'hover-gray': '#6a6a6a',
        },
      },
    },
    plugins: [],
  };