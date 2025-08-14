import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class', // Enable dark mode via a CSS class (you can also use 'media')
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6D28D9',   // Example purple
        secondary: '#F59E0B', // Example amber
        accent: '#10B981',    // Example green
        darkBg: '#1F2937',    // Example dark background
        lightBg: '#F3F4F6',   // Example light background
      },
    },
  },
  plugins: [],
} satisfies Config

