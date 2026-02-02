/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep tavern base
        tavern: {
          950: '#0d0a07',
          900: '#1a1410',
          800: '#2a2118',
          700: '#3d3020',
          600: '#4e3d2a',
        },
        // Warm parchment
        parchment: {
          50: '#fdfbf7',
          100: '#f8f3e8',
          200: '#f0e6d0',
          300: '#e8d9b8',
          400: '#d9c49f',
          500: '#c9af87',
          600: '#b89b6d',
        },
        // Rich wood tones
        wood: {
          300: '#a8885a',
          400: '#8b6f47',
          500: '#6d5638',
          600: '#5a4529',
          700: '#473720',
        },
        // Gold accent
        gold: {
          300: '#f0d78c',
          400: '#e6c35a',
          500: '#d4a853',
          600: '#b8922e',
          700: '#9a7a20',
        },
        // Genre colors (richer, more saturated)
        pop: '#ff5caa',
        rock: '#e82040',
        electronic: '#00e5ff',
        classical: '#b07cff',
        hiphop: '#ff9d1b',
      },
      fontFamily: {
        'medieval': ['Cinzel', 'serif'],
        'display': ['MedievalSharp', 'cursive'],
        'game': ['Spectral', 'serif'],
      },
      boxShadow: {
        'glow-gold': '0 0 15px rgba(212, 168, 83, 0.3), 0 0 30px rgba(212, 168, 83, 0.1)',
        'glow-pop': '0 0 12px rgba(255, 92, 170, 0.4)',
        'glow-rock': '0 0 12px rgba(232, 32, 64, 0.4)',
        'glow-electronic': '0 0 12px rgba(0, 229, 255, 0.4)',
        'glow-classical': '0 0 12px rgba(176, 124, 255, 0.4)',
        'glow-hiphop': '0 0 12px rgba(255, 157, 27, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(212, 168, 83, 0.15)',
        'card-depth': '0 4px 6px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 25px rgba(0,0,0,0.5), 0 0 15px rgba(212, 168, 83, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
