/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tabletop aesthetic color palette
        parchment: {
          50: '#fdfbf7',
          100: '#f8f3e8',
          200: '#f0e6d0',
          300: '#e8d9b8',
          400: '#d9c49f',
          500: '#c9af87',
        },
        wood: {
          400: '#8b6f47',
          500: '#6d5638',
          600: '#5a4529',
        },
        // Genre colors
        pop: '#ff69b4',      // Hot pink
        rock: '#dc143c',     // Crimson red
        electronic: '#00ffff', // Cyan
        classical: '#9370db', // Purple
        hiphop: '#ffa500',   // Orange
      },
      fontFamily: {
        'medieval': ['Cinzel', 'serif'],
        'game': ['Barlow', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
